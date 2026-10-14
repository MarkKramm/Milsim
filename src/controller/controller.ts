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

import { tick, standbyReason, capacityUsed } from '../sim/tick';
import { createRun } from '../sim/state';
import type { SimState } from '../sim/state';
import { dayOf, elapsedInGameMinutes, periodOf } from '../sim/time';
import { DEFAULT_SEED } from '../sim/rng';
import { enqueue } from '../sim/commands';
import type { Command } from '../sim/commands';
import { readPriority, isPriority } from '../sim/priority';
import type { Priority } from '../sim/priority';
import { MAX_TICKS_PER_FRAME, SPEEDS, advance, owedTicksAt } from './timeline';
import type { SpeedName } from './timeline';

/** One roster row: who, what, and why. All derived, none stored. */
export interface RosterEntry {
  id: string;
  name: string;
  role: string;
  task: string;
  reason: string;
  progressTicks: number;
  durationTicks: number;
  standby: boolean;
}

/** One facility card: how full it is, and how much work is waiting. */
export interface FacilityEntry {
  id: string;
  label: string;
  capacity: number;
  used: number;
  pending: number;
  jobLabel: string;
}

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
  /** Stage 2 — the roster and the facility cards. */
  priority: Priority;
  roster: RosterEntry[];
  facilities: FacilityEntry[];
  /** Counts by type, so the player can see what the base has been doing. */
  completedToday: Record<string, number>;
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

  /** Read-only view for the UI. Everything here is derived on read. */
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
      priority: readPriority(this.state.intent),
      roster: this.roster(),
      facilities: this.state.facilities.map((facility) => ({
        id: facility.id,
        label: facility.label,
        capacity: facility.capacity,
        used: capacityUsed(facility, this.state.personnel),
        pending:
          this.state.jobs.find((job) => job.facilityId === facility.id)?.pending ?? 0,
        jobLabel:
          this.state.jobs.find((job) => job.facilityId === facility.id)?.label ?? '',
      })),
      completedToday: this.completedByType(),
    };
  }

  /**
   * Issue a command.
   *
   * Commands go through the queue and are applied at the next tick step 2, so a
   * change issued now takes effect on the next tick — never mid-tick, never
   * twice, never lost (`GAME_DESIGN_BLUEPRINT.md` A4). The controller appends;
   * it never writes simulation state directly.
   */
  issue(command: Command): void {
    this.state = enqueue(this.state, command);
  }

  /**
   * Set the work priority. Stage 2's entire player command surface.
   *
   * Rejects an unknown value here rather than sending it, so the interface never
   * offers a control the simulation cannot honour. The simulation rejects
   * unknown commands too — this is the first of two lines of defence, not a
   * replacement for the second.
   */
  setPriority(value: Priority): void {
    if (!isPriority(value)) return;
    this.issue({ type: 'set_priority', value });
  }

  /** Build the roster for display. Derived, never written into state. */
  private roster(): RosterEntry[] {
    return this.state.personnel.map((person) => {
      const task = person.currentTask;
      const job =
        task === null
          ? undefined
          : this.state.jobs.find((candidate) => candidate.id === task.jobId);

      return {
        id: person.id,
        name: person.name,
        role: person.role,
        task: job?.label ?? 'Standby',
        reason:
          task === null
            ? standbyReason(person, this.state.jobs, this.state.facilities, this.state.personnel)
            : task.reason,
        progressTicks: task?.progressTicks ?? 0,
        durationTicks: job?.durationTicks ?? 0,
        standby: task === null,
      };
    });
  }

  /**
   * Completions so far this run, by job type.
   *
   * Read from the log rather than counted separately, so an event cannot be
   * missed or counted twice — the same rule the Stage 1 log-growth counter uses.
   */
  private completedByType(): Record<string, number> {
    const counts: Record<string, number> = { maintenance: 0, meals: 0 };
    for (const event of this.state.log) {
      if (event.type !== 'task_completed') continue;
      const jobId = event.subjects[1];
      if (jobId === undefined) continue;
      counts[jobId] = (counts[jobId] ?? 0) + 1;
    }
    return counts;
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