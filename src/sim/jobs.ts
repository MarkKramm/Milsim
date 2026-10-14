/**
 * Jobs — definitions, the work queue, and claim accounting.
 *
 * `GAME_DESIGN_BLUEPRINT.md` B3 and `SYSTEM_DEPENDENCIES.md` §3: Jobs owns
 * `jobs[]` — definitions, eligibility, progress, queues and assignment.
 *
 * Jobs **never writes a person field**. It asks `personnel.ts` for a change and
 * receives a new `Person` back (the request pattern, `SYSTEM_DEPENDENCIES.md` §3).
 *
 * ── Arrivals are this plan's own invention ──
 * `ROADMAP.md` requires jobs with "eligibility, duration, prerequisites,
 * outputs" and says nothing about where work comes from. Without a demand source
 * there is nothing for priority to allocate and the player control is inert, so a
 * cadence is required. It is the weakest available claim: fixed, jitter-free,
 * uniform, no new state and no new system. See `STAGE2_MASTER_PLAN.md` §4.10.
 */

import type { Role } from './personnel';

export type JobId = 'maintenance' | 'meals';

export interface Job {
  readonly id: JobId;
  readonly label: string;
  readonly facilityId: string;
  /** Fixture: 90 minutes maintenance, 30 minutes meal preparation. */
  readonly durationTicks: number;
  readonly eligibleRoles: readonly Role[];
  /**
   * Fixed cadence, or `null` for a **need-driven** job.
   *
   * Stage 2 gave meal preparation a fixed 8-tick arrival. Stage 3 replaces it with
   * production driven by the kitchen's target stock, because with arrivals on a
   * timer the larder fills without limit and hunger becomes decoration — the need
   * would be a bar that never does anything. Maintenance keeps a fixed cadence:
   * upkeep is not consumption, and modelling what makes maintenance *necessary*
   * belongs to Stage 7's item condition, not here.
   */
  readonly arrivalIntervalTicks: number | null;
  /** Jobs owns this. */
  nextArrivalTick: number;
  /**
   * **Unclaimed work orders waiting. Decremented when a worker claims one.**
   *
   * Not decremented on completion: doing that while several workers may claim the
   * same `pending > 0` permits phantom work and drives this negative. See
   * `STAGE2_MASTER_PLAN.md` §6.5.
   */
  pending: number;
}

/**
 * The Stage 2 job table.
 *
 * `arrivalIntervalTicks: null` on meal preparation is the only Stage 3 change here;
 * everything else is the Stage 2 fixture, preserved. See `DEFAULT_FOOD_TARGET` in
 * `commands.ts` for the stock level the kitchen works to, and
 * `RESOURCES_PER_REPAIR` in `resources.ts` for the supply cost.
 */
export const JOB_TABLE: readonly Omit<Job, 'nextArrivalTick' | 'pending'>[] = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    facilityId: 'workshop',
    durationTicks: 90,
    eligibleRoles: ['maintenance', 'generalist'],
    arrivalIntervalTicks: 20,
  },
  {
    id: 'meals',
    label: 'Meal preparation',
    facilityId: 'kitchen',
    durationTicks: 30,
    eligibleRoles: ['supply', 'generalist'],
    arrivalIntervalTicks: null, // need-driven
  },
];

/** Fresh queue state for a new run: nothing waiting, first order due at tick 0. */
export function createJobs(): Job[] {
  return JOB_TABLE.map((job) => ({ ...job, nextArrivalTick: 0, pending: 0 }));
}

/** Fixed job order, used wherever a stable iteration order is required. */
export const JOB_IDS: readonly JobId[] = ['maintenance', 'meals'];

/**
 * Phase 5 — work arrives.
 *
 * Consumes **no randomness**. Arrival jitter was proposed, measured, and removed:
 * the trade-off comes from the throughput-versus-demand mismatch, not from arrival
 * noise, so drawing here would have added RNG surface for no gameplay gain
 * (`STAGE2_MASTER_PLAN.md` §5.2).
 *
 * `onArrive` is called only when a queue goes from empty to non-empty, which is
 * what keeps `work_order_queued` to a small fraction of the 1,200 orders a
 * five-day run receives.
 */
export function runArrivals(
  jobs: readonly Job[],
  tick: number,
  onArrive: (jobId: JobId, pending: number) => void,
): void {
  for (const job of jobs) {
    // A need-driven job has no calendar; its demand is raised by phase 3 when
    // the kitchen finds the larder below target.
    if (job.arrivalIntervalTicks === null) continue;
    if (tick < job.nextArrivalTick) continue;
    const wasEmpty = job.pending === 0;
    job.pending += 1;
    job.nextArrivalTick = tick + job.arrivalIntervalTicks;
    if (wasEmpty) onArrive(job.id, job.pending);
  }
}

/** Can this role take this job at all? Eligibility, never rate or reliability. */
export function isEligible(job: Job, role: Role): boolean {
  return job.eligibleRoles.includes(role);
}

/**
 * The duty a role implies — selection ladder rule 3 (`B3` §3), which outranks
 * player intent. A generalist has no duty and falls through to rule 4.
 *
 * Returns `null` rather than a sentinel so the selection loop reads cleanly.
 */
export function dutyOf(role: Role): JobId | null {
  if (role === 'maintenance') return 'maintenance';
  if (role === 'supply') return 'meals';
  return null;
}

// ── Fixture arithmetic, asserted by the Stage 2 gate (ASSERT 8) ───────────────
// These are the preconditions that make the priority trade-off structural. They
// are exported so a test can assert them against the real constants in code
// rather than against a copy of the numbers.

/** In-game minutes in a day (`D4`). */
const TICKS_PER_DAY = 1440;

/** Worker-ticks the workforce can supply per day. */
export function dailyCapacityTicks(personCount: number): number {
  return personCount * TICKS_PER_DAY;
}

/**
 * Orders one facility could finish per day if every one of its slots were filled.
 * Maintenance: 4 slots x (1440/90) = 64. Meals: 4 x (1440/30) = 192.
 */
export function dailyServiceCeiling(facilityCapacity: number, durationTicks: number): number {
  return Math.floor((facilityCapacity * TICKS_PER_DAY) / durationTicks);
}

/** Orders of this job a run receives per day at the configured cadence. */
export function dailyArrivals(job: Pick<Job, 'arrivalIntervalTicks'>): number {
  return job.arrivalIntervalTicks === null ? 0 : TICKS_PER_DAY / job.arrivalIntervalTicks;
}