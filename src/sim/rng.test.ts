import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { DEFAULT_SEED, advanceCursor, mulberry32, rand, toUint32 } from './rng';
import { createRun, draftOf, statesEqual } from './state';

/**
 * Expected values produced by the published Mulberry32 algorithm via an
 * independent implementation, not by this file's own code — otherwise the test
 * would only prove the code agrees with itself.
 *
 * Index k is the k-th draw, i.e. the cursor value *after* the draw.
 */
const VECTORS_20260101: ReadonlyArray<readonly [number, number]> = [
  [1, 0.5929048631805927],
  [2, 0.8053383126389235],
  [3, 0.9675766411237419],
  [4, 0.7292939077597111],
  [5, 0.12063259980641305],
];

test('default seed is 20260101', () => {
  assert.equal(DEFAULT_SEED, 20260101);
});

test('known Mulberry32 vectors for the default seed', () => {
  for (const [draws, expected] of VECTORS_20260101) {
    assert.equal(mulberry32(DEFAULT_SEED, draws), expected, `draw ${draws}`);
  }
});

test('the seed actually changes the stream', () => {
  // A generator that ignored the seed would produce identical output for every
  // run and make `seed` decorative. Caught by the first draft of this file.
  const a = mulberry32(DEFAULT_SEED, 1);
  const b = mulberry32(1, 1);
  assert.notEqual(a, b);
});

test('outputs stay within [0, 1)', () => {
  for (let draw = 1; draw <= 100000; draw += 1) {
    const value = mulberry32(DEFAULT_SEED, draw);
    assert.ok(value >= 0 && value < 1, `out of range at draw ${draw}: ${value}`);
  }
});

test('the stream is roughly uniform, not merely in range', () => {
  // Catches a constant or badly scaled implementation that a range check misses.
  let sum = 0;
  const n = 100000;
  for (let draw = 1; draw <= n; draw += 1) sum += mulberry32(DEFAULT_SEED, draw);
  assert.ok(Math.abs(sum / n - 0.5) < 0.01, `mean was ${sum / n}`);
});

test('cursor stays a 32-bit unsigned count', () => {
  assert.equal(toUint32(-1), 0xffffffff);
  assert.equal(advanceCursor(0), 1);
  let cursor = 0xfffffffe;
  cursor = advanceCursor(cursor);
  assert.ok(cursor >= 0 && cursor <= 0xffffffff);
});

/**
 * Draws taken when a run is created, to name the seven-person roster.
 * `personnel.ts` `buildRoster` consumes exactly one draw per person.
 */
const ROSTER_DRAWS = 7;

test('a fresh run has drawn exactly once per person, to name the roster', () => {
  // Was zero at Stage 1: a fresh run drew nothing. Stage 2 names the roster at
  // creation time (B1 §3 — names come from the seeded stream and nowhere else),
  // so the cursor is 7 immediately after `createRun`. Nothing else in Stage 2
  // consumes randomness, so it never moves again.
  assert.equal(createRun(DEFAULT_SEED).rngCursor, ROSTER_DRAWS);
  assert.equal(createRun(DEFAULT_SEED).personnel.length, ROSTER_DRAWS);
});

test('the roster names are distinct, and differ between seeds', () => {
  for (const seed of [DEFAULT_SEED, 1, 2, 4242, 777, 31337, 99]) {
    const names = createRun(seed).personnel.map((p) => p.name);
    assert.equal(new Set(names).size, names.length, `duplicate name at seed ${seed}: ${names}`);
  }
  assert.notDeepEqual(
    createRun(DEFAULT_SEED).personnel.map((p) => p.name),
    createRun(4242).personnel.map((p) => p.name),
  );
});

test('rand() advances the cursor by exactly one step per draw', () => {
  const draft = createRun(DEFAULT_SEED);
  assert.equal(draft.rngCursor, ROSTER_DRAWS);

  // The next draw is number 8, not number 1: the roster consumed the first
  // seven. Asserting against the published vector for draw 8 proves the stream
  // position is tracked, not merely counted.
  const first = rand(draft);
  assert.equal(draft.rngCursor, ROSTER_DRAWS + 1);
  assert.equal(first, mulberry32(DEFAULT_SEED, ROSTER_DRAWS + 1));

  const second = rand(draft);
  assert.equal(draft.rngCursor, ROSTER_DRAWS + 2);
  assert.equal(second, mulberry32(DEFAULT_SEED, ROSTER_DRAWS + 2));
});

test('a state with the cursor at zero still yields draw one first', () => {
  // Keeps the published vectors tied to their own starting point, so the test
  // above cannot drift silently if the roster's draw count ever changes.
  const draft = draftOf(createRun(DEFAULT_SEED));
  draft.rngCursor = 0;
  assert.equal(rand(draft), VECTORS_20260101[0]?.[1]);
  assert.equal(rand(draft), VECTORS_20260101[1]?.[1]);
});

test('different seeds are representable and coerced to uint32', () => {
  assert.equal(createRun(1).seed, 1);
  assert.equal(createRun(0xffffffff).seed, 0xffffffff);
  assert.equal(createRun(-1).seed, 0xffffffff);
});

test('a fresh state is identical for identical seeds', () => {
  assert.ok(statesEqual(createRun(DEFAULT_SEED), createRun(DEFAULT_SEED)));
});
/**
 * The next stages depend on this: a run that is saved, closed, and resumed must
 * continue the same stream rather than restarting it. Verified by probe during
 * the Stage 1 evidence audit and worth keeping as a committed test, because
 * nothing else fails if `rand` is ever made to depend on state outside `SimState`.
 */
test('serialize and restore mid-stream, and the next draw still matches', () => {
  const live = draftOf(createRun(DEFAULT_SEED));
  rand(live);
  rand(live);
  rand(live);

  const restored = JSON.parse(JSON.stringify(live)) as typeof live;

  const afterRestore = rand(restored);
  const uninterrupted = rand(live);

  assert.equal(afterRestore, uninterrupted, 'the restored run diverged from the live one');
  assert.equal(restored.rngCursor, live.rngCursor, 'cursors agree');
});

test('a 500-draw sequence is identical for identical seeds', () => {
  const sequence = (seed: number, length: number): number[] => {
    const draft = draftOf(createRun(seed));
    return Array.from({ length }, () => rand(draft));
  };

  const a = sequence(DEFAULT_SEED, 500);
  const b = sequence(DEFAULT_SEED, 500);
  assert.deepEqual(a, b);
});

test('every draw differs between two seeds', () => {
  const sequence = (seed: number, length: number): number[] => {
    const draft = draftOf(createRun(seed));
    return Array.from({ length }, () => rand(draft));
  };

  const a = sequence(DEFAULT_SEED, 500);
  const b = sequence(1, 500);
  const collisions = a.filter((value, i) => value === b[i]).length;
  assert.equal(collisions, 0, 'two seeds produced colliding draws, so seed is not wired through');
});
