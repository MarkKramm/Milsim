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
  assert.equal(s.rngCursor, 0);
  assert.equal(s.seed, DEFAULT_SEED);
  assert.equal(s.logLength, 0);
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
  runFrames(controller, 8_000);
  assert.equal(controller.snapshot().eventsThisTick, 0, 'ticks 1-64 cross no boundary');
  assert.equal(controller.snapshot().logLength, 0);

  runFrames(controller, 172_000); // up to tick 1440
  const s = controller.snapshot();
  assert.equal(s.logLength, 1);
  assert.equal(s.eventsThisTick, 1, 'exactly one rollover seen in that frame');
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

test('the simulation stays at cursor zero however long it runs', () => {
  const controller = new Controller({ speed: '16x' });
  for (let i = 0; i < 100; i += 1) controller.step(1000);
  assert.equal(controller.snapshot().rngCursor, 0);
});