/**
 * The interface.
 *
 * Reads a snapshot and offers four speed controls. It contains **no simulation
 * rules** and never writes authoritative state — if a React component decided
 * anything about how the world works, that would be a bug (`D9`).
 *
 * Deliberately plain. Stage 1 has no people, jobs or needs, so there is nothing
 * to build a dashboard out of yet, and inventing one would be building a
 * prototype of a game that does not exist. This is a panel of live numbers whose
 * job is to make the time model visible.
 */

import { useEffect, useState } from 'react';

import { createController } from '../controller/controller';
import type { Snapshot } from '../controller/controller';
import { SPEEDS } from '../controller/timeline';
import { TICKS_PER_DAY } from '../sim/time';
import type { SpeedName } from '../controller/timeline';

const SPEED_ORDER: SpeedName[] = ['pause', '1x', '4x', '16x'];

const SPEED_LABELS: Record<SpeedName, string> = {
  pause: 'Pause',
  '1x': '1×',
  '4x': '4×',
  '16x': '16×',
};

/** Seconds of real time an in-game day takes at this speed. */
function dayLengthAt(speed: SpeedName): string {
  const tps = SPEEDS[speed];
  if (tps === 0) return 'paused';
  return `${(TICKS_PER_DAY / tps).toFixed(tps === 8 ? 0 : 2)}s`;
}

export function App(): JSX.Element {
  const [controller] = useState(() => createController());
  const [snapshot, setSnapshot] = useState<Snapshot>(() => controller.snapshot());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.start();
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller]);

  const setSpeed = (speed: SpeedName): void => controller.setSpeed(speed);

  return (
    <main className="panel">
      <h1>
        Day {snapshot.day} — {snapshot.period}
      </h1>

      <dl className="values">
        <Row label="Tick" value={snapshot.tick.toLocaleString()} />
        <Row label="Elapsed in-game minutes" value={snapshot.elapsedMinutes.toLocaleString()} />
        <Row label="Seed" value={String(snapshot.seed)} />
        <Row label="RNG cursor" value={String(snapshot.rngCursor)} />
        <Row label="Events this tick" value={String(snapshot.eventsThisTick)} />
        <Row label="Log length" value={String(snapshot.logLength)} />
        <Row label="Backlog" value={String(snapshot.backlogTicks)} />
      </dl>

      <div className="speeds" role="group" aria-label="Simulation speed">
        {SPEED_ORDER.map((speed) => (
          <button
            key={speed}
            type="button"
            className={speed === snapshot.speed ? 'active' : ''}
            aria-pressed={speed === snapshot.speed}
            onClick={() => setSpeed(speed)}
          >
            {SPEED_LABELS[speed]}
          </button>
        ))}
      </div>

      <p className="hint">
        A day is {TICKS_PER_DAY.toLocaleString()} minutes. At 1× it takes about {dayLengthAt('1x')}; at 16×,{' '}
        {dayLengthAt('16x')}.
        {' '}The RNG cursor stays at 0 because Stage 1 draws no randomness — that is correct, not a bug.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}