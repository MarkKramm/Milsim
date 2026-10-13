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
import { run } from '../src/sim/tick';
import { countByTier } from '../src/sim/events';
import { DEFAULT_SEED } from '../src/sim/rng';
import { dayOf, periodOf, TICKS_PER_DAY } from '../src/sim/time';

const USAGE = `Usage: npm run headless -- [options]

  --ticks N     number of ticks to run (default ${TICKS_PER_DAY})
  --seed S      32-bit unsigned seed (default ${DEFAULT_SEED})
  --json        print the summary as JSON instead of text
  --help        show this message

No browser is involved. The simulation runs in plain Node.`;

export interface HeadlessOptions {
  ticks: number;
  seed: number;
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
  const options: HeadlessOptions = { ticks: TICKS_PER_DAY, seed: DEFAULT_SEED, json: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
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

/**
 * A short deterministic digest of the log.
 *
 * **Scope: the event log only.** It hashes event types and tick numbers, so at
 * Stage 1 it is identical for every seed — nothing in this stage consumes
 * randomness, so the seed cannot affect the sequence. That is the correct
 * behaviour, not a determinism failure, and this digest is deliberately *not*
 * evidence that the seed is wired through; `src/sim/rng.test.ts` covers that.
 * Once a system draws randomness, the digest will start varying with the seed.
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
  const state = run(createRun(options.seed), options.ticks);
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
  };
}

export function formatSummary(s: HeadlessSummary): string {
  const tiers = s.eventsByTier;
  return [
    `seed          ${s.seed}`,
    `ticks run     ${s.ticksRun}`,
    `final tick    ${s.finalTick}`,
    `day / period  Day ${s.day} — ${s.period}`,
    `rng cursor    ${s.rngCursor}`,
    `log length    ${s.logLength}`,
    `events        routine ${tiers.routine ?? 0}, notable ${tiers.notable ?? 0}, critical ${tiers.critical ?? 0}`,
    `digest        ${s.digest}`,
  ].join('\n');
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