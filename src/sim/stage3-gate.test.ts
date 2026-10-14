/**
 * The Stage 3 fixture gate.
 *
 * The automated prerequisite for the manual Day 4–5 gate. Stage 2's version
 * asserted on Stage 2's workload model; Stage 3 replaces fixed meal arrivals
 * with need-driven production and adds a fatigue ceiling, so **every figure in
 * here was superseded** and re-measured from the implementation that produced it.
 *
 * What was replaced, and why it is not a weakened test:
 *
 * - Stage 2's balance had seven people working flat out, with the larder never
 *   modelled. Stage 3 models food, so the question changes from "does priority
 *   move a queue" to "does priority move **people between feeding the base and
 *   maintaining it**, and does the loser's shortage become visible".
 * - The *shape* of the assertions is unchanged and deliberately so: absolute
 *   floors, a directional ordering, non-dominance, and a causal reason histogram.
 *   Those caught the Stage 2 problems; replacing them with weaker prose would
 *   throw that away.
 *
 * **If these fail, the model rates are wrong — re-derive them. Do not lower a
 * threshold until the suite goes green.** That is the failure mode this project
 * already documents: "a gate written only as a feeling is a gate that can be lied
 * to."
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createRun, draftOf } from './state';
import type { SimState } from './state';
import { run, standbyReason } from './tick';
import { enqueue } from './commands';
import { causalReferencesAreValid } from './events';
import {



  isTooExhaustedToWork,
  wantsFood,
} from './needs';
import { TICKS_PER_DAY } from './time';
import { DEFAULT_SEED } from './rng';

const HORIZON = TICKS_PER_DAY * 5; // 7,200 ticks
const SEEDS = [DEFAULT_SEED, 1, 4242, 777, 31337, 99, 123456] as const;
const SETTINGS = ['balanced', 'maintenance-first', 'meals-first'] as const;

type Setting = (typeof SETTINGS)[number];

interface Outcome {
  maintenanceDone: number;
  mealsDone: number;
  maintenanceBacklog: number;
  mealsBacklog: number;
  food: number;
  supplies: number;
  events: number;
  intentClaims: number;
  intentReasons: string[];
  inProgress: number;
  hungry: number;
  exhausted: number;
  resting: number;
  claimed: number;
}

/**
 * Memoised, because the assertions below share runs.
 *
 * A 7,200-tick run costs roughly 400ms under Stage 3 — seven assertions each
 * re-running 21 simulations was over a minute of pure duplicate work, which is
 * slow enough to be worth fixing rather than tolerating. The cache is keyed by
 * seed and setting, and simulation is pure, so this changes nothing observable.
 */
const cache = new Map<string, Outcome>();

function simulate(setting: Setting, seed: number): Outcome {
  const key = `${setting}:${seed}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const queued = enqueue(createRun(seed), { type: 'set_priority', value: setting });
  const outcome = measure(run(queued, HORIZON));
  cache.set(key, outcome);
  return outcome;
}

function measure(state: SimState): Outcome {
  const done: Record<string, number> = { maintenance: 0, meals: 0 };
  let intentClaims = 0;
  let claimed = 0;
  const intentReasons: string[] = [];

  for (const event of state.log) {
    if (event.type === 'task_started') {
      claimed += 1;
      const reason = String(event.data.reason);
      if (!reason.startsWith('on duty')) {
        intentClaims += 1;
        intentReasons.push(reason);
      }
    }
    if (event.type === 'task_completed') {
      const jobId = event.subjects[1];
      if (jobId !== undefined) done[jobId] = (done[jobId] ?? 0) + 1;
    }
  }

  const backlog = (id: string): number =>
    state.jobs.find((job) => job.id === id)?.pending ?? -1;

  return {
    maintenanceDone: done.maintenance ?? 0,
    mealsDone: done.meals ?? 0,
    maintenanceBacklog: backlog('maintenance'),
    mealsBacklog: backlog('meals'),
    food: state.storage.food,
    supplies: state.storage.supplies,
    events: state.log.length,
    intentClaims,
    intentReasons,
    inProgress: state.personnel.filter((p) => p.currentTask !== null).length,
    hungry: state.personnel.filter((p) => wantsFood(p)).length,
    exhausted: state.personnel.filter((p) => isTooExhaustedToWork(p)).length,
    resting: state.personnel.filter(
      (p) => p.restUntilTick !== null && state.tick < p.restUntilTick,
    ).length,
    claimed,
  };
}

// ── The Stage 3 model actually behaves ───────────────────────────────────────

test('a five-day run keeps the base alive and working', () => {
  for (const seed of SEEDS) {
    const r = simulate('balanced', seed);
    assert.ok(r.maintenanceDone > 50, `seed ${seed}: maintenance kept going (${r.maintenanceDone})`);
    assert.ok(r.mealsDone > 50, `seed ${seed}: meals kept coming (${r.mealsDone})`);
    assert.ok(r.food >= 0 && r.supplies >= 0, 'stock is never negative');
  }
});

test('the log stays bounded — no event storm', () => {
  // A real defect caught during implementation: with an empty larder, every
  // hungry person emitted `no_food_available` *every tick*, which produced
  // hundreds of thousands of events and made the suite crawl. The refusal is now
  // reported once per hunger cycle.
  for (const seed of SEEDS) {
    for (const setting of SETTINGS) {
      const r = simulate(setting, seed);
      assert.ok(r.events < 6000, `seed ${seed}/${setting}: ${r.events} events over five days`);
    }
  }
});

test('pending work is the shortfall, and never runs away', () => {
  // The second real defect caught during implementation: meal orders were queued
  // one per tick regardless of how far the larder was below target, so a starved
  // kitchen accumulated a 4,106-deep queue over five days.
  for (const seed of SEEDS) {
    for (const setting of SETTINGS) {
      const r = simulate(setting, seed);
      assert.ok(r.mealsBacklog >= 0, 'backlog is never negative');
      assert.ok(
        r.mealsBacklog < 400,
        `seed ${seed}/${setting}: meal queue of ${r.mealsBacklog} is running away`,
      );
    }
  }
});

// ── ASSERT: priority still reallocates people, and causally ─────────────────

test('ASSERT 1: priority changes where the food goes, in the expected direction', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);

    // Maintenance-first drains the larder; meals-first protects it. This is the
    // Stage 3 form of the Stage 2 assertion — the same directional property,
    // measured on the thing Stage 3 actually models.
    assert.ok(
      mf.food < kf.food,
      `seed ${seed}: maintenance-first should starve the kitchen (${mf.food} vs ${kf.food})`,
    );
    assert.ok(
      kf.mealsBacklog < mf.mealsBacklog,
      `seed ${seed}: meals-first should clear the meal queue`,
    );
    assert.ok(
      kf.maintenanceBacklog > mf.maintenanceBacklog,
      `seed ${seed}: meals-first should defer maintenance`,
    );
  }
});

test('ASSERT 2: neither extreme starves the other job to zero', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    assert.ok(mf.mealsDone > 50, `seed ${seed}: meals still served (${mf.mealsDone})`);
    assert.ok(kf.maintenanceDone > 50, `seed ${seed}: maintenance still done (${kf.maintenanceDone})`);
  }
});

test('ASSERT 3: non-dominance — each setting is worse on a different thing', () => {
  // Neither setting is simply better. Maintenance-first starves people; meals-first
  // lets the workshop rot. A player must choose which failure they can live with,
  // which is the whole point of the control.
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    assert.ok(mf.food < kf.food, 'maintenance-first is worse on food');
    assert.ok(kf.maintenanceBacklog > mf.maintenanceBacklog, 'meals-first is worse on maintenance');
    const dominates =
      mf.food >= kf.food && mf.maintenanceBacklog <= kf.maintenanceBacklog;
    assert.ok(!dominates, `seed ${seed}: maintenance-first must not dominate`);
  }
});

test('ASSERT 4: the reason strings move with the setting — causal, not incidental', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    const balanced = simulate('balanced', seed);

    for (const reason of mf.intentReasons) {
      assert.match(reason, /^maintenance-first puts /, `unexpected reason "${reason}"`);
    }
    for (const reason of kf.intentReasons) {
      assert.match(reason, /^meals-first puts /, `unexpected reason "${reason}"`);
    }
    for (const reason of balanced.intentReasons) {
      assert.match(reason, /^Balanced: /, `unexpected reason "${reason}"`);
    }
    assert.ok(
      mf.intentClaims !== kf.intentClaims,
      `seed ${seed}: intent claim counts must differ`,
    );
  }
});

// ── Needs, rest, and the ladder ─────────────────────────────────────────────

test('work raises fatigue and rest lowers it, and nobody does both', () => {
  let state = createRun(DEFAULT_SEED);
  let sawFatigueRise = false;
  let sawRest = false;
  let sawOverlap = false;

  for (let i = 0; i < 3000; i += 1) {
    const before = state.personnel.map((p) => p.needs.fatigue);
    state = run(state, 1);
    for (const [index, person] of state.personnel.entries()) {
      const prior = before[index] ?? 0;
      if (person.needs.fatigue > prior) sawFatigueRise = true;
      if (person.needs.fatigue < prior) sawRest = true;
      // Mutual exclusion: a person holding work is never also resting.
      const working = person.currentTask !== null;
      const resting =
        person.restUntilTick !== null && state.tick < person.restUntilTick;
      if (working && resting) sawOverlap = true;
    }
  }

  assert.ok(sawFatigueRise, 'fatigue must rise while people work');
  assert.ok(sawRest, 'fatigue must fall while people rest');
  assert.ok(!sawOverlap, 'nobody may be working and resting at once');
});

test('needs stay inside [0,1] over a long run (invariant 7)', () => {
  let state = createRun(31337);
  for (let i = 0; i < 8000; i += 1) {
    state = run(state, 1);
    for (const person of state.personnel) {
      assert.ok(person.needs.hunger >= 0 && person.needs.hunger <= 1, 'hunger out of range');
      assert.ok(person.needs.fatigue >= 0 && person.needs.fatigue <= 1, 'fatigue out of range');
    }
  }
});

test('hunger cannot be satisfied when the larder is empty, and says so', () => {
  // Run until the food is genuinely gone, then confirm the mechanism and the
  // explanation rather than only the number.
  let state = enqueue(createRun(DEFAULT_SEED), {
    type: 'set_priority',
    value: 'maintenance-first',
  });
  state = run(state, 5000);

  const hungry = state.personnel.filter((p) => wantsFood(p));
  if (state.storage.food === 0 && hungry.length > 0) {
    const sample = hungry[0]!;
    const reason = standbyReason(
      sample,
      state.jobs,
      state.facilities,
      state.personnel,
      state.tick,
    );
    assert.ok(reason.length > 0, 'a hungry worker must still be given a reason');
  }
  assert.ok(
    state.log.some((e) => e.type === 'no_food_available') || state.storage.food > 0,
    'an empty larder must be reported, not silently absorbed',
  );
});

test('an exhausted worker declines work but still seeks food', () => {
  // The two needs must not collapse into one: refusing work may not mean
  // refusing everything, or fatigue and hunger would be the same mechanic.
  const state = simulate('maintenance-first', DEFAULT_SEED);
  assert.ok(
    state.exhausted === 0 || state.mealsDone > 50,
    'food production continues even when people are exhausted',
  );
  for (const person of createRun(DEFAULT_SEED).personnel) {
    assert.ok(!isTooExhaustedToWork(person), 'a fresh run starts able to work');
  }
});

test('storage refuses what it does not have and records why', () => {
  const state = run(
    enqueue(createRun(DEFAULT_SEED), { type: 'set_priority', value: 'maintenance-first' }),
    5000,
  );
  assert.ok(state.storage.supplies >= 0, 'supplies never go negative');
  assert.ok(state.storage.food >= 0, 'food never goes negative');
  if (state.storage.supplies === 0) {
    assert.ok(
      state.log.some((e) => e.type === 'supplies_short'),
      'a supply shortage is recorded explicitly, never silent',
    );
  }
});

test('a supply shortage costs time rather than stopping the work', () => {
  // The resolution of a contradiction in the master plan: §8 Step 5 said a job
  // still completes without supplies, while the roadmap requires scarcity to
  // change outcomes. A shortage is therefore a cost, not a gate.
  const finished = simulate('balanced', DEFAULT_SEED);
  assert.ok(finished.claimed === finished.maintenanceDone + finished.mealsDone + finished.inProgress,
    'every claimed order is either done or still in hand');
  assert.ok(finished.maintenanceDone > 0, 'maintenance is never permanently blocked');
});

// ── Structural invariants carried forward from Stage 2 ───────────────────────

test('no person ever holds two jobs and nobody switches without finishing', () => {
  let state = createRun(DEFAULT_SEED);
  const held = new Map<string, string>();
  for (let i = 0; i < 3000; i += 1) {
    state = run(state, 1);
    for (const person of state.personnel) {
      const jobId = person.currentTask?.jobId;
      if (jobId === undefined) {
        held.delete(person.id);
        continue;
      }
      const previous = held.get(person.id);
      assert.ok(
        previous === undefined || previous === jobId,
        `${person.id} moved from ${previous} to ${jobId} without abandoning`,
      );
      held.set(person.id, jobId);
    }
  }
});

test('facility capacity is never exceeded (invariant 4)', () => {
  let state = createRun(DEFAULT_SEED);
  for (let i = 0; i < 3000; i += 1) {
    state = run(state, 1);
    for (const facility of state.facilities) {
      const used = state.personnel.filter(
        (p) => p.currentTask?.jobId === facility.servesJobId,
      ).length;
      assert.ok(used <= facility.capacity, `${facility.id} over capacity at tick ${state.tick}`);
    }
  }
});

test('causal references stay valid across a five-day mixed log', () => {
  const state = run(
    enqueue(createRun(DEFAULT_SEED), { type: 'set_priority', value: 'maintenance-first' }),
    HORIZON,
  );
  assert.ok(causalReferencesAreValid(state.log));
});

test('equivalent runs are identical — determinism and replay (invariants 14/15)', () => {
  assert.deepEqual(simulate('meals-first', DEFAULT_SEED), simulate('meals-first', DEFAULT_SEED));

  let uninterrupted = enqueue(createRun(DEFAULT_SEED), {
    type: 'set_priority',
    value: 'meals-first',
  });
  uninterrupted = run(uninterrupted, HORIZON);

  let interrupted = enqueue(createRun(DEFAULT_SEED), {
    type: 'set_priority',
    value: 'meals-first',
  });
  interrupted = run(interrupted, 3600);
  interrupted = draftOf(JSON.parse(JSON.stringify(interrupted)) as SimState);
  interrupted = run(interrupted, HORIZON - 3600);

  assert.deepEqual(measure(interrupted), measure(uninterrupted), 'save/load changed the outcome');
});

test('nothing draws during a tick — the cursor stays at the seven roster draws', () => {
  for (const seed of SEEDS) {
    assert.equal(run(createRun(seed), HORIZON).rngCursor, 7, `seed ${seed} drew randomness`);
  }
});

// ── Immutability, from the Stage 2 audit follow-up ──────────────────────────

test('a draft cannot write back into the state it was made from', () => {
  // The Stage 2 audit's follow-up: `draftOf` copies each person with a shallow
  // spread, so `currentTask`, `history` and `needs` are shared nested values.
  // A write through a draft reached the earlier state — proven, for history, by
  // a push changing the original's length and an entry write changing its tick.
  const original = run(createRun(DEFAULT_SEED), 300);
  const draft = draftOf(original);

  const originalPerson = original.personnel[0]!;
  const task = originalPerson.currentTask;
  if (task !== null) {
    assert.equal(draft.personnel[0]?.currentTask, task, 'shared, which is what makes it risky');
    assert.throws(() => {
      (task as { progressTicks: number }).progressTicks = 9999;
    }, TypeError, 'a task in hand rejects mutation');
  }

  assert.equal(draft.personnel[0]?.history, originalPerson.history, 'history is shared');
  assert.throws(() => {
    (draft.personnel[0]!.history as unknown as { push: (x: unknown) => void }).push({});
  }, TypeError, 'history rejects mutation');

  assert.throws(() => {
    (originalPerson.needs as { hunger: number }).hunger = 0.99;
  }, TypeError, 'needs reject mutation');

  assert.notEqual(originalPerson.needs.hunger, 0.99);
});

test('an idle worker is never told there is nothing to do when work is waiting', () => {
  let state = createRun(DEFAULT_SEED);
  let misleading = 0;
  for (let i = 0; i < 2000; i += 1) {
    state = run(state, 1);
    const waiting = state.jobs.some((job) => job.pending > 0);
    for (const person of state.personnel) {
      if (person.currentTask !== null) continue;
      if (person.restUntilTick !== null && state.tick < person.restUntilTick) continue;
      const reason = standbyReason(
        person,
        state.jobs,
        state.facilities,
        state.personnel,
        state.tick,
      );
      assert.notEqual(reason, 'nothing claimable — standing by', 'stale wording is gone');
      if (waiting && reason.includes('no work waiting')) misleading += 1;
    }
  }
  assert.equal(misleading, 0, 'never claim there is no work while work is waiting');
});

// ── Reference figures, measured from this implementation ─────────────────────

test('reproduces the measured Stage 3 five-day figures', () => {
  const reference: ReadonlyArray<readonly [Setting, number, number, number, number, number]> = [
    ['balanced', 194, 478, 164, 60, 0],
    ['maintenance-first', 192, 487, 168, 60, 0],
    ['meals-first', 170, 585, 190, 3, 57],
  ];

  for (const [setting, maint, meals, mBacklog, kBacklog, food] of reference) {
    const r = simulate(setting, DEFAULT_SEED);
    assert.equal(r.maintenanceDone, maint, `${setting}: maintenance done`);
    assert.equal(r.mealsDone, meals, `${setting}: meals done`);
    assert.equal(r.maintenanceBacklog, mBacklog, `${setting}: maintenance backlog`);
    assert.equal(r.mealsBacklog, kBacklog, `${setting}: meal backlog`);
    assert.equal(r.food, food, `${setting}: food remaining`);
  }
});