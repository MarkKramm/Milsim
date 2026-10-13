import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  TICKS_PER_DAY,
  dayOf,
  elapsedInGameMinutes,
  hourOfDay,
  isDayRollover,
  minuteOfDay,
  periodOf,
  presentTime,
} from './time';

test('tick 0 is Day 1 — there is no Day 0', () => {
  assert.equal(dayOf(0), 1);
});

test('day derives correctly across boundaries', () => {
  assert.equal(dayOf(0), 1);
  assert.equal(dayOf(1439), 1);
  assert.equal(dayOf(1440), 2);
  assert.equal(dayOf(2879), 2);
  assert.equal(dayOf(2880), 3);
  assert.equal(dayOf(TICKS_PER_DAY * 10), 11);
});

test('a day is 1440 ticks', () => {
  assert.equal(TICKS_PER_DAY, 1440);
});

test('minute and hour wrap inside the day', () => {
  assert.equal(minuteOfDay(0), 0);
  assert.equal(minuteOfDay(1439), 1439);
  assert.equal(minuteOfDay(1440), 0);
  assert.equal(hourOfDay(0), 0);
  assert.equal(hourOfDay(1439), 23);
  assert.equal(hourOfDay(1440), 0);
});

test('first tick is Night', () => {
  assert.equal(periodOf(0), 'Night');
});

test('period boundaries are exactly at 360, 720, 1080', () => {
  assert.equal(periodOf(359), 'Night');
  assert.equal(periodOf(360), 'Morning');
  assert.equal(periodOf(719), 'Morning');
  assert.equal(periodOf(720), 'Afternoon');
  assert.equal(periodOf(1079), 'Afternoon');
  assert.equal(periodOf(1080), 'Evening');
  assert.equal(periodOf(1439), 'Evening');
});

test('periods restart after midnight', () => {
  assert.equal(periodOf(1440), 'Night');
  assert.equal(periodOf(1440 + 360), 'Morning');
});

test('display string is Day N — Period, never a clock', () => {
  assert.equal(presentTime(0), 'Day 1 — Night');
  assert.equal(presentTime(720), 'Day 1 — Afternoon');
  assert.equal(presentTime(TICKS_PER_DAY), 'Day 2 — Night');
});

test('elapsed in-game minutes equals the tick', () => {
  assert.equal(elapsedInGameMinutes(0), 0);
  assert.equal(elapsedInGameMinutes(4321), 4321);
});

test('day rollover is false at tick 0 — a start is not a completion', () => {
  // Without this guard `0 % 1440 === 0` fires a Day 1 event at run start.
  assert.equal(isDayRollover(0), false);
  assert.equal(isDayRollover(1439), false);
  assert.equal(isDayRollover(1440), true);
  assert.equal(isDayRollover(2880), true);
  assert.equal(isDayRollover(1441), false);
});

test('rolling days are all detected and nothing else is', () => {
  const hits: number[] = [];
  for (let t = 0; t <= TICKS_PER_DAY * 10; t += 1) {
    if (isDayRollover(t)) hits.push(t);
  }
  // Days 2..11 = 10 rollovers over 11 days starting at tick 0.
  assert.deepEqual(hits, [1440, 2880, 4320, 5760, 7200, 8640, 10080, 11520, 12960, 14400]);
});