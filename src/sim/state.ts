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
import type { Person } from './personnel';
import type { Job } from './jobs';
import type { Facility } from './facilities';
import type { Storage } from './storage';
import type { DeliveryState } from './delivery';
import { FIXTURE_ROLES, buildRoster } from './personnel';
import { createJobs } from './jobs';
import { FACILITIES } from './facilities';
import { INITIAL_STORAGE } from './storage';
import { createDelivery } from './delivery';
import { rand } from './rng';

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
  /** Stage 2 — Personnel owns every field inside. */
  personnel: Person[];
  /** Stage 2 — Jobs owns definitions, queues and arrival state. */
  jobs: Job[];
  /** Stage 2 — Facilities owns capacity. Written by Facilities alone. */
  facilities: Facility[];
  /**
   * Stage 3 — bulk stock. Storage owns it and nothing else may write it
   * (invariant 17). **Not** Stage 7's individual items, which are a different
   * system and remain guaranteed by D21.
   */
  storage: Storage;
  /** Stage 3 — the supply delivery schedule. */
  delivery: DeliveryState;
}

/**
 * A fresh run at tick 0, Day 1, Night.
 *
 * `log` starts empty and `nextEventId` at 0, so the first appended event is
 * id 0 — ids are sequential from the beginning rather than starting at 1 and
 * wasting an id for a thing that never existed.
 *
 * Stage 2 builds the seven-person reference roster and the two facilities here,
 * so a run is complete the moment it is made. Names are drawn from the seeded
 * stream, so `rngCursor` is **7** immediately after this call and never grows
 * again: nothing else in Stage 2 consumes randomness.
 */
export function createRun(seed: number): SimState {
  const state: SimState = {
    seed: seed >>> 0,
    rngCursor: 0,
    tick: 0,
    nextEventId: 0,
    log: [],
    pendingCommands: [],
    intent: [],
    personnel: [],
    jobs: createJobs(),
    facilities: FACILITIES.map((facility) => ({ ...facility })),
    storage: INITIAL_STORAGE,
    delivery: createDelivery(),
  };

  // Names come from the seeded stream and nowhere else (B1 §3). Drawing through
  // `rand()` — rather than calling the generator directly — is what keeps
  // invariant 11 true: the cursor advances in exactly one place.
  const draws: number[] = [];
  for (let i = 0; i < FIXTURE_ROLES.length; i += 1) draws.push(rand(state));
  state.personnel = buildRoster(draws);

  return state;
}

/**
 * Copy a state into a fresh object to be mutated inside a tick.
 *
 * ── The immutability rule ──
 *
 * > Everything reachable inside `SimState` is either frozen at creation or
 * > rebuilt immutably on every write. No object or array placed in state is ever
 * > mutated in place.
 *
 * This copy is therefore only *shallow*, and the rule is what makes a shallow
 * copy safe. Three separate defects have been found by breaking it, which is why
 * it is written down rather than left as a convention:
 *
 * - **Event objects.** Shared by a state and its draft on purpose, safe only
 *   because `emit()` freezes each one (`events.ts`). Found by the Stage 1 audit.
 * - **`persons[].currentTask`.** Shared and mutable. Stage 2 added the field
 *   without repeating the freeze; a write through a draft changed the earlier
 *   state's task. Fixed by freezing in `claimTask` and `advanceTask`.
 * - **`persons[].history`.** Shared array, unfrozen entries. The Stage 2 audit's
 *   follow-up proved a `push` through a draft lengthened the original's history
 *   and an entry write changed its `tick`. Fixed by freezing both in
 *   `completeTask`.
 *
 * Stage 3 adds `persons[].needs` and `storage`, both frozen for the same reason.
 * If you add a field, freeze it here or where it is built.
 *
 * Event *objects* inside `log` are still deliberately shared rather than cloned:
 * cloning an ever-growing log on every tick would be quadratic for no benefit,
 * since an appended event is never changed again — and they are frozen.
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
    personnel: state.personnel.map((person) => ({ ...person })),
    jobs: state.jobs.map((job) => ({ ...job })),
    facilities: state.facilities.map((facility) => ({ ...facility })),
    storage: { ...state.storage },
    delivery: { ...state.delivery },
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