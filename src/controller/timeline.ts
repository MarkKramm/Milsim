/**
 * Wall-clock accumulation — pure, and therefore testable without a browser.
 *
 * The rules this encodes, all of which are contracts rather than preferences
 * (`docs/plans/STAGE1_PLAN_v4.md` §6 and §6.1):
 *
 * **Accumulated time is never discarded.** Elapsed time is measured and added
 * whole; it is never clamped to some maximum. Clamping *loses* simulation time,
 * and a controller that loses time while claiming elapsed-time equivalence is
 * simply lying about its own state.
 *
 * **A per-frame cap is not a clamp.** The cap limits how many ticks execute in
 * one frame, which protects the phone from a stall. The remainder stays in the
 * accumulator and drains on later frames, so nothing is lost — only deferred.
 * At 60fps a 240-tick cap sustains 14,400 ticks/s, 112x the 128 ticks/s that
 * 16x needs, so a backlog always clears faster than the speed being caught up to.
 *
 * **Pause runs zero ticks and freezes the accumulator.** Time passing while
 * paused is not debt and is never owed. A pause that kept accruing would turn
 * ten paused minutes into an instant ten-minute jump on resume.
 */

/** `D4`. A day is 1440 ticks; 1x is 8 ticks/s, so a day is 180 seconds. */
export const TICKS_PER_SECOND_1X = 8;

export const SPEEDS = {
  pause: 0,
  '1x': 8,
  '4x': 32,
  '16x': 128,
} as const;

export type SpeedName = keyof typeof SPEEDS;

/**
 * Work limit for a single frame.
 *
 * 240 is not a magic number chosen for looks: at ~60fps it sustains 14,400
 * ticks/s, comfortably above the 128 ticks/s of 16x, so the cap is never what
 * decides how fast a backlog clears. It only prevents one enormous frame after
 * the browser has been suspended.
 */
export const MAX_TICKS_PER_FRAME = 240;

export interface AdvanceResult {
  /** Ticks to execute this frame. */
  ticksToRun: number;
  /** Carried forward, including any time not yet converted into ticks. */
  accumulatedMs: number;
  /** Whole ticks still owed after this frame. Diagnostic, not simulation state. */
  backlogTicks: number;
}

/**
 * Convert elapsed time into whole ticks.
 *
 * `accumulatedMs` is carried in and out; it is the caller's running total of owed
 * time and is never reset here. The fractional remainder is preserved, so slow
 * frames do not gradually lose time to rounding.
 */
export function advance(
  accumulatedMs: number,
  deltaMs: number,
  ticksPerSecond: number,
  maxTicksPerFrame: number = MAX_TICKS_PER_FRAME,
): AdvanceResult {
  if (ticksPerSecond <= 0) {
    // Paused: zero ticks, and the accumulator is returned untouched so a backlog
    // that existed before the pause survives it.
    return { ticksToRun: 0, accumulatedMs, backlogTicks: owedTicks(accumulatedMs, ticksPerSecond) };
  }

  const msPerTick = 1000 / ticksPerSecond;
  const total = accumulatedMs + deltaMs;

  const owed = Math.floor(total / msPerTick);
  const toRun = Math.min(owed, maxTicksPerFrame);

  return {
    ticksToRun: toRun,
    // Only the executed ticks are subtracted. The rest stays owed.
    accumulatedMs: total - toRun * msPerTick,
    backlogTicks: owed - toRun,
  };
}

function owedTicks(accumulatedMs: number, ticksPerSecond: number): number {
  if (ticksPerSecond <= 0) return 0;
  return Math.floor(accumulatedMs / (1000 / ticksPerSecond));
}

/** Milliseconds per tick at a given speed. */
export function msPerTick(ticksPerSecond: number): number {
  return 1000 / ticksPerSecond;
}