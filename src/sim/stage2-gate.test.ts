/**
 * The Stage 2 fixture gate.
 *
 * The automated prerequisite for the manual Day 4–5 gate
 * (`ROADMAP.md` §Gate evidence). It exists because the earlier form of this gate
 * asserted on proxy quantities — "at least one measure differs" — which cannot
 * distinguish *priority caused this* from *something else moved*.
 *
 * Every assertion here is either an absolute floor derived from the measured
 * reference, or a causal claim about the reason strings. The reference figures
 * were produced by a standalone model of these rules outside the repository and
 * are labelled `[M]` throughout the master plan; this file is where the real
 * implementation is required to reproduce them.
 *
 * **If these fail, the balance is wrong — re-derive it. Do not lower the
 * thresholds until the suite goes green.** That is the failure mode this project
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
import { FACILITIES } from './facilities';
import {
  JOB_TABLE,
  dailyArrivals,
  dailyCapacityTicks,
  dailyServiceCeiling,
} from './jobs';
import type { JobId } from './jobs';
import { DEFAULT_SEED } from './rng';
import { TICKS_PER_DAY } from './time';

const HORIZON = TICKS_PER_DAY * 5; // 7,200 ticks
const SEEDS = [20260101, 1, 4242, 777, 31337, 99, 123456] as const;

interface Outcome {
  maintenanceDone: number;
  mealsDone: number;
  maintenanceBacklog: number;
  mealsBacklog: number;
  events: number;
  dutyClaims: number;
  intentClaims: number;
  intentReasons: string[];
  arrivals: number;
  claims: number;
  inProgress: number;
}

function simulate(priority: string, seed: number): Outcome {
  const queued = enqueue(createRun(seed), { type: 'set_priority', value: priority });
  return measure(run(queued, HORIZON));
}

function measure(state: SimState): Outcome {
  const done: Record<string, number> = { maintenance: 0, meals: 0 };
  let dutyClaims = 0;
  let intentClaims = 0;
  const intentReasons: string[] = [];
  let arrivals = 0;
  let claims = 0;

  for (const event of state.log) {
    if (event.type === 'work_order_queued') arrivals += 1;
    if (event.type === 'task_started') {
      claims += 1;
      const reason = String(event.data.reason);
      if (reason.startsWith('on duty')) dutyClaims += 1;
      else {
        intentClaims += 1;
        intentReasons.push(reason);
      }
    }
    if (event.type === 'task_completed') {
      const jobId = event.subjects[1];
      if (jobId !== undefined) done[jobId] = (done[jobId] ?? 0) + 1;
    }
  }

  const backlog = (id: JobId): number =>
    state.jobs.find((job) => job.id === id)?.pending ?? -1;

  // Every claimed order is either finished or still in hand: `pending` is spent
  // at claim, so nothing can be claimed and then vanish.
  const inProgress = state.personnel.filter((p) => p.currentTask !== null).length;

  return {
    maintenanceDone: done.maintenance ?? 0,
    mealsDone: done.meals ?? 0,
    maintenanceBacklog: backlog('maintenance'),
    mealsBacklog: backlog('meals'),
    events: state.log.length,
    dutyClaims,
    intentClaims,
    intentReasons,
    arrivals: arrivals + inProgress,
    claims,
    inProgress,
  };
}

// ── ASSERT 8 — the structural precondition, over the real constants ──────────

test('ASSERT 8: the workload arithmetic that makes the trade-off possible', () => {
  const personCount = 7;
  const workshop = FACILITIES.find((f) => f.servesJobId === 'maintenance');
  const kitchen = FACILITIES.find((f) => f.servesJobId === 'meals');
  assert.ok(workshop !== undefined && kitchen !== undefined);
  assert.equal(workshop.capacity, 4, 'the Stage 2 fixture capacity');
  assert.equal(kitchen.capacity, 4);

  for (const [id, facility] of [
    ['maintenance', workshop],
    ['meals', kitchen],
  ] as const) {
    const job = JOB_TABLE.find((j) => j.id === id);
    assert.ok(job !== undefined);

    // (a) Each job's demand sits below its own facility's service ceiling, so
    //     prioritising it can actually clear the queue.
    const arrivals = dailyArrivals(job);
    const ceiling = dailyServiceCeiling(facility.capacity, job.durationTicks);
    assert.ok(arrivals < ceiling, `${id}: ${arrivals}/day must be under the ${ceiling}/day ceiling`);

    // (b) The pair together exceeds the workforce, so priority is a real
    //     allocation choice rather than a foregone conclusion.
    const demand = JOB_TABLE.reduce(
      (total, other) => total + dailyArrivals(other) * other.durationTicks,
      0,
    );
    const available = dailyCapacityTicks(personCount);
    assert.ok(demand > available, `total demand ${demand} must exceed ${available}`);
  }
});

test('ASSERT 8, continued: the constants are the documented ones', () => {
  const maintenance = JOB_TABLE.find((j) => j.id === 'maintenance');
  const meals = JOB_TABLE.find((j) => j.id === 'meals');
  assert.ok(maintenance !== undefined && meals !== undefined);
  assert.equal(maintenance.arrivalIntervalTicks, 24, 'derived in master plan §4A.3');
  assert.equal(meals.arrivalIntervalTicks, 8);
  assert.equal(maintenance.durationTicks, 90, 'the documented fixture duration');
  assert.equal(meals.durationTicks, 30);
});

// ── ASSERT 1 — the control is live, measured on backlog ──────────────────────

test('ASSERT 1: priority moves the backlog in the expected direction', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);

    assert.ok(
      mf.mealsBacklog >= 40,
      `seed ${seed}: maintenance-first must visibly starve meals (got ${mf.mealsBacklog})`,
    );
    assert.ok(
      kf.maintenanceBacklog >= 15,
      `seed ${seed}: meals-first must visibly defer maintenance (got ${kf.maintenanceBacklog})`,
    );
  }
});

test('ASSERT 2: the effect is directional, so it is caused by priority', () => {
  for (const seed of SEEDS) {
    const balanced = simulate('balanced', seed);
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);

    assert.ok(
      mf.maintenanceBacklog < kf.maintenanceBacklog,
      `seed ${seed}: maintenance-first should clear maintenance better`,
    );
    assert.ok(
      kf.mealsBacklog < mf.mealsBacklog,
      `seed ${seed}: meals-first should clear meals better`,
    );
    assert.ok(
      balanced.maintenanceBacklog <= kf.maintenanceBacklog,
      `seed ${seed}: balanced must not beat meals-first on maintenance backlog`,
    );
    assert.ok(
      balanced.mealsBacklog <= mf.mealsBacklog,
      `seed ${seed}: balanced must not beat maintenance-first on meals backlog`,
    );
  }
});

test('ASSERT 3: neither extreme starves the other job to zero', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    assert.ok(mf.mealsDone >= 200, `seed ${seed}: meals still served (${mf.mealsDone})`);
    assert.ok(kf.maintenanceDone >= 100, `seed ${seed}: maintenance still done (${kf.maintenanceDone})`);
  }
});

test('ASSERT 4: non-dominance — each setting is worse on a different job', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    assert.ok(mf.mealsBacklog > kf.mealsBacklog, 'maintenance-first is worse on meals');
    assert.ok(kf.maintenanceBacklog > mf.maintenanceBacklog, 'meals-first is worse on maintenance');
    // Neither dominates: it is worse on one axis and no better on the other.
    const mfBetter = mf.mealsBacklog < kf.mealsBacklog && mf.maintenanceBacklog < kf.maintenanceBacklog;
    assert.ok(!mfBetter, `seed ${seed}: maintenance-first must not dominate`);
  }
});

test('ASSERT 5: balanced sits between the extremes', () => {
  for (const seed of SEEDS) {
    const balanced = simulate('balanced', seed);
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    assert.ok(
      mf.maintenanceBacklog <= balanced.maintenanceBacklog &&
        balanced.maintenanceBacklog <= kf.maintenanceBacklog,
      `seed ${seed}: maintenance backlog ordering`,
    );
    assert.ok(
      kf.mealsBacklog <= balanced.mealsBacklog && balanced.mealsBacklog <= mf.mealsBacklog,
      `seed ${seed}: meals backlog ordering`,
    );
  }
});

test('ASSERT 6: the reason strings move with the setting — causal, not incidental', () => {
  for (const seed of SEEDS) {
    const mf = simulate('maintenance-first', seed);
    const kf = simulate('meals-first', seed);
    const balanced = simulate('balanced', seed);

    // (a) Duty claims are priority-independent: a specialist's own work outranks
    //     the player's intent, which is ladder rule 3 doing its job.
    const spread = Math.abs(mf.dutyClaims - kf.dutyClaims) / mf.dutyClaims;
    assert.ok(spread < 0.05, `seed ${seed}: duty claims moved by ${(spread * 100).toFixed(1)}%`);

    // (b) Every non-duty claim names the setting that produced it.
    for (const reason of mf.intentReasons) {
      assert.match(reason, /^maintenance-first puts /, `unexpected reason "${reason}"`);
    }
    for (const reason of kf.intentReasons) {
      assert.match(reason, /^meals-first puts /, `unexpected reason "${reason}"`);
    }
    for (const reason of balanced.intentReasons) {
      assert.match(reason, /^Balanced: /, `unexpected reason "${reason}"`);
    }

    // (c) The intent-claim counts differ, so the scan order really was followed.
    assert.ok(
      mf.intentClaims !== kf.intentClaims,
      `seed ${seed}: intent claim counts must differ (${mf.intentClaims} vs ${kf.intentClaims})`,
    );
  }
});

test('ASSERT 7: the economy is honest', () => {
  for (const seed of SEEDS) {
    for (const priority of ['balanced', 'maintenance-first', 'meals-first']) {
      const outcome = simulate(priority, seed);
      assert.ok(outcome.maintenanceBacklog >= 0, 'backlog is never negative');
      assert.ok(outcome.mealsBacklog >= 0, 'backlog is never negative');

      // The claim accounting closes exactly: every claimed order is either
      // completed or still in hand. This is the invariant that would break if
      // `pending` were spent on completion instead of on claim.
      assert.equal(
        outcome.claims,
        outcome.maintenanceDone + outcome.mealsDone + outcome.inProgress,
        `${priority}: claims must equal completions plus work still in hand`,
      );
      assert.ok(
        outcome.events < 3000,
        `log stayed bounded: ${outcome.events} events over five days`,
      );
    }
  }
});

test('pending never goes negative at any tick, under any setting', () => {
  // The regression test for the phantom-work defect: if `pending` were spent on
  // completion rather than on claim, several workers could take one order and
  // drive the backlog negative.
  for (const priority of ['balanced', 'maintenance-first', 'meals-first']) {
    let state = enqueue(createRun(DEFAULT_SEED), { type: 'set_priority', value: priority });
    for (let i = 0; i < 4000; i += 1) {
      state = run(state, 1);
      for (const job of state.jobs) {
        assert.ok(job.pending >= 0, `${priority}: ${job.id}.pending went negative at tick ${state.tick}`);
      }
      for (const facility of state.facilities) {
        const used = state.personnel.filter(
          (p) => p.currentTask?.jobId === facility.servesJobId,
        ).length;
        assert.ok(
          used <= facility.capacity,
          `${priority}: ${facility.id} over capacity at tick ${state.tick}`,
        );
      }
    }
  }
});

// ── Structural invariants ────────────────────────────────────────────────────

test('no person ever holds two jobs, and nobody switches without finishing', () => {
  let state = createRun(DEFAULT_SEED);
  const held = new Map<string, JobId>();
  for (let i = 0; i < 3000; i += 1) {
    state = run(state, 1);
    for (const person of state.personnel) {
      const jobId = person.currentTask?.jobId;
      if (jobId === undefined) {
        held.delete(person.id);
        continue;
      }
      const previous = held.get(person.id);
      // Changing job without an explicit event would violate invariant 9.
      assert.ok(
        previous === undefined || previous === jobId,
        `${person.id} moved from ${previous} to ${jobId} without abandoning`,
      );
      // Invariant 3 is structural: `currentTask` is a single value, so a person
      // cannot hold two jobs. What is worth checking is the global consequence —
      // the workforce cannot exceed the facilities it works in.
      const working = state.personnel.filter((p) => p.currentTask !== null).length;
      const totalCapacity = state.facilities.reduce((sum, f) => sum + f.capacity, 0);
      assert.ok(working <= totalCapacity, `${working} people for ${totalCapacity} slots`);

      held.set(person.id, jobId);
    }
  }
});

test('causal references stay valid across a five-day mixed log', () => {
  const state = simulate('maintenance-first', DEFAULT_SEED) && run(
    enqueue(createRun(DEFAULT_SEED), { type: 'set_priority', value: 'maintenance-first' }),
    HORIZON,
  );
  assert.ok(causalReferencesAreValid(state.log));
});

test('equivalent runs are identical — determinism and replay (invariant 14/15)', () => {
  const a = simulate('meals-first', DEFAULT_SEED);
  const b = simulate('meals-first', DEFAULT_SEED);
  assert.deepEqual(a, b);

  // Mid-run serialisation must not change the outcome (invariant 15).
  const uninterrupted = run(
    enqueue(createRun(DEFAULT_SEED), { type: 'set_priority', value: 'meals-first' }),
    HORIZON,
  );
  let interrupted = enqueue(createRun(DEFAULT_SEED), {
    type: 'set_priority',
    value: 'meals-first',
  });
  interrupted = run(interrupted, 3600);
  interrupted = draftOf(JSON.parse(JSON.stringify(interrupted)) as SimState);
  interrupted = run(interrupted, HORIZON - 3600);
  assert.deepEqual(measure(interrupted), measure(uninterrupted));
});

test('nothing draws during a tick — the cursor stays at the seven roster draws', () => {
  for (const seed of SEEDS) {
    const state = run(createRun(seed), HORIZON);
    assert.equal(state.rngCursor, 7, `seed ${seed} consumed unexpected randomness`);
  }
});

// ── Measured reference, reproduced by the real implementation ────────────────

test('reproduces the measured five-day reference figures', () => {
  const reference = [
    { priority: 'balanced', maintenance: 267, meals: 866, mb: 30, kb: 30 },
    { priority: 'maintenance-first', maintenance: 297, meals: 777, mb: 0, kb: 119 },
    { priority: 'meals-first', maintenance: 257, meals: 896, mb: 40, kb: 0 },
  ] as const;

  for (const row of reference) {
    const outcome = simulate(row.priority, DEFAULT_SEED);
    assert.equal(outcome.maintenanceDone, row.maintenance, `${row.priority}: maintenance done`);
    assert.equal(outcome.mealsDone, row.meals, `${row.priority}: meals done`);
    assert.equal(outcome.maintenanceBacklog, row.mb, `${row.priority}: maintenance backlog`);
    assert.equal(outcome.mealsBacklog, row.kb, `${row.priority}: meals backlog`);
  }
});

test('the seed changes names but not outcomes', () => {
  // Documented behaviour (`STAGE2_MASTER_PLAN.md` §5.2): arrival jitter was
  // removed, so the seed cannot change what happens, only who is called what.
  const names = (seed: number): string[] => createRun(seed).personnel.map((p) => p.name);
  assert.notDeepEqual(names(DEFAULT_SEED), names(4242), 'rosters should differ by seed');
  assert.deepEqual(simulate('balanced', DEFAULT_SEED), simulate('balanced', 4242));
});
// ── Regression tests added by the Stage 2 final audit ────────────────────────

test('a draft cannot write back into the state it was made from', () => {
  // Defect found in audit. `draftOf` copies each person with a shallow spread,
  // so `currentTask` is a shared nested object between a state and its draft.
  // The Stage 1 audit had already found this class of bug for `log` entries and
  // fixed it by freezing events; Stage 2 added `ActiveTask` and did not repeat
  // the protection. A write through a draft reached back and changed the previous
  // state's task (progressTicks became 9999).
  //
  // Nothing in Stage 2 mutates a task in place — `advanceTask` builds a new
  // object — so this was latent rather than active. The freeze makes it
  // structural instead of a convention a future system has to remember.
  const original = run(createRun(DEFAULT_SEED), 200);
  const draft = draftOf(original);

  const before = original.personnel[0]?.currentTask;
  assert.notEqual(before, null, 'precondition: someone is holding a task');
  const shared = draft.personnel[0]?.currentTask;
  assert.equal(shared, before, 'the object is shared — that is what makes this risky');

  assert.throws(
    () => {
      (shared as { progressTicks: number }).progressTicks = 9999;
    },
    TypeError,
    'a task in hand rejects mutation at runtime',
  );
  assert.notEqual(original.personnel[0]?.currentTask?.progressTicks, 9999);
});

test('an idle worker is never told there is nothing to do when work is waiting', () => {
  // Second defect found in audit. A person who finishes a task in the progress
  // pass is idle until the *next* tick's selection pass, so work is frequently
  // claimable right then. The old wording said "nothing claimable — standing by"
  // in that case, which is simply false: over a five-day run it mislabelled
  // 1,098 of 1,315 idle person-ticks, making it the most common line on screen.
  //
  // The roster is the legibility gate (evidence item 1). A reason that lies is
  // worse than no reason.
  let state = enqueue(createRun(DEFAULT_SEED), {
    type: 'set_priority',
    value: 'meals-first',
  });
  let misleading = 0;

  for (let i = 0; i < 1440; i += 1) {
    state = run(state, 1);
    const workWaiting = state.jobs.some((job) => job.pending > 0);
    for (const person of state.personnel) {
      if (person.currentTask !== null) continue;
      const reason = standbyReason(person, state.jobs, state.facilities, state.personnel);
      assert.notEqual(reason, 'nothing claimable — standing by', 'stale wording is gone');
      if (workWaiting && reason.includes('no work waiting')) misleading += 1;
    }
  }

  assert.equal(misleading, 0, 'never claim there is no work while work is waiting');
});
