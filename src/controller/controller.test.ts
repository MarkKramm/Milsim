/**
 * Controller integration tests.
 *
 * `timeline.ts` is tested as a pure function; this checks that the wiring around
 * it is correct — that ticks actually run, that pause really stops them, that the
 * UI's "events this tick" comes from the log, and that no browser API is needed.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { Controller } from './controller';
import { DEFAULT_SEED } from '../sim/rng';
import { SPEEDS } from './timeline';

test('a fresh controller starts at Day 1, tick 0', () => {
  const controller = new Controller();
  const s = controller.snapshot();
  assert.equal(s.tick, 0);
  assert.equal(s.day, 1);
  assert.equal(s.period, 'Night');
  assert.equal(s.rngCursor, 7, 'the seven roster names are drawn at creation');
  assert.equal(s.seed, DEFAULT_SEED);
  assert.equal(s.logLength, 0);
  assert.equal(s.priority, 'balanced', 'the documented initial priority');
  assert.equal(s.roster.length, 7, 'seven people, readable on one phone screen');
  assert.equal(s.facilities.length, 2);
});

test('the roster explains every person, including those standing by', () => {
  // Gate evidence item 1 is "you can explain what happened without reading the
  // source code". A roster row with an empty reason would quietly fail that.
  const controller = new Controller({ speed: '1x' });
  runFrames(controller, 2_000);
  const { roster } = controller.snapshot();
  assert.equal(roster.length, 7);
  for (const entry of roster) {
    assert.ok(entry.reason.length > 0, `${entry.id} has no reason`);
    assert.ok(entry.task.length > 0, `${entry.id} has no task label`);
    if (entry.standby) {
      assert.equal(entry.task, 'Standby');
      assert.match(entry.reason, /standing by|at capacity/);
    } else {
      assert.ok(entry.progressTicks <= entry.durationTicks);
    }
  }
});

test('facility cards report occupancy and waiting work', () => {
  const controller = new Controller({ speed: '1x' });
  runFrames(controller, 5_000);
  for (const facility of controller.snapshot().facilities) {
    assert.ok(facility.used <= facility.capacity, `${facility.id} is over capacity`);
    assert.ok(facility.pending >= 0, `${facility.id} has negative backlog`);
  }
});

test('the priority control issues a command rather than writing state', () => {
  const controller = new Controller({ speed: '1x' });
  controller.setPriority('meals-first');
  // Applied at the next tick step 2, not immediately (A4).
  assert.equal(controller.snapshot().priority, 'balanced', 'not applied until a tick runs');
  controller.step(125);
  assert.equal(controller.snapshot().priority, 'meals-first');

  controller.setPriority('nonsense' as never);
  controller.step(125);
  assert.equal(controller.snapshot().priority, 'meals-first', 'an unknown value is ignored');
});

test('one second at 1x advances 8 ticks', () => {
  const controller = new Controller({ speed: '1x' });
  controller.step(1000);
  assert.equal(controller.snapshot().tick, 8);
});

test('each speed produces its documented tick rate', () => {
  for (const [name, tps] of Object.entries(SPEEDS)) {
    const controller = new Controller({ speed: name as keyof typeof SPEEDS });
    controller.step(1000);
    assert.equal(controller.snapshot().tick, tps, `${name} produced the wrong rate`);
  }
});

test('pause runs zero ticks', () => {
  const controller = new Controller({ speed: 'pause' });
  controller.step(10_000);
  assert.equal(controller.snapshot().tick, 0);
});

test('switching to pause stops the clock, and resuming does not replay', () => {
  const controller = new Controller({ speed: '1x' });
  controller.step(1000);
  assert.equal(controller.snapshot().tick, 8);

  controller.setSpeed('pause');
  controller.step(10_000);
  assert.equal(controller.snapshot().tick, 8, 'paused ticks did not advance');

  controller.setSpeed('1x');
  controller.step(0); // first frame after resume: baseline was reset
  assert.equal(controller.snapshot().tick, 8, 'the paused gap was replayed');

  controller.step(1000);
  assert.equal(controller.snapshot().tick, 16, 'then it runs normally again');
});

/**
 * Advance `totalMs` in `frameMs` steps, the way a browser actually delivers
 * time. A single large step cannot deliver thousands of ticks — the per-frame cap
 * binds — so tests that need bulk progress have to model several frames.
 */
function runFrames(controller: Controller, totalMs: number, frameMs = 1000): void {
  for (let elapsed = 0; elapsed < totalMs; elapsed += frameMs) {
    controller.step(frameMs);
  }
}

test('16x advances a day quickly', () => {
  const controller = new Controller({ speed: '16x' });
  runFrames(controller, 12_000); // 12 frames x 128 ticks = 1536
  const s = controller.snapshot();
  assert.equal(s.tick, 1536);
  assert.equal(s.day, 2, 'a day passed in about 11.25 seconds');
});

test('events this tick is derived from the log, not counted separately', () => {
  const controller = new Controller({ speed: '1x' });

  // The invariant is the equality below, and it must hold even when a frame
  // produces nothing. Ticks 1-16 genuinely produce no events: the first
  // maintenance order arrives at tick 20 and the larder starts at its target,
  // so an early frame logging nothing is correct rather than a broken counter.
  for (let frame = 0; frame < 5; frame += 1) {
    const before = controller.snapshot().logLength;
    controller.step(1000); // 8 ticks at 1×
    const after = controller.snapshot();
    assert.equal(
      after.eventsThisTick,
      after.logLength - before,
      'eventsThisTick must equal the growth in the authoritative log',
    );
  }

  // Over a longer stretch the base is plainly doing something.
  const total = controller.snapshot().logLength;
  assert.ok(total > 0, `expected work events after 40 ticks, got ${total}`);
});

test('a rollover moves the displayed day', () => {
  const controller = new Controller({ speed: '1x' });
  runFrames(controller, 179_000); // tick 1432, still Day 1
  assert.equal(controller.snapshot().tick, 1432);
  assert.equal(controller.snapshot().day, 1);

  controller.step(1000); // tick 1440, Day 2
  assert.equal(controller.snapshot().tick, 1440);
  assert.equal(controller.snapshot().day, 2);
});

test('a long backlog is capped per frame and then delivered', () => {
  const controller = new Controller({ speed: '1x' });
  controller.step(600_000); // 10 minutes owed
  const s = controller.snapshot();
  assert.ok(s.backlogTicks > 0, 'backlog should remain after a capped frame');
  assert.ok(s.tick <= 240, 'one frame must not run the whole backlog');

  controller.step(600_000);
  assert.equal(controller.snapshot().tick, 480, 'two capped frames, 240 each');
});

test('subscribers receive an initial snapshot and later updates', () => {
  const controller = new Controller({ speed: '1x' });
  const seen: number[] = [];
  const unsubscribe = controller.subscribe((s) => seen.push(s.tick));

  assert.deepEqual(seen, [0], 'subscribe delivers the current state immediately');
  controller.step(1000);
  assert.equal(controller.snapshot().tick, 8);

  unsubscribe();
  assert.equal(seen.length, seen.length, 'no crash after unsubscribing');
});

test('speed changes notify immediately even inside the cadence window', () => {
  const controller = new Controller({ speed: '1x' });
  const speeds: string[] = [];
  controller.subscribe((s) => speeds.push(s.speed));
  const before = speeds.length;
  controller.setSpeed('16x');
  assert.ok(speeds.length > before, 'a speed change must not wait for the next tick');
  assert.equal(speeds[speeds.length - 1], '16x');
});

test('a paused backlog is still reported as a backlog', () => {
  // Regression guard. `advance` cannot measure a backlog at 0 ticks/s, because a
  // tick has no length there; the controller measures it at the speed that will be
  // used on resume. Before that, this read 0 while a real backlog was banked.
  const controller = new Controller({ speed: '1x' });
  controller.step(600_000); // 4800 owed, 240 run, backlog banked
  const running = controller.snapshot();
  assert.ok(running.backlogTicks > 0);

  controller.setSpeed('pause');
  const paused = controller.snapshot();
  assert.equal(paused.tick, running.tick, 'paused ticks nothing');
  assert.ok(
    paused.backlogTicks > 0,
    'the paused backlog must still be visible, not reported as zero',
  );

  controller.setSpeed('1x');
  controller.step(0); // resume with a reset baseline
  const resumed = controller.snapshot();
  // Resuming begins draining the banked backlog, bounded by the per-frame cap.
  // What must not happen is the paused interval being replayed as elapsed time,
  // which would run thousands of ticks here.
  assert.equal(resumed.tick, running.tick + 240, 'one capped frame of catch-up');
  assert.ok(resumed.tick < 4800, 'the backlog was never fired in full');
});

/**
 * Drive the controller through a real elapsed interval using an injected frame
 * callback, then fire the next frame. `setSpeed` reads the real clock internally,
 * so this needs real time rather than `step()` with a synthetic delta.
 */
function withRealClock(fn: (fire: () => void, controller: Controller) => void): void {
  let cb: (t: number) => void = () => {};
  const controller = new Controller({
    speed: '1x',
    schedule: (f) => {
      cb = f;
      return 1;
    },
    cancel: () => {},
  });
  controller.start();
  cb(performance.now());
  fn(() => cb(performance.now()), controller);
}

test('changing speed while running preserves the elapsed time so far', () => {
  // Regression test for a confirmed defect. `setSpeed` used to reset the frame
  // baseline on every speed change, so the interval since the last frame was
  // discarded. Tapping 16x after 300ms at 1x advanced 0 ticks instead of ~38.
  withRealClock((fire, controller) => {
    const start = performance.now();
    while (performance.now() - start < 300) { /* burn 300ms of real time */ }

    controller.setSpeed('16x');
    fire();

    const ticks = controller.snapshot().tick;
    // 300ms at 16x is ~38 ticks. The old bug produced 0.
    assert.ok(ticks > 20, `elapsed time was discarded: only ${ticks} ticks ran`);
  });
});

test('changing speed before the first frame after waking does not discard the idle gap', () => {
  // The severe form of the same defect, and the one that matters on a phone.
  //
  // A hidden tab runs no frames, so the time since the last frame was never
  // banked. If the player taps a speed button before the first frame after
  // waking, resetting the frame baseline throws the whole hidden interval away.
  //
  // This must drive the *frame loop*, not `step()`: `step()` takes an explicit
  // delta and never reads `lastFrameMs`, so a test written against `step()`
  // cannot observe this defect at all. An earlier version of this test did
  // exactly that and passed against the buggy code.
  let cb: (t: number) => void = () => {};
  const controller = new Controller({
    speed: '1x',
    schedule: (f) => {
      cb = f;
      return 1;
    },
    cancel: () => {},
  });

  controller.start();       // baseline is now
  // No frame fires — this is the tab being hidden or the phone being asleep.
  const idleStart = performance.now();
  while (performance.now() - idleStart < 300) { /* idle 300ms with no frames */ }

  controller.setSpeed('16x');
  cb(performance.now());   // the first frame after waking

  const ticks = controller.snapshot().tick;
  assert.ok(
    ticks > 20,
    `the idle interval was discarded by the speed tap: only ${ticks} ticks ran`,
  );
});

test('the simulation draws nothing beyond the roster, however long it runs', () => {
  // Was "stays at cursor zero". Stage 2 names the roster at creation, which
  // takes seven draws; arrival jitter was measured and removed, so nothing during
  // a tick consumes randomness. This is the test that catches a future system
  // quietly starting to draw.
  const controller = new Controller({ speed: '16x' });
  for (let i = 0; i < 100; i += 1) controller.step(1000);
  assert.equal(controller.snapshot().rngCursor, 7);
  // 100 frames x 1s at 128 ticks/s. Long enough that any per-tick draw would
  // have moved the cursor thousands of times.
  assert.equal(controller.snapshot().tick, 12_800);
});