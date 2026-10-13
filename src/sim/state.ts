/**
 * The one authoritative state object.
 *
 * `ARCHITECTURE.md` §3 and §4.0. Every mutable field is owned by exactly one
 * system (`SYSTEM_DEPENDENCIES.md` §3):
 *
 *   tick                     Time
 *   seed, rngCursor          RNG
 *   log, nextEventId         Events
 *   pendingCommands          Commands
 *   intent                   Player intent
 *
 * Two things are deliberately *absent*:
 *
 * **Derived values are never stored.** Readiness and `resources` do not appear
 * here because they are computed from underlying conditions each tick and never
 * persisted — a stored copy could go stale, and something would eventually read
 * it and treat a summary as a cause (invariant 12).
 *
 * **Later-stage fields are absent, not empty.** There is no `personnel: []` or
 * `facilities: []` placeholder. A field appears when its owning system arrives.
 * Those documents annotate each field with the stage it first appears, so a
 * Stage 1 run holding only seven fields reads as intended rather than incomplete.
 */

import type { Event } from './events';
import type { Command } from './commands';
import type { Intent } from './intent';

export interface SimState {
  /** Master seed for the run. Displayed so a run can be shared or reproduced. */
  seed: number;
  /** Position in the seeded stream. Advances only inside `rand()`. */
  rngCursor: number;
  /** 1 tick = 1 in-game minute. Initial tick is 0 = Day 1. */
  tick: number;
  /** Events owns this alongside `log[]`. */
  nextEventId: number;
  /** Append-only. Never mutated, never truncated. */
  log: Event[];
  /** Queue, drained at tick step 3. Persisted so a saved run keeps its orders. */
  pendingCommands: Command[];
  /** First-class player policy data. Empty at Stage 1. */
  intent: Intent[];
}

/**
 * A fresh run at tick 0, Day 1, Night.
 *
 * `log` starts empty and `nextEventId` at 0, so the first appended event is
 * id 0 — ids are sequential from the beginning rather than starting at 1 and
 * wasting an id for a thing that never existed.
 */
export function createRun(seed: number): SimState {
  return {
    seed: seed >>> 0,
    rngCursor: 0,
    tick: 0,
    nextEventId: 0,
    log: [],
    pendingCommands: [],
    intent: [],
  };
}

/**
 * Copy a state into a fresh object to be mutated inside a tick.
 *
 * Arrays are copied rather than shared so appends cannot reach back into the
 * caller's state, and event objects are shared because they are immutable once
 * appended. This is what makes `tick()` provably non-mutating: the input and the
 * output share no mutable structure.
 */
export function draftOf(state: SimState): SimState {
  return {
    seed: state.seed,
    rngCursor: state.rngCursor,
    tick: state.tick,
    nextEventId: state.nextEventId,
    log: [...state.log],
    pendingCommands: [...state.pendingCommands],
    intent: [...state.intent],
  };
}

/**
 * Structural equality for the whole state.
 *
 * Exists so the determinism test can compare *entire* states rather than only
 * their logs. Two runs can produce identical logs while diverging somewhere else
 * — comparing logs alone would pass on a real bug.
 */
export function statesEqual(a: SimState, b: SimState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}