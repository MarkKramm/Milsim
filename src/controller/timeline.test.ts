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

test('accumulated time is conserved even when the cap never engages', () => {
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
  // binds and every frame delivers exactly what it earned. That is deliberate:
  // this test proves no time is lost to rounding, and the cap-binding cases are
  // the two tests below.
  assert.equal(delivered, 1200 * 8);
  assert.equal(acc, 0, '1000ms is exactly 8 ticks at 1x, so no remainder carries');
});

test('the cap binds when a frame owes more than the cap', () => {
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
  // Deltas large enough that each frame genuinely wants more than the cap, so
  // this asserts the cap actually binds rather than merely holding.
  for (let i = 0; i < 40; i += 1) {
    const r = advance(acc, 600_000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    peak = Math.max(peak, r.ticksToRun);
  }
  assert.equal(peak, MAX_TICKS_PER_FRAME, 'the cap bound every frame');
  assert.ok(peak < 4800, 'and the whole backlog never fired at once');
});

test('pausing mid-backlog loses nothing and invents nothing', () => {
  // The exact conservation invariant, with a real backlog present rather than an
  // empty accumulator. Paused frames fed no time, so fedMs must not advance.
  const msPerTick = 1000 / SPEEDS['1x'];
  const suspended = advance(0, 600_000, SPEEDS['1x'], CAP);
  let acc = suspended.accumulatedMs;
  let delivered = suspended.ticksToRun;
  let fedMs = 600_000;

  const running = advance(acc, 1000, SPEEDS['1x'], CAP);
  acc = running.accumulatedMs;
  delivered += running.ticksToRun;
  fedMs += 1000;

  const accBeforePause = acc;
  for (let i = 0; i < 30; i += 1) {
    const p = advance(acc, 1000, SPEEDS.pause, CAP);
    assert.equal(p.ticksToRun, 0);
    assert.equal(p.accumulatedMs, acc, 'paused frames must not move the accumulator');
  }
  assert.equal(acc, accBeforePause, '30 paused seconds left no trace');
  assert.ok(Math.floor(acc / msPerTick) > 0, 'a real backlog survived the pause');

  for (let i = 0; i < 1000; i += 1) {
    const r = advance(acc, 1000, SPEEDS['1x'], CAP);
    acc = r.accumulatedMs;
    delivered += r.ticksToRun;
    fedMs += 1000;
  }

  assert.ok(
    Math.abs(delivered * msPerTick + acc - fedMs) < 1e-6,
    'every fed millisecond is either delivered or still owed',
  );
});

test('changing speed does not retroactively rewrite owed time', () => {
  // 1100ms at 1x is 8 whole ticks with 100ms genuinely still owed, so there is a
  // real remainder for a speed change to potentially disturb.
  let acc = advance(0, 1100, SPEEDS['1x'], CAP).accumulatedMs;
  assert.equal(acc, 100, '100ms of fractional time is carried, not rounded away');

  // Switching to 16x does not rewrite time that is already owed. The accumulator
  // is denominated in milliseconds, so the carried 100ms is intact; what changes
  // is how many whole ticks it is worth — 100ms was 0 ticks at 1x and is 12 at
  // 16x, with the sub-tick remainder still carried.
  const at16 = advance(acc, 0, SPEEDS['16x'], CAP);
  assert.equal(at16.ticksToRun, 12, '100ms is now worth 12 whole ticks at 16x');
  assert.ok(
    Math.abs(at16.ticksToRun * (1000 / SPEEDS['16x']) + at16.accumulatedMs - 100) < 1e-6,
    'all 100ms is either delivered or still carried — none lost or invented',
  );
  assert.equal(at16.accumulatedMs, 6.25);
});

test('the cap never makes the controller run faster than the cap', () => {
  const r = advance(0, 3_600_000, SPEEDS['16x'], CAP); // an hour
  assert.equal(r.ticksToRun, MAX_TICKS_PER_FRAME);
});