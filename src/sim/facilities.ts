/**
 * Facilities — rooms, and the capacity limits that make contention visible.
 *
 * `GAME_DESIGN_BLUEPRINT.md` D2 and `SYSTEM_DEPENDENCIES.md` §3: Facilities owns
 * `facilities[]`, `.capacity` and `.availability`. **Facilities is written by
 * Facilities alone.**
 *
 * At Stage 2 the facility phase is **absent rather than stubbed**
 * (`STAGE1_PLAN_v4.md` §3): capacity is static, so there is nothing for a phase
 * to write, and an empty phase that runs nothing is indistinguishable from a
 * working one until the day it silently does the wrong thing. The phase is added
 * at Stage 7, when item condition can make a facility unavailable (D2 §11).
 *
 * No degradation here. Condition is Stage 7, and wear would have no driver:
 * degradation requires use, and use is applied by Items — also Stage 7
 * (invariant 16, *"Only Items writes items[].condition"*).
 */

import type { JobId } from './jobs';
import type { Person } from './personnel';

export interface Facility {
  readonly id: string;
  readonly label: string;
  /** The Stage 2 fixture value. See `STAGE2_MASTER_PLAN.md` §4.1, Decision A1. */
  readonly capacity: number;
  readonly servesJobId: JobId;
}

/**
 * The two Stage 2 facilities, capacity 4 each (`ROADMAP.md` §Stage 2 reference
 * scenario, adjusted — see `STAGE2_MASTER_PLAN.md` §4.1).
 */
export const FACILITIES: readonly Facility[] = [
  { id: 'workshop', label: 'Workshop', capacity: 4, servesJobId: 'maintenance' },
  { id: 'kitchen', label: 'Kitchen', capacity: 4, servesJobId: 'meals' },
];

/**
 * How many people are currently working in this facility.
 *
 * **Derived, never stored.** A stored occupancy count would be a second copy of
 * the truth that could drift from `persons[]`, which is precisely the duplicated
 * logic `SYSTEM_DEPENDENCIES.md` exists to prevent.
 */
export function occupancy(facility: Facility, persons: readonly Person[]): number {
  let count = 0;
  for (const person of persons) {
    if (person.currentTask !== null && facility.servesJobId === person.currentTask.jobId) count += 1;
  }
  return count;
}

/**
 * A read-only predicate, exposed for the request pattern in
 * `SYSTEM_DEPENDENCIES.md` §3: Jobs asks whether a facility has room; Jobs never
 * writes to it.
 */
export function hasFreeCapacity(facility: Facility, persons: readonly Person[]): boolean {
  return occupancy(facility, persons) < facility.capacity;
}

/** Look up a facility by id. Throws rather than returning undefined, because a
 *  job whose facility is missing is a programming error, not a game state. */
export function facilityById(facilities: readonly Facility[], id: string): Facility {
  const found = facilities.find((f) => f.id === id);
  if (found === undefined) throw new Error(`no facility with id "${id}"`);
  return found;
}