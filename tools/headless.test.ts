import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { digestOf, formatSummary, parseArgs, runHeadless } from './headless';
import { DEFAULT_SEED } from '../src/sim/rng';
import { TICKS_PER_DAY } from '../src/sim/time';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const CLI = join(REPO, 'tools', 'headless.ts');
const TSX = join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [TSX, CLI, ...args], {
      encoding: 'utf8',
      cwd: REPO,
      // Without this a hung child blocks the whole suite forever. It was added
      // after the CLI tests froze Termux on the phone: eight node+tsx spawns in
      // sequence is enough to wedge the device if any one of them stalls, and a
      // test that can hang silently is worse than one that fails.
      timeout: 60_000,
      killSignal: 'SIGKILL',
      maxBuffer: 8 * 1024 * 1024,
    });
    return { stdout, status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; status?: number; message?: string };
    if (e.message?.includes('ETIMEDOUT')) {
      throw new Error(`the CLI hung on ${args.join(' ')} — it did not exit within 60s`);
    }
    return { stdout: e.stdout ?? '', status: e.status ?? 1 };
  }
}

test('defaults to a full day with the documented seed', () => {
  const options = parseArgs([]);
  assert.equal(options.ticks, TICKS_PER_DAY);
  assert.equal(options.seed, DEFAULT_SEED);
  assert.equal(options.json, false);
});

test('parses the documented flags', () => {
  const options = parseArgs(['--ticks', '10', '--seed', '7', '--json']);
  assert.equal(options.ticks, 10);
  assert.equal(options.seed, 7);
  assert.equal(options.json, true);
});

test('rejects invalid arguments', () => {
  assert.throws(() => parseArgs(['--ticks', 'abc']), /must be a number/);
  assert.throws(() => parseArgs(['--ticks', '-1']), /non-negative/);
  assert.throws(() => parseArgs(['--ticks', '1.5']), /whole number/);
  assert.throws(() => parseArgs(['--seed', '99999999999']), /32-bit/);
  assert.throws(() => parseArgs(['--ticks']), /needs a value/);
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
});

test('a run reports the state it actually reached', () => {
  const s = runHeadless({ ticks: TICKS_PER_DAY, seed: DEFAULT_SEED, priority: 'balanced', json: false });
  assert.equal(s.finalTick, TICKS_PER_DAY);
  assert.equal(s.day, 2);
  assert.equal(s.period, 'Night');
  assert.equal(s.rngCursor, 7, 'the seven roster draws are the only draws, ever');
  assert.equal(s.priority, 'balanced', 'no command was issued, so the default holds');
  assert.equal(s.personnel.length, 7);
  assert.equal(s.jobs.length, 2);
  assert.ok(s.logLength > 100, 'a day of work produces a substantial log');
  assert.ok(s.eventsByTier.notable !== undefined);
});

test('every roster row carries a name, a task and a reason', () => {
  const s = runHeadless({ ticks: 500, seed: DEFAULT_SEED, priority: 'balanced', json: false });
  for (const person of s.personnel) {
    assert.ok(person.name.length > 0);
    assert.ok(person.task.length > 0);
    assert.ok(person.reason.length > 0, `${person.id} has no reason`);
    assert.ok(person.progressTicks >= 0 && person.progressTicks <= 100);
  }
});

test('job rows report completions, backlog and capacity', () => {
  const s = runHeadless({ ticks: TICKS_PER_DAY * 2, seed: DEFAULT_SEED, priority: 'balanced', json: false });
  for (const job of s.jobs) {
    assert.ok(job.completed > 0, `${job.id} completed nothing in two days`);
    assert.ok(job.pending >= 0, `${job.id} has negative backlog`);
    assert.equal(job.capacity, 4);
  }
});

test('repeated runs are deterministic, log and digest alike', () => {
  const a = runHeadless({ ticks: 5000, seed: DEFAULT_SEED, priority: 'balanced', json: false });
  const b = runHeadless({ ticks: 5000, seed: DEFAULT_SEED, priority: 'balanced', json: false });
  assert.deepEqual(a, b);
  assert.equal(a.digest, b.digest);
});

test('the digest is stable and short', () => {
  assert.equal(digestOf([]), '811c9dc5', 'FNV offset basis for an empty log');
  assert.equal(digestOf([]).length, 8);
});

test('zero ticks is a valid run', () => {
  const s = runHeadless({ ticks: 0, seed: 1, priority: 'balanced', json: false });
  assert.equal(s.finalTick, 0);
  assert.equal(s.day, 1);
  assert.equal(s.logLength, 0);
});

test('the CLI runs a full day and exits 0', () => {
  const { stdout, status } = runCli(['--ticks', '1440']);
  assert.equal(status, 0);
  assert.match(stdout, /final tick\s+1440/);
  assert.match(stdout, /Day 2/);
  assert.match(stdout, /rng cursor\s+7/);
  assert.match(stdout, /priority\s+balanced/);
  assert.match(stdout, /roster/);
});

test('the CLI emits JSON on request', () => {
  const { stdout, status } = runCli(['--ticks', '1440', '--json']);
  assert.equal(status, 0);
  const parsed = JSON.parse(stdout) as {
    finalTick: number;
    logLength: number;
    personnel: unknown[];
    jobs: unknown[];
  };
  assert.equal(parsed.finalTick, 1440);
  assert.ok(parsed.logLength > 100);
  assert.equal(parsed.personnel.length, 7);
  assert.equal(parsed.jobs.length, 2);
});

test('the CLI fails with a nonzero exit code on bad input', () => {
  const { status } = runCli(['--ticks', 'abc']);
  assert.notEqual(status, 0);
});

test('the CLI prints help', () => {
  const { stdout, status } = runCli(['--help']);
  assert.equal(status, 0);
  assert.match(stdout, /Usage:/);
});

test('two CLI invocations agree exactly', () => {
  const a = runCli(['--ticks', '2000', '--seed', '99', '--json']).stdout;
  const b = runCli(['--ticks', '2000', '--seed', '99', '--json']).stdout;
  assert.equal(a, b);
});

test('formatting is readable and includes every documented field', () => {
  const text = formatSummary(
    runHeadless({ ticks: 1440, seed: DEFAULT_SEED, priority: 'balanced', json: false }),
  );
  for (const field of ['seed', 'ticks run', 'final tick', 'day / period', 'rng cursor', 'log length', 'events', 'digest', 'priority', 'jobs', 'roster']) {
    assert.ok(text.includes(field), `missing ${field}`);
  }
});

test('the priority flag changes the outcome, which is the point of Stage 2', () => {
  const base = { ticks: TICKS_PER_DAY * 5, seed: DEFAULT_SEED, json: false };
  const mf = runHeadless({ ...base, priority: 'maintenance-first' });
  const kf = runHeadless({ ...base, priority: 'meals-first' });
  const backlog = (r: typeof mf, id: string): number => r.jobs.find((j) => j.id === id)?.pending ?? -1;

  assert.ok(backlog(mf, 'meals') >= 40, 'maintenance-first should starve meals');
  assert.ok(backlog(kf, 'maintenance') >= 15, 'meals-first should defer maintenance');
});

test('an unknown priority is rejected loudly', () => {
  assert.throws(() => parseArgs(['--priority', 'sideways']), /--priority must be one of/);
});