/**
 * Game clock.
 *
 * One tick is one in-game minute (`D4`). Time is *derived*, never stored:
 * `SimState` holds only `tick`, and day, period and hour are computed from it.
 * That is what keeps a saved state and a replayed run in agreement — there is no
 * second copy of "what day it is" that could disagree with the tick counter.
 *
 * Pure: no wall-clock reads, no browser globals, no randomness.
 */

/** Minutes in an in-game day. `D4`. */
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY; // 1440

/**
 * Abstract periods. `D5` forbids a ticking clock: the player sees where they are
 * in the day, never the minute.
 */
export type Period = 'Night' | 'Morning' | 'Afternoon' | 'Evening';

/**
 * Period boundaries, by hour-of-day. Night 0–5, Morning 6–11, Afternoon 12–17,
 * Evening 18–23. The first hour that *excludes* each period, so lookup is a
 * simple comparison and there is no inclusive/exclusive edge to get wrong.
 */
const PERIOD_START_HOUR = {
  Morning: 6,
  Afternoon: 12,
  Evening: 18,
} as const;

/** Tick 0 is Day 1. There is no Day 0 — a run has no day before it begins. */
export function dayOf(tick: number): number {
  return Math.floor(tick / TICKS_PER_DAY) + 1;
}

/** Minute within the in-game day, 0–1439. */
export function minuteOfDay(tick: number): number {
  return ((tick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
}

/** Hour within the in-game day, 0–23. Used only to pick a period. */
export function hourOfDay(tick: number): number {
  return Math.floor(minuteOfDay(tick) / MINUTES_PER_HOUR);
}

export function periodOf(tick: number): Period {
  const hour = hourOfDay(tick);
  if (hour < PERIOD_START_HOUR.Morning) return 'Night';
  if (hour < PERIOD_START_HOUR.Afternoon) return 'Morning';
  if (hour < PERIOD_START_HOUR.Evening) return 'Afternoon';
  return 'Evening';
}

/** In-game minutes elapsed, which equals the tick. Named for the UI. */
export function elapsedInGameMinutes(tick: number): number {
  return tick;
}

/**
 * True on the tick that starts a new day, for every day after the first.
 *
 * Tick 0 is deliberately excluded: it is the *start* of Day 1, not the
 * completion of a day, so there is nothing to have rolled over from. Without the
 * guard, `0 % 1440 === 0` fires a "Day 1" event at run start — a false rollover
 * that no test would forgive and no player could explain.
 */
export function isDayRollover(tick: number): boolean {
  return tick > 0 && tick % TICKS_PER_DAY === 0;
}

/** The display string, e.g. `Day 3 — Afternoon`. `D5`. */
export function presentTime(tick: number): string {
  return `Day ${dayOf(tick)} — ${periodOf(tick)}`;
}