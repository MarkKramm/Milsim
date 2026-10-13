/**
 * Seeded randomness.
 *
 * `D10`: one seeded stream from tick 0, one entry point, no exceptions.
 * `Math.random()` anywhere under `src/sim` is a bug, and an architecture test
 * fails the build if one appears.
 *
 * **`rngCursor` is a count of draws taken, not an internal generator word.** It
 * rests at 0 for a run that has drawn nothing, which is what the Stage 1 contract
 * asserts and what the UI shows. The seed is mixed in separately, so a fresh run
 * reads `rngCursor: 0` while still having a seed-dependent stream.
 *
 * Stage 1 makes **no** draws, so `rngCursor` stays 0. That is the correct
 * behaviour, not a missing feature — `docs/plans/STAGE1_PLAN_v4.md` §5.5.
 */

import type { SimState } from './state';

/** Readable, and not a constant anyone will mistake for a real date. */
export const DEFAULT_SEED = 20260101;

/** 32-bit unsigned. Keeps every value inside [0, 2^32). */
export function toUint32(value: number): number {
  return value >>> 0;
}

/**
 * Mulberry32's increment. Chosen because the generator is five lines, well
 * distributed, and trivially portable — and portability is the property that
 * actually matters, since a replay recorded years from now must still produce
 * identical results.
 */
const INCREMENT = 0x6d2b79f5;

/** Record that one more draw has been taken. */
export function advanceCursor(cursor: number): number {
  return toUint32(cursor + 1);
}

/**
 * One Mulberry32 draw. `draws` is how many draws have been taken including this
 * one, so `draws = 0` is never passed. Returns a float in [0, 1).
 *
 * The seed is folded into the generator state as `seed + draws * INCREMENT`,
 * which maps each (seed, draw) pair to a distinct state. Doing it this way rather
 * than by seeding a stored state word is what lets the cursor remain a plain
 * count that reads 0 before anything is drawn.
 */
export function mulberry32(seed: number, draws: number): number {
  let a = (toUint32(seed) + Math.imul(toUint32(draws), INCREMENT)) | 0;
  a = (a + INCREMENT) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return toUint32(t ^ (t >>> 14)) / 4294967296;
}

/**
 * The single entry point for simulation randomness. Advances the draft's cursor
 * and returns the draw.
 *
 * Mutating the draft is deliberate and matches `ARCHITECTURE.md` §5: `rand` takes
 * the state being built *inside one tick*, which is already a fresh object. The
 * caller's previous state is never passed here and is never mutated.
 *
 * Invariant 11 — the cursor advances only inside this function.
 */
export function rand(draft: SimState): number {
  draft.rngCursor = advanceCursor(draft.rngCursor);
  return mulberry32(draft.seed, draft.rngCursor);
}