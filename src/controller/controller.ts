/**
 * The controller.
 *
 * Owns wall-clock timing, speed and pause; drives the simulation; notifies the
 * UI. It is the only layer that reads the developer's clock — the simulation
 * reads none, which is what makes it deterministic and headless-runnable
 * (`ARCHITECTURE.md` §2).
 *
 * The timing arithmetic lives in `timeline.ts` as a pure function and is tested
 * there without a browser. This file is the part that cannot be: the animation
 * loop. `step()` is separated out and takes an explicit delta so the loop's
 * behaviour can still be exercised directly.
 */

import { tick } from '../sim/tick';
import { createRun } from '../sim/state';
import type { SimState } from '../sim/state';
import { dayOf, elapsedInGameMinutes, periodOf } from '../sim/time';
import { DEFAULT_SEED } from '../sim/rng';
import { MAX_TICKS_PER_FRAME, SPEEDS, advance, owedTicksAt } from './timeline';
import type { SpeedName } from './timeline';

/** Everything the UI is allowed to read. All of it derived, none of it authoritative. */
export interface Snapshot {
  day: number;
  period: string;
  tick: number;
  seed: number;
  rngCursor: number;
  elapsedMinutes: number;
  eventsThisTick: number;
  logLength: number;
  speed: SpeedName;
  /** Owed ticks not yet processed. Diagnostic only. */
  backlogTicks: number;
}

export interface ControllerOptions {
  seed?: number;
  /** Frame scheduling, injected so tests need no browser. Mirrors rAF. */
  schedule?: (callback: (timeMs: number) => void) => number;
  cancel?: (handle: number) => void;
  speed?: SpeedName;
}

/** Notify at most this often, so 16x does not mean 128 React renders a second. */
const NOTIFY_INTERVAL_MS = 100;

export class Controller {
  private state: SimState;
  private accumulatedMs = 0;
  private speed: SpeedName;
  private lastFrameMs = 0;
  private running = false;
  private handle: number | null = null;
  private lastNotifyMs = 0;
  // Last non-zero speed, so a paused backlog can still be measured: at 0 ticks/s
  // a tick has no length and the backlog would otherwise always read as zero.
  private lastActiveTps: number = SPEEDS["1x"];
  private eventsThisTick = 0;
  private backlogTicks = 0;

  private readonly subscribers = new Set<(snapshot: Snapshot) => void>();
  private readonly schedule: (callback: (timeMs: number) => void) => number;
  private readonly cancel: (handle: number) => void;

  constructor(options: ControllerOptions = {}) {
    this.state = createRun(options.seed ?? DEFAULT_SEED);
    this.speed = options.speed ?? '1x';
    this.schedule = options.schedule ?? defaultSchedule;
    this.cancel = options.cancel ?? defaultCancel;
  }

  getSpeed(): SpeedName {
    return this.speed;
  }

  setSpeed(speed: SpeedName): void {
    if (speed === this.speed) return;
    // Only a pause -> running transition may discard the paused interval. A
    // running -> running change must NOT reset the frame baseline: doing so threw
    // away every millisecond since the last frame, so tapping a speed button
    // silently lost time and broke the "never discard accumulated time" contract.
    // After a hidden-tab return it discarded the whole hidden interval, because no
    // frame had run to bank it first.
    const wasPaused = SPEEDS[this.speed] === 0;
    if (SPEEDS[speed] > 0) this.lastActiveTps = SPEEDS[speed];
    this.speed = speed;
    if (wasPaused) {
      // Resume must not replay whatever time passed while paused, so the baseline
      // moves to now. Without this, the first frame after unpausing would carry the
      // entire paused interval and jump the simulation forward.
      this.lastFrameMs = now();
    }
    this.emit(true);
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Read-only view for the UI. */
  snapshot(): Snapshot {
    return {
      day: dayOf(this.state.tick),
      period: periodOf(this.state.tick),
      tick: this.state.tick,
      seed: this.state.seed,
      rngCursor: this.state.rngCursor,
      elapsedMinutes: elapsedInGameMinutes(this.state.tick),
      eventsThisTick: this.eventsThisTick,
      logLength: this.state.log.length,
      speed: this.speed,
      backlogTicks: this.backlogTicks,
    };
  }

  subscribe(listener: (snapshot: Snapshot) => void): () => void {
    this.subscribers.add(listener);
    listener(this.snapshot());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameMs = now();
    this.handle = this.schedule(this.frame);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.handle !== null) this.cancel(this.handle);
    this.handle = null;
  }

  /**
   * Advance the simulation by one frame's worth of elapsed time.
   *
   * Public so the loop's behaviour can be tested directly with an explicit delta,
   * rather than only through a browser.
   */
  step(deltaMs: number): void {
    const tps = SPEEDS[this.speed];
    const result = advance(this.accumulatedMs, deltaMs, tps, MAX_TICKS_PER_FRAME);
    this.accumulatedMs = result.accumulatedMs;
    this.backlogTicks =
      tps > 0 ? result.backlogTicks : owedTicksAt(this.accumulatedMs, this.lastActiveTps);

    const before = this.state.log.length;
    for (let i = 0; i < result.ticksToRun; i += 1) {
      this.state = tick(this.state);
    }
    // Derived from the authoritative log's growth, so an event cannot be counted
    // twice or missed. There is no second event channel to drift out of step.
    this.eventsThisTick = this.state.log.length - before;
  }

  private frame = (timeMs: number): void => {
    if (!this.running) return;
    const deltaMs = Math.max(0, timeMs - this.lastFrameMs);
    this.lastFrameMs = timeMs;
    this.step(deltaMs);
    this.emit(false, timeMs);
    this.handle = this.schedule(this.frame);
  };

  private emit(force: boolean, timeMs = now()): void {
    if (!force && timeMs - this.lastNotifyMs < NOTIFY_INTERVAL_MS) return;
    this.lastNotifyMs = timeMs;
    const snapshot = this.snapshot();
    for (const listener of this.subscribers) listener(snapshot);
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

const defaultSchedule = (callback: (timeMs: number) => void): number =>
  requestAnimationFrame(callback);

const defaultCancel = (handle: number): void => {
  cancelAnimationFrame(handle);
};

export function createController(options: ControllerOptions = {}): Controller {
  return new Controller(options);
}