/**
 * Personnel — identity, and the only writer of person fields.
 *
 * `GAME_DESIGN_BLUEPRINT.md` B1 and `SYSTEM_DEPENDENCIES.md` §3: Personnel owns
 * `persons[].identity`, `.currentTask` and `.history`. This module is therefore
 * the only place in the simulation where a person field is constructed — Jobs
 * asks for a change and receives a new `Person` back, which is the request
 * pattern in `SYSTEM_DEPENDENCIES.md` §3.
 *
 * Deliberately narrow at Stage 2. `specialties` and `location` are listed in the
 * ownership table but are Stage 6 and derived-for-display respectively, and no
 * Stage 2 rule reads either. Storing a field nothing reads is the placeholder
 * this project repeatedly refuses (`STAGE1_PLAN_v4.md` §3).
 */

import type { JobId } from './jobs';

/** The eligibility key at Stage 2. B2's *rates and reliability* are Stage 6. */
export type Role = 'generalist' | 'maintenance' | 'supply';

/** One unit of work in hand. `progressTicks` is Personnel's field, not Jobs'. */
export interface ActiveTask {
  readonly jobId: JobId;
  readonly startedTick: number;
  readonly progressTicks: number;
  /** The literal rule citation — legibility lives here (B3 §9). */
  readonly reason: string;
  /**
   * The `task_started` event this task came from, so the completion can cite
   * its cause (invariant 6). Carried on the task rather than looked up later,
   * because the log grows and a scan per completion would be needless work.
   */
  readonly startedEventId: number;
}

export interface TaskRecord {
  readonly tick: number;
  readonly jobId: JobId;
  readonly outcome: 'completed';
}

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
  currentTask: ActiveTask | null;
  readonly history: TaskRecord[];
}

/** History depth is a Stage 4/6 concern (B1 §11); a short recent record is enough. */
const HISTORY_LIMIT = 12;

/**
 * The reference roster (`ROADMAP.md` §Stage 2 reference scenario): 3 generalists,
 * 2 maintenance-capable, 2 supply-capable.
 *
 * **The order of this array is part of the fixture.** Selection walks people in
 * ascending id, so reordering these roles changes who claims what and therefore
 * changes every measured result. The workload figures in
 * `STAGE2_MASTER_PLAN.md` §4A.3 were produced with exactly this order.
 */
export const FIXTURE_ROLES: readonly Role[] = [
  'maintenance',
  'maintenance',
  'supply',
  'generalist',
  'generalist',
  'generalist',
  'supply',
];

/**
 * Names come from this fixed list only. B1 §3: *"Names are fixed at creation
 * from the seeded RNG — never randomly generated outside it, or replay breaks."*
 * A pool of exactly seven guarantees every person can be told apart on a phone.
 */
const NAME_POOL = [
  'Bakary',
  'Osei',
  'Diallo',
  'Mensah',
  'Traore',
  'Kamara',
  'Ndiaye',
] as const;

/**
 * Hand out names from the pool, one per person, preserving person order.
 *
 * Seven draws, so the RNG cursor advances exactly seven times per run. Ranking
 * rather than indexing the pool directly is what guarantees the seven names are
 * distinct: an unlucky seed that drew the same value twice would otherwise put
 * two people on the roster with the same name, which is exactly the legibility
 * problem `ROADMAP.md`'s reading-load decision exists to avoid.
 *
 * Rank counts values strictly smaller, plus values equal to this one that come
 * earlier — a stable ordering, so a tie still produces a permutation rather than
 * a collision. Note the result is returned in *person* order: sorting the ranks
 * before mapping would hand every seed the same roster and make `seed`
 * decorative.
 *
 * @param draws One value in [0, 1) per person, in person order.
 */
export function assignNames(draws: readonly number[]): string[] {
  return draws.map((value, index) => {
    let rank = 0;
    for (let i = 0; i < draws.length; i += 1) {
      const other = draws[i];
      if (other === undefined) continue;
      if (other < value || (other === value && i < index)) rank += 1;
    }
    return NAME_POOL[rank] ?? NAME_POOL[0];
  });
}

/** Build a person with no task. History is never null — it is an empty list. */
export function createPerson(id: string, name: string, role: Role): Person {
  return { id, name, role, currentTask: null, history: [] };
}

/**
 * The seven-person reference roster, named from the seeded stream.
 *
 * `draws` must hold one value per person, in person order, taken from
 * `rng()` — the single entry point for simulation randomness (invariant 11). The
 * caller takes them, because only `rand()` may advance the cursor.
 */
export function buildRoster(draws: readonly number[]): Person[] {
  if (draws.length !== FIXTURE_ROLES.length) {
    throw new Error(`expected ${FIXTURE_ROLES.length} draws, got ${draws.length}`);
  }
  const names = assignNames(draws);
  return FIXTURE_ROLES.map((role, index) =>
    createPerson(`p${index + 1}`, names[index] ?? 'Unnamed', role),
  );
}

// ── The only writers of person fields ────────────────────────────────────────
// Each returns a new Person and leaves its input untouched, so the caller's
// previous state is never mutated (the same guarantee `draftOf` makes).

/**
 * Take on a task.
 *
 * The `ActiveTask` is frozen on the way in. `draftOf` copies each person with a
 * shallow spread, so `currentTask` is a **shared nested object** between a
 * state and its draft — the same aliasing that `events.ts` handles by freezing
 * events. Without the freeze, a write through a draft would reach back and
 * rewrite the previous state's task. Nothing does that today (`advanceTask`
 * builds a new object), but the guarantee should be structural rather than a
 * convention a future system has to remember. See the audit finding.
 */
export function claimTask(person: Person, task: ActiveTask): Person {
  return { ...person, currentTask: Object.freeze({ ...task }) };
}

/**
 * Advance the work in hand. Returns the person unchanged when they have no task,
 * so callers can pass every person without checking first.
 *
 * The new task is frozen for the same reason `claimTask` freezes its one: the
 * object replaces a frozen one, and an unfrozen replacement would quietly undo
 * the protection on the very next tick.
 */
export function advanceTask(person: Person): Person {
  if (person.currentTask === null) return person;
  const task = person.currentTask;
  const advanced = Object.freeze({ ...task, progressTicks: task.progressTicks + 1 });
  return { ...person, currentTask: advanced };
}

/**
 * Finish the work in hand and record it.
 *
 * Only one outcome exists at Stage 2. D6 requires a worker to finish or to
 * *explicitly abandon* a task, and abandonment has no cause here — facilities do
 * not degrade (Stage 7), nobody can be injured (Stage 6), and no schedule takes
 * anyone off duty (B5, Stage 3). The abandon branch is added when its first
 * trigger exists, rather than shipping an unreachable branch with a forfeit rule
 * nothing can exercise.
 */
export function completeTask(person: Person, tick: number): Person {
  if (person.currentTask === null) return person;
  const record: TaskRecord = {
    tick,
    jobId: person.currentTask.jobId,
    outcome: 'completed',
  };
  return {
    ...person,
    currentTask: null,
    history: [...person.history, record].slice(-HISTORY_LIMIT),
  };
}