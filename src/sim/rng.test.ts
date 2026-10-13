import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { DEFAULT_SEED, advanceCursor, mulberry32, rand, toUint32 } from './rng';
import { createRun, statesEqual } from './state';

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

test('a fresh run has a zero cursor', () => {
  assert.equal(createRun(DEFAULT_SEED).rngCursor, 0);
});

test('rand() advances the cursor by exactly one step per draw', () => {
  const draft = createRun(DEFAULT_SEED);
  assert.equal(draft.rngCursor, 0);

  const first = rand(draft);
  assert.equal(draft.rngCursor, 1);
  assert.equal(first, VECTORS_20260101[0]?.[1]);

  const second = rand(draft);
  assert.equal(draft.rngCursor, 2);
  assert.equal(second, VECTORS_20260101[1]?.[1]);
});

test('different seeds are representable and coerced to uint32', () => {
  assert.equal(createRun(1).seed, 1);
  assert.equal(createRun(0xffffffff).seed, 0xffffffff);
  assert.equal(createRun(-1).seed, 0xffffffff);
});

test('a fresh state is identical for identical seeds', () => {
  assert.ok(statesEqual(createRun(DEFAULT_SEED), createRun(DEFAULT_SEED)));
});