import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createRun, draftOf, statesEqual } from './state';
import type { SimState } from './state';
import { run, tick } from './tick';
import { enqueue } from './commands';
import type { Command } from './commands';
import { DAY_ROLLOVER, causalReferencesAreValid, countByTier } from './events';
import { TICKS_PER_DAY, dayOf } from './time';
import { DEFAULT_SEED } from './rng';

test('one tick advances the clock by exactly one', () => {
  assert.equal(tick(createRun(DEFAULT_SEED)).tick, 1);
  const s = run(createRun(DEFAULT_SEED), 7);
  assert.equal(s.tick, 7);
});

test('a fresh run is Day 1, Night, with an empty log', () => {
  const s = createRun(DEFAULT_SEED);
  assert.equal(s.tick, 0);
  assert.equal(dayOf(s.tick), 1);
  assert.equal(s.log.length, 0);
  assert.equal(s.nextEventId, 0);
  assert.equal(s.rngCursor, 0, 'Stage 1 draws nothing');
});

test('tick 0 emits no rollover — a start is not a completion', () => {
  const s = tick(createRun(DEFAULT_SEED));
  assert.equal(s.log.length, 0, 'advancing to tick 1 must not announce a day');
});

test('advancing to 1440 emits exactly one Day 2 rollover', () => {
  const s = run(createRun(DEFAULT_SEED), TICKS_PER_DAY);
  assert.equal(s.tick, 1440);
  assert.equal(s.log.length, 1);
  const event = s.log[0]!;
  assert.equal(event.type, DAY_ROLLOVER);
  assert.equal(event.tier, 'routine');
  assert.equal(event.data.day, 2);
  assert.equal(event.tick, 1440);
});

test('ten days of ticks produce ten rollovers, sequential and correctly numbered', () => {
  const s = run(createRun(DEFAULT_SEED), TICKS_PER_DAY * 10);
  assert.equal(s.tick, 14400);
  // Boundaries at 1440..14400 = 10 rollovers, announcing days 2 through 11.
  assert.equal(s.log.length, 10, 'days 2..11 = 10 rollovers');

  s.log.forEach((event, i) => {
    assert.equal(event.id, i, 'ids are sequential');
    assert.equal(event.tick, (i + 1) * TICKS_PER_DAY);
    assert.equal(event.data.day, i + 2);
  });
  assert.equal(countByTier(s.log).routine, 10);
});

test('every rollover event lands on a boundary and no others appear', () => {
  const s = run(createRun(DEFAULT_SEED), TICKS_PER_DAY * 3 + 137);
  for (const event of s.log) {
    assert.equal(event.type, DAY_ROLLOVER);
    assert.ok(event.tick % TICKS_PER_DAY === 0, `rollover at ${event.tick}`);
  }
  assert.equal(s.log.length, 3, 'a partial day adds no event');
});

test('causal references are valid', () => {
  const s = run(createRun(DEFAULT_SEED), TICKS_PER_DAY * 5);
  assert.ok(causalReferencesAreValid(s.log));
});

test('equivalent runs produce identical state, not merely identical logs', () => {
  // Comparing logs alone would pass on a bug that diverged somewhere else.
  const a = run(createRun(DEFAULT_SEED), 2000);
  const b = run(createRun(DEFAULT_SEED), 2000);
  assert.ok(statesEqual(a, b));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('tick does not mutate the state it was given', () => {
  const before = createRun(DEFAULT_SEED);
  const snapshot = JSON.stringify(before);

  const after = run(before, 500);

  assert.equal(JSON.stringify(before), snapshot, 'input state was mutated');
  assert.notEqual(after, before);
  assert.equal(before.tick, 0);
  assert.equal(before.log.length, 0);
  assert.equal(before.rngCursor, 0);
});

test('the previous state stays usable after being ticked', () => {
  // Time-travel debugging depends on this: an old snapshot remains a valid state.
  const first = tick(createRun(DEFAULT_SEED));
  const second = tick(first);
  assert.equal(first.tick, 1);
  assert.equal(second.tick, 2);
  assert.equal(run(first, 1).tick, 2, 'ticking an old state still works');
});

test('draftOf isolates the top level: arrays copied, scalars independent', () => {
  // Previously named "shares no mutable structure with its source", which was
  // false — and because it used an empty log it could not detect the sharing it
  // claimed to rule out. It now says what it actually verifies.
  const original = createRun(DEFAULT_SEED);
  const draft = draftOf(original);
  draft.log.push({
    id: 0, tick: 0, type: 'x', tier: 'routine', subjects: [], causeEventIds: [], data: {},
  });
  draft.tick = 99;
  assert.notEqual(draft.log, original.log, 'the log array is copied');
  assert.equal(original.log.length, 0, 'appending to the draft did not touch the original');
  assert.equal(original.tick, 0, 'scalars are independent');
});

test('a shared event cannot be mutated, and the original is unaffected', () => {
  // Regression test. `draftOf` shares event objects on purpose, so the guarantee
  // that protects history is that an event is immutable — enforced by `readonly`
  // at compile time and `Object.freeze` at runtime. This test proves the runtime
  // half and shows the original state is untouched when the write is attempted.
  //
  // Before these protections, `draft.log[0].data.day = 999` silently changed the
  // *original* state's event, which would rewrite history that the causal report
  // depends on.
  const state = run(createRun(DEFAULT_SEED), 1440);
  assert.ok(state.log.length > 0, 'precondition: a non-empty log with a real event');

  const draft = draftOf(state);
  assert.equal(draft.log[0], state.log[0], 'event objects are intentionally shared');

  assert.throws(() => {
    (draft.log[0]!.data as Record<string, unknown>).day = 999;
  }, TypeError, 'a frozen event rejects mutation at runtime');

  assert.equal(
    state.log[0]!.data.day,
    2,
    'the original state is unaffected even when the write is attempted',
  );
});

test('state survives a JSON round-trip', () => {
  const s = run(createRun(DEFAULT_SEED), 3000);
  const restored: SimState = JSON.parse(JSON.stringify(s));
  assert.ok(statesEqual(s, restored));
  assert.ok(statesEqual(tick(restored), tick(s)));
});

test('only tick, log and nextEventId change during an ordinary tick', () => {
  const s = run(createRun(DEFAULT_SEED), 100);
  const t = tick(s);
  assert.equal(t.seed, s.seed);
  assert.equal(t.rngCursor, s.rngCursor, 'no draws, so no cursor movement');
  assert.deepEqual(t.pendingCommands, s.pendingCommands);
  assert.deepEqual(t.intent, s.intent);
  assert.equal(t.log.length, s.log.length);
});

test('enqueue does not mutate the state it was given', () => {
  const s = createRun(DEFAULT_SEED);
  // Stage 1 has no valid command, so reaching this line needs a cast.
  const fake = { type: 'not_a_real_command' } as unknown as Command;
  const next = enqueue(s, fake);

  assert.equal(s.pendingCommands.length, 0, 'input was mutated');
  assert.equal(next.pendingCommands.length, 1);
  assert.notEqual(next.pendingCommands, s.pendingCommands);
});

test('an unknown command is rejected with a recorded reason, and the queue drains', () => {
  const fake = { type: 'not_a_real_command' } as unknown as Command;
  const queued = enqueue(createRun(DEFAULT_SEED), fake);
  assert.equal(queued.pendingCommands.length, 1);

  const after = tick(queued);
  assert.equal(after.pendingCommands.length, 0, 'queue must be emptied');

  const rejection = after.log[after.log.length - 1]!;
  assert.equal(rejection.type, 'command_rejected');
  assert.deepEqual(rejection.data.command, 'not_a_real_command');
});

test('a command is applied exactly once, never twice', () => {
  const fake = { type: 'double_me' } as unknown as Command;
  let s = enqueue(createRun(DEFAULT_SEED), fake);
  s = tick(s);

  const rejections = s.log.filter((e) => e.type === 'command_rejected');
  assert.equal(rejections.length, 1, 'exactly one rejection');
  assert.equal(s.pendingCommands.length, 0);

  s = run(s, 50);
  assert.equal(s.log.filter((e) => e.type === 'command_rejected').length, 1);
});

test('a run of zero ticks changes nothing', () => {
  const s = createRun(DEFAULT_SEED);
  assert.ok(statesEqual(run(s, 0), s));
});

test('the rng cursor stays at zero no matter how long the run', () => {
  const s = run(createRun(DEFAULT_SEED), TICKS_PER_DAY * 30);
  assert.equal(s.rngCursor, 0, 'Stage 1 performs no random draws');
  assert.equal(s.log.length, 30, '30 days of ticks = 30 boundaries crossed');
});