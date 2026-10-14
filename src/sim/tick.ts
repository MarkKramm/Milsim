/**
 * The tick.
 *
 * One function, one linear body, never rearranged casually
 * (`ARCHITECTURE.md` §4). Ordering is the whole point: it decides what a system
 * can see, and it is the most common source of simulation bugs.
 *
 * Stage 2 implements **phases 0 and 5** — clock, commands, intent, then Jobs.
 * Phases 1–4 and 6–10 belong to systems that do not exist yet and are absent
 * rather than stubbed: an empty phase that runs nothing is indistinguishable
 * from a working one until the day it silently does the wrong thing.
 *
 * Phase numbers come from `SYSTEM_DEPENDENCIES.md` §4, which is authoritative.
 */

import { draftOf } from './state';
import type { SimState } from './state';
import { DAY_ROLLOVER, emit } from './events';
import { applyCommands } from './commands';
import { dayOf, isDayRollover } from './time';
import type { Job, JobId } from './jobs';
import { dutyOf, isEligible, runArrivals } from './jobs';
import type { Person } from './personnel';
import { advanceTask, claimTask, completeTask } from './personnel';
import { facilityById, hasFreeCapacity, occupancy } from './facilities';
import type { Facility } from './facilities';
import { readPriority, resolvePriority } from './priority';
import type { Priority } from './priority';

const WORK_ORDER_QUEUED = 'work_order_queued';
const TASK_STARTED = 'task_started';
const TASK_COMPLETED = 'task_completed';

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

  // Step 4 — apply intent (phase 0). Resolved into an order that job selection
  // reads; deliberately not stored as a derived value.
  const priority = readPriority(next.intent);
  const priorityOrder = resolvePriority(next.intent, next.jobs);

  // Phase 1 (Facilities) is absent at Stage 2: capacity is static, so there is
  // nothing for Facilities to write. It arrives at Stage 7 with item condition.

  // Step 5 — work arrives (phase 5). Consumes no randomness.
  runArrivals(next.jobs, next.tick, (jobId, pending) => {
    emit(next, {
      type: WORK_ORDER_QUEUED,
      tier: 'routine',
      subjects: [jobId],
      data: { pending },
    });
  });

  // Step 6 — job selection (phase 5). Ascending id, never random (B3 §3).
  selectWork(next, priorityOrder, priority);

  // Step 7 — advance job progress (phase 5). Completes in the same tick.
  advanceWork(next);

  return next;
}

// ── Phase 5 — selection ──────────────────────────────────────────────────────

/**
 * Give every idle person a job if one is claimable, in ascending id order.
 *
 * The ladder is `GAME_DESIGN_BLUEPRINT.md` B3 §3, evaluated in order:
 *   3. Duties (assigned role)      4. Player intent      5. Opportunity
 * Rules 1 (urgent needs) and 2 (recovery) are Stage 3 and do not exist here.
 *
 * `pending` is decremented **at claim**, not at completion. It is the
 * mutual-exclusion token that stops two workers taking the same order, so it
 * must be spent the moment the order is taken.
 */
function selectWork(draft: SimState, priorityOrder: readonly JobId[], priority: Priority): void {
  const jobs = jobIndex(draft.jobs);

  for (let i = 0; i < draft.personnel.length; i += 1) {
    const person = draft.personnel[i];
    if (person === undefined || person.currentTask !== null) continue;

    const claim = chooseClaim(
      person,
      jobs,
      draft.facilities,
      draft.personnel,
      priorityOrder,
      priority,
    );
    if (claim === null) continue; // Stands by; the roster reports why.

    const job = jobs.get(claim.jobId);
    if (job === undefined) continue;

    job.pending -= 1;
    const event = emit(draft, {
      type: TASK_STARTED,
      tier: 'routine',
      subjects: [person.id, claim.jobId, job.facilityId],
      data: { reason: claim.reason },
    });
    draft.personnel[i] = claimTask(person, {
      jobId: claim.jobId,
      startedTick: draft.tick,
      progressTicks: 0,
      reason: claim.reason,
      startedEventId: event.id,
    });
  }
}

interface Claim {
  jobId: JobId;
  reason: string;
}

/**
 * Decide what one idle person does, and say why in words the player can read.
 *
 * The reason string is the feature, not a nicety: gate evidence item 1 is *"you
 * can explain what happened without reading the source code"*, and B3 §9 says a
 * literal rule beats "selected job #3".
 */
function chooseClaim(
  person: Person,
  jobs: ReadonlyMap<JobId, Job>,
  facilities: readonly Facility[],
  personnel: readonly Person[],
  priorityOrder: readonly JobId[],
  priority: Priority,
): Claim | null {
  const hasWork = (jobId: JobId): boolean => {
    const job = jobs.get(jobId);
    return job !== undefined && job.pending > 0;
  };
  const hasRoom = (jobId: JobId): boolean => {
    const job = jobs.get(jobId);
    if (job === undefined) return false;
    return hasFreeCapacity(facilityById(facilities, job.facilityId), personnel);
  };

  // Rule 3 — duties. A specialist's own work outranks the player's priority,
  // which is why the two maintenance-capable people are unaffected by it.
  const duty = dutyOf(person.role);
  if (duty !== null && hasWork(duty) && hasRoom(duty)) {
    return { jobId: duty, reason: `on duty: ${labelOf(jobs, duty)}` };
  }

  // Rule 4 — player intent.
  for (const jobId of priorityOrder) {
    const job = jobs.get(jobId);
    if (job === undefined) continue;
    if (!isEligible(job, person.role)) continue;
    if (!hasWork(jobId)) continue;
    if (!hasRoom(jobId)) continue;
    return { jobId, reason: reasonFor(priority, jobs, jobId) };
  }

  return null; // Rule 5 — opportunity: nothing left, so they stand by.
}

/** `maintenance-first` reads "Maintenance first puts maintenance ahead". */
function reasonFor(priority: Priority, jobs: ReadonlyMap<JobId, Job>, jobId: JobId): string {
  const label = labelOf(jobs, jobId);
  if (priority === 'balanced') return `Balanced: ${label} queue is deeper`;
  return `${priority} puts ${label} ahead`;
}

function labelOf(jobs: ReadonlyMap<JobId, Job>, jobId: JobId): string {
  const job = jobs.get(jobId);
  return job === undefined ? jobId : job.label.toLowerCase();
}

/** Map for lookup by id, built once per selection pass. */
function jobIndex(jobs: readonly Job[]): Map<JobId, Job> {
  const index = new Map<JobId, Job>();
  for (const job of jobs) index.set(job.id, job);
  return index;
}

// ── Phase 5 — progress ───────────────────────────────────────────────────────

/**
 * Advance the work in hand by one tick of progress; complete what is finished.
 *
 * Completion decrements **nothing** — `pending` was already spent when the order
 * was claimed.
 */
function advanceWork(draft: SimState): void {
  for (let i = 0; i < draft.personnel.length; i += 1) {
    const person = draft.personnel[i];
    if (person === undefined || person.currentTask === null) continue;

    const task = person.currentTask;
    const job = draft.jobs.find((candidate) => candidate.id === task.jobId);
    if (job === undefined) continue;

    draft.personnel[i] = advanceTask(person);
    if (task.progressTicks + 1 < job.durationTicks) continue;

    emit(draft, {
      type: TASK_COMPLETED,
      tier: 'notable',
      subjects: [person.id, task.jobId],
      causeEventIds: [task.startedEventId],
      data: { ticks: job.durationTicks },
    });
    draft.personnel[i] = completeTask(person, draft.tick);
  }
}

// ── Derived, for display only ────────────────────────────────────────────────

/**
 * Why an idle person is standing by, for the roster.
 *
 * Derived on read and never stored — the same rule that keeps `readiness` out of
 * state (invariant 12's spirit).
 *
 * Three distinct situations, and conflating them was a real defect: a person who
 * has just finished a task is idle only until the *next* tick's selection pass,
 * so their work may well be claimable right now. Reporting "nothing claimable"
 * for that is simply false — measured over five days it mislabelled 83% of idle
 * person-ticks — and a roster that lies is the opposite of what this stage is
 * for. An audit of the reference run found the misleading line was the single
 * most common reason the roster displayed.
 *
 * @param jobs `pending` is *unclaimed* work, so anything above zero means real
 *             work is waiting somewhere.
 */
export function standbyReason(
  person: Person,
  jobs: readonly Job[],
  facilities: readonly Facility[],
  personnel: readonly Person[],
): string {
  const eligible = jobs.filter((job) => isEligible(job, person.role));

  // Capacity is the only reason an eligible worker cannot start despite work
  // waiting. Report the facility, because "why is nobody on meals?" is answered
  // by the kitchen being full, not by the worker.
  const blocked = eligible.find(
    (job) =>
      job.pending > 0 &&
      !hasFreeCapacity(facilityById(facilities, job.facilityId), personnel),
  );
  if (blocked !== undefined) {
    const facility = facilityById(facilities, blocked.facilityId);
    const used = occupancy(facility, personnel);
    return `${facility.label} is at capacity ${used}/${facility.capacity}`;
  }

  // Work is waiting and there is room, so this person is idle only because
  // selection has not run since their last task ended. Saying so is honest and
  // is the truth of the phase order: progress (phase 5) releases a task, and the
  // next selection pass (also phase 5, next tick) hands out new work.
  if (jobs.some((job) => job.pending > 0)) {
    return 'finished a task — picking work up next tick';
  }

  return 'no work waiting — standing by';
}

/** How many of a facility's slots are in use right now. Derived, never stored. */
export function capacityUsed(facility: Facility, persons: readonly Person[]): number {
  return occupancy(facility, persons);
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