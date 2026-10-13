/**
 * The tick.
 *
 * One function, one linear body, never rearranged casually
 * (`ARCHITECTURE.md` §4). Ordering is the whole point: it decides what a system
 * can see, and it is the most common source of simulation bugs.
 *
 * Stage 1 implements **phase 0 only** — clock, commands, intent
 * (`SYSTEM_DEPENDENCIES.md` §4). Phases 1–9 and step 12 belong to systems that do
 * not exist yet and are absent rather than stubbed: an empty phase that runs
 * nothing is indistinguishable from a working one until the day it silently
 * does the wrong thing.
 */

import { draftOf } from './state';
import type { SimState } from './state';
import { DAY_ROLLOVER, emit } from './events';
import { applyCommands } from './commands';
import { TICKS_PER_DAY, dayOf, isDayRollover } from './time';

/**
 * `tick(state) → SimState` — the whole new state.
 *
 * Takes no commands argument. They arrive through `state.pendingCommands` and
 * are drained here (see `commands.ts` for why that argument was removed).
 *
 * Pure: no I/O, no clock reads, no globals. Same input, same output.
 */
export function tick(state: SimState): SimState {
  const next = draftOf(state);

  // Step 1 — advance the clock. Exactly +1 (invariant 10).
  next.tick = state.tick + 1;

  // Step 2 — derive the day and check for rollover.
  //
  // Checked here, immediately after the clock and *before* commands, because the
  // rollover depends only on time. A command could not legitimately change it,
  // and checking after commands would make the day's boundary depend on player
  // input, which is exactly the kind of coupling the phase order exists to
  // prevent.
  if (isDayRollover(next.tick)) {
    emit(next, {
      type: DAY_ROLLOVER,
      tier: 'routine',
      data: { day: dayOf(next.tick) },
    });
  }

  // Step 3 — drain the command queue, then empty it.
  applyCommands(next);

  // Step 4 — apply intent. A no-op at Stage 1: the field exists so the state
  // contract holds, and resolving it is Stage 2's work.

  return next;
}

/**
 * Run `count` ticks, returning the final state.
 *
 * Sequential rather than clever: the sequence is small in a headless run and
 * each tick must see the previous one's output. Used by the headless runner and
 * by tests.
 */
export function run(state: SimState, count: number): SimState {
  let current = state;
  for (let i = 0; i < count; i += 1) {
    current = tick(current);
  }
  return current;
}

/** Ticks needed to reach the start of the next day, from `tick`. */
export function ticksUntilNextDay(tickCount: number): number {
  return TICKS_PER_DAY - (tickCount % TICKS_PER_DAY);
}