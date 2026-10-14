/**
 * Headless runner — the enforcement mechanism for the pure-simulation rule.
 *
 * `ARCHITECTURE.md` §1 and `GAME_DESIGN_BLUEPRINT.md` G2. This file must keep
 * working forever: if it ever has to be stubbed or bypassed to make a feature
 * work, the architecture has broken and that must be fixed before building on it.
 *
 * It is deliberately thin. It creates a run, ticks it, and reports what happened.
 * It imports nothing from `src/ui` or `src/controller`, contains no browser API,
 * and cannot fabricate a summary without actually running the simulation.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createRun } from '../src/sim/state';
import { enqueue } from '../src/sim/commands';
import { run, standbyReason } from '../src/sim/tick';
import { countByTier } from '../src/sim/events';
import { DEFAULT_SEED } from '../src/sim/rng';
import { DEFAULT_PRIORITY, PRIORITIES, isPriority, readPriority } from '../src/sim/priority';
import type { Priority } from '../src/sim/priority';
import { dayOf, periodOf, TICKS_PER_DAY } from '../src/sim/time';

const USAGE = `Usage: npm run headless -- [options]

  --ticks N       number of ticks to run (default ${TICKS_PER_DAY})
  --seed S        32-bit unsigned seed (default ${DEFAULT_SEED})
  --priority P    balanced | maintenance-first | meals-first (default balanced)
  --json          print the summary as JSON instead of text
  --help          show this message

No browser is involved. The simulation runs in plain Node.

The priority flag exists so the Stage 2 fixture gate can be reproduced from the
command line: the same seed and tick count under different priorities should show
different backlogs, and that difference is the whole point of Stage 2.`;

export interface HeadlessOptions {
  ticks: number;
  seed: number;
  priority: Priority;
  json: boolean;
}

export interface HeadlessSummary {
  seed: number;
  ticksRun: number;
  finalTick: number;
  day: number;
  period: string;
  rngCursor: number;
  logLength: number;
  eventsByTier: Record<string, number>;
  digest: string;
}

/** Parse argv. Throws a plain Error carrying a message for the user. */
export function parseArgs(argv: readonly string[]): HeadlessOptions {
  const options: HeadlessOptions = {
    ticks: TICKS_PER_DAY,
    seed: DEFAULT_SEED,
    priority: DEFAULT_PRIORITY,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--priority': {
        const raw = argv[i + 1];
        if (raw === undefined) throw new Error(`${arg} needs a value`);
        if (!isPriority(raw)) {
          throw new Error(`--priority must be one of ${PRIORITIES.join(', ')}, got "${raw}"`);
        }
        options.priority = raw;
        i += 1;
        break;
      }
      case '--ticks':
      case '--seed': {
        const raw = argv[i + 1];
        if (raw === undefined) throw new Error(`${arg} needs a value`);
        const value = Number(raw);
        if (!Number.isFinite(value)) throw new Error(`${arg} must be a number, got "${raw}"`);
        if (arg === '--ticks') {
          if (!Number.isInteger(value) || value < 0) {
            throw new Error(`--ticks must be a non-negative whole number, got "${raw}"`);
          }
          options.ticks = value;
        } else {
          if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
            throw new Error(`--seed must be a 32-bit unsigned integer, got "${raw}"`);
          }
          options.seed = value;
        }
        i += 1;
        break;
      }
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        throw new Error('__help__');
      default:
        throw new Error(`unknown argument "${arg}"`);
    }
  }
  return options;
}

/** One row of the roster, for a run that finished where it finished. */
export interface HeadlessPerson {
  id: string;
  name: string;
  role: string;
  task: string;
  reason: string;
  progressTicks: number;
}

/** Per-job totals, so a headless run can be compared across priority settings. */
export interface HeadlessJob {
  id: string;
  completed: number;
  pending: number;
  capacity: number;
}

export interface HeadlessSummary {
  seed: number;
  ticksRun: number;
  finalTick: number;
  day: number;
  period: string;
  rngCursor: number;
  logLength: number;
  eventsByTier: Record<string, number>;
  digest: string;
  /** The priority in force at the end of the run. */
  priority: string;
  personnel: HeadlessPerson[];
  jobs: HeadlessJob[];
}

/**
 * A short deterministic digest of the log.
 *
 * **Scope: the event log only.** It hashes event types and tick numbers, so it is
 * identical for every seed — at both Stage 1 and Stage 2, because nothing in the
 * simulation consumes randomness during a tick. Arrival jitter was measured and
 * removed (`STAGE2_MASTER_PLAN.md` §5.2), so the seed cannot affect the event
 * sequence; it varies the roster names only. That is correct behaviour, not a
 * determinism failure, and this digest is deliberately *not* evidence that the
 * seed is wired through; `src/sim/rng.test.ts` covers that.
 *
 * Small on purpose (`ARCHITECTURE.md` §10): a golden file that changes on every
 * inconsequential edit gets abandoned, and an abandoned golden test is worse than
 * none.
 */
export function digestOf(log: ReadonlyArray<{ type: string; tick: number }>): string {
  let hash = 0x811c9dc5;
  for (const event of log) {
    const text = `${event.type}@${event.tick};`;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, '0');
}

/** Run the simulation and summarise it. Pure apart from doing the ticks. */
export function runHeadless(options: HeadlessOptions): HeadlessSummary {
  const state = run(
    enqueue(createRun(options.seed), { type: 'set_priority', value: options.priority }),
    options.ticks,
  );

  const completed = new Map<string, number>();
  for (const event of state.log) {
    if (event.type !== 'task_completed') continue;
    const jobId = event.subjects[1];
    if (jobId === undefined) continue;
    completed.set(jobId, (completed.get(jobId) ?? 0) + 1);
  }

  return {
    seed: state.seed,
    ticksRun: options.ticks,
    finalTick: state.tick,
    day: dayOf(state.tick),
    period: periodOf(state.tick),
    rngCursor: state.rngCursor,
    logLength: state.log.length,
    eventsByTier: countByTier(state.log),
    digest: digestOf(state.log),
    priority: readPriority(state.intent),
    personnel: state.personnel.map((person) => {
      const task = person.currentTask;
      const label =
        task === null
          ? 'Standby'
          : (state.jobs.find((job) => job.id === task.jobId)?.label ?? task.jobId);
      const duration = task === null
        ? 0
        : (state.jobs.find((job) => job.id === task.jobId)?.durationTicks ?? 0);
      return {
        id: person.id,
        name: person.name,
        role: person.role,
        task: label,
        reason: task === null ? standbyReason(person, state.jobs, state.facilities, state.personnel) : task.reason,
        progressTicks: task === null ? 0 : Math.round((task.progressTicks / Math.max(1, duration)) * 100),
      };
    }),
    jobs: state.jobs.map((job) => ({
      id: job.id,
      completed: completed.get(job.id) ?? 0,
      pending: job.pending,
      capacity: state.facilities.find((f) => f.id === job.facilityId)?.capacity ?? 0,
    })),
  };
}

export function formatSummary(s: HeadlessSummary): string {
  const tiers = s.eventsByTier;
  const lines = [
    `seed          ${s.seed}`,
    `ticks run     ${s.ticksRun}`,
    `final tick    ${s.finalTick}`,
    `day / period  Day ${s.day} — ${s.period}`,
    `rng cursor    ${s.rngCursor}`,
    `log length    ${s.logLength}`,
    `events        routine ${tiers.routine ?? 0}, notable ${tiers.notable ?? 0}, critical ${tiers.critical ?? 0}`,
    `priority      ${s.priority}`,
    `digest        ${s.digest}`,
    '',
    'jobs          completed  pending  capacity',
  ];
  for (const job of s.jobs) {
    lines.push(
      `  ${job.id.padEnd(12)}${String(job.completed).padStart(9)}${String(job.pending).padStart(9)}${String(job.capacity).padStart(10)}`,
    );
  }
  lines.push('', 'roster        name       role          task                progress  reason');
  for (const person of s.personnel) {
    lines.push(
      `  ${person.id.padEnd(12)}${person.name.padEnd(11)}${person.role.padEnd(14)}${person.task.padEnd(20)}${String(person.progressTicks).padStart(6)}%  ${person.reason}`,
    );
  }
  return lines.join('\n');
}

/** Entry point. Only runs when invoked directly, so tests can import the rest. */
function main(): void {
  let options: HeadlessOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === '__help__') {
      process.stdout.write(`${USAGE}\n`);
      return;
    }
    process.stderr.write(`error: ${message}\n\n${USAGE}\n`);
    process.exitCode = 1;
    return;
  }

  const summary = runHeadless(options);
  process.stdout.write(
    options.json ? `${JSON.stringify(summary, null, 2)}\n` : `${formatSummary(summary)}\n`,
  );
}

/**
 * True only when this file is the process entry point.
 *
 * Without the guard, importing `parseArgs` from a test would also run a whole
 * simulation and print a summary, because `main()` is defined in this module.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) main();