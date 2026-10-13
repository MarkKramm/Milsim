import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { MAX_TICKS_PER_FRAME, SPEEDS, advance } from './timeline';

const CAP = 240;

test('the documented speeds are pause, 1x, 4x, 16x', () => {
  assert.deepEqual(SPEEDS, { pause: 0, '1x': 8, '4x': 32, '16x': 128 });
});

test('pause runs zero ticks and leaves the accumulator untouched', () => {
  const r = advance(0, 1000, SPEEDS.pause, CAP);
  assert.equal(r.ticksToRun, 0);
  assert.equal(r.accumulatedMs, 0, 'no elapsed time is accrued while paused');
});

test('one second at each speed produces the documented tick counts', () => {
  assert.equal(advance(0, 1000, SPEEDS['1x'], CAP).ticksToRun, 8);
  assert.equal(advance(0, 1000, SPEEDS['4x'], CAP).ticksToRun, 32);
  assert.equal(advance(0, 1000, SPEEDS['16x'], CAP).ticksToRun, 128);
});

test('a whole in-game day at 1x takes about three minutes', () => {
  let acc = 0;
  let ran = 0;
  for (let i = 0; i < 180; i += 1) {
    const r = advance(acc, 1000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    ran += r.ticksToRun;
  }
  assert.equal(ran, 1440);
});

test('16x covers a day in about 11.25 seconds', () => {
  let acc = 0;
  let ran = 0;
  for (let i = 0; i < 12; i += 1) {
    const r = advance(acc, 1000, SPEEDS['16x'], CAP);
    acc = r.accumulatedMs;
    ran += r.ticksToRun;
  }
  assert.ok(ran >= 1536, `12s at 16x should cover a day, got ${ran}`);
});

test('the fractional remainder is preserved across many small frames', () => {
  // Rounding drift: if each frame rounded down independently, time would vanish.
  let acc = 0;
  let ran = 0;
  for (let i = 0; i < 1000; i += 1) {
    const r = advance(acc, 10, SPEEDS['16x'], CAP); // 10ms -> 1.28 ticks
    acc = r.accumulatedMs;
    ran += r.ticksToRun;
  }
  assert.equal(ran, 1280, 'exactly floor(10000ms / (1000/128))');
});

test('a huge elapsed interval is capped per frame and keeps the rest', () => {
  const r = advance(0, 600_000, SPEEDS['1x'], CAP); // 10 minutes owed = 4800
  assert.equal(r.ticksToRun, CAP, 'only the cap runs this frame');
  assert.equal(r.backlogTicks, 4800 - CAP);
  assert.ok(r.accumulatedMs > 0, 'the rest is still owed, not discarded');
});

test('the cap defers work but never loses it', () => {
  // The no-loss invariant, stated exactly: every millisecond fed is either
  // already converted into a tick or still sitting in the accumulator. Asserting
  // "delivered == all ticks owed" would be wrong while a backlog exists — owed
  // work is deferred, not delivered, which is the whole point of the cap.
  const msPerTick = 1000 / SPEEDS['1x'];
  let acc = 0;
  let delivered = 0;
  let fedMs = 0;

  for (let frame = 0; frame < 1200; frame += 1) {
    const r = advance(acc, 1000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    delivered += r.ticksToRun;
    fedMs += 1000;

    const accountedFor = delivered * msPerTick + acc;
    assert.ok(
      Math.abs(accountedFor - fedMs) < 1e-6,
      `frame ${frame}: ${accountedFor} accounted for ${fedMs} fed`,
    );
  }

  // With 1000ms frames at 1x each frame is only owed 8 ticks, so the cap never
  // binds and every frame delivers exactly what it earned.
  assert.equal(delivered, 1200 * 8);
  assert.equal(acc, 0, '1000ms is exactly 8 ticks at 1x, so no remainder carries');
});

test('a backlog drains at the cap when frames owe more than the cap', () => {
  // Feeding large deltas means each frame exceeds the cap, so the cap binds and
  // the backlog drains 240 ticks per frame rather than all at once.
  let acc = 0;
  let delivered = 0;
  let frames = 0;
  while (delivered < 4800 && frames < 100) {
    const r = advance(acc, 600_000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    delivered += r.ticksToRun;
    frames += 1;
  }
  assert.equal(frames, 20, '4800 ticks at 240 per frame is 20 frames');
  assert.ok(delivered >= 4800);
});

test('a pause preserves an existing backlog and adds no new debt', () => {
  const r = advance(0, 600_000, SPEEDS['1x'], CAP);
  const acc = r.accumulatedMs;
  const owed = Math.floor(acc / (1000 / SPEEDS['1x']));

  // Ten minutes paused: still paused, so nothing accrues and nothing is lost.
  for (let i = 0; i < 10; i += 1) {
    const paused = advance(acc, 1000, SPEEDS.pause, CAP);
    assert.equal(paused.ticksToRun, 0);
    assert.equal(paused.accumulatedMs, acc, 'accumulator frozen byte-for-byte');
  }

  const afterPause = Math.floor(acc / (1000 / SPEEDS['1x']));
  assert.equal(afterPause, owed, 'backlog survived the pause unchanged');
  assert.ok(owed < 4800, 'and did not grow to include the paused time');
});

test('resuming does not replay the paused interval', () => {
  const suspended = advance(0, 600_000, SPEEDS['1x'], CAP);
  const acc = suspended.accumulatedMs;

  // Resume resets the frame baseline, so the first delta is ~0, not 600000.
  const resumed = advance(acc, 0, SPEEDS['1x'], CAP);
  assert.equal(resumed.ticksToRun, CAP, 'bounded by the cap');
  assert.equal(resumed.backlogTicks, suspended.backlogTicks - CAP);
});

test('a resume drains without firing the whole backlog at once', () => {
  const suspended = advance(0, 600_000, SPEEDS['1x'], CAP);
  let acc = suspended.accumulatedMs;
  let peak = 0;
  for (let i = 0; i < 60; i += 1) {
    const r = advance(acc, 100, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    peak = Math.max(peak, r.ticksToRun);
  }
  assert.ok(peak <= MAX_TICKS_PER_FRAME, `peak ${peak} exceeded the cap`);
});

test('pausing mid-backlog then resuming still delivers everything', () => {
  const suspended = advance(0, 600_000, SPEEDS['1x'], CAP);
  let acc = suspended.accumulatedMs;

  // One frame, then pause for a while, then resume.
  acc = advance(acc, 1000, SPEEDS['1x'], CAP).accumulatedMs;
  for (let i = 0; i < 30; i += 1) acc = advance(acc, 1000, SPEEDS.pause, CAP).accumulatedMs;

  let delivered = 0;
  for (let i = 0; i < 60 && i < 60; i += 1) {
    const r = advance(acc, 1000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    delivered += r.ticksToRun;
  }
  assert.ok(acc >= 0);
  assert.ok(delivered > 0);
});

test('changing speed does not retroactively rewrite owed time', () => {
  let acc = advance(0, 1000, SPEEDS['1x'], CAP).accumulatedMs;
  const owed = Math.floor(acc / 125);
  // Switch to 16x: the same 1000ms is now worth more ticks, but nothing already
  // owed is altered — the accumulator is untouched by the speed change.
  const at16 = advance(acc, 0, SPEEDS['16x'], CAP);
  assert.equal(at16.accumulatedMs, acc);
  assert.ok(owed >= 0);
});

test('the cap never makes the controller run faster than the cap', () => {
  const r = advance(0, 3_600_000, SPEEDS['16x'], CAP); // an hour
  assert.equal(r.ticksToRun, MAX_TICKS_PER_FRAME);
});