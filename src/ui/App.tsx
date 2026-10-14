/**
 * The interface.
 *
 * Reads a snapshot and sends commands. It contains **no simulation rules** and
 * never writes authoritative state — if a React component decided anything about
 * how the world works, that would be a bug (`D9`).
 *
 * Every number and every row here is derived by the controller from simulation
 * state. The priority buttons issue a command; they do not set anything.
 */

import { useEffect, useState } from 'react';

import { createController } from '../controller/controller';
import type { RosterEntry, Snapshot } from '../controller/controller';
import { SPEEDS } from '../controller/timeline';
import type { SpeedName } from '../controller/timeline';
import { PRIORITIES } from '../sim/priority';
import type { Priority } from '../sim/priority';
import { TICKS_PER_DAY } from '../sim/time';

const SPEED_ORDER: SpeedName[] = ['pause', '1x', '4x', '16x'];

const SPEED_LABELS: Record<SpeedName, string> = {
  pause: 'Pause',
  '1x': '1×',
  '4x': '4×',
  '16x': '16×',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  balanced: 'Balanced',
  'maintenance-first': 'Maintenance first',
  'meals-first': 'Meals first',
};

const PRIORITY_HINTS: Record<Priority, string> = {
  balanced: 'Works whichever queue is deeper.',
  'maintenance-first': 'Workshop first. Meals will back up.',
  'meals-first': 'Kitchen first. Workshop will back up.',
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
  const setPriority = (priority: Priority): void => controller.setPriority(priority);

  const completed = (snapshot.completedToday.maintenance ?? 0) + (snapshot.completedToday.meals ?? 0);

  return (
    <main className="panel">
      <h1>
        Day {snapshot.day} — {snapshot.period}
      </h1>

      <dl className="values">
        <Row label="Tick" value={snapshot.tick.toLocaleString()} />
        <Row label="Completed" value={completed.toLocaleString()} />
        <Row label="Seed" value={String(snapshot.seed)} />
      </dl>

      <section className="board">
        <h2>Facilities</h2>
        <div className="cards">
          {snapshot.facilities.map((facility) => (
            <article className="card" key={facility.id}>
              <h3>
                {facility.label} <span className="muted">{facility.jobLabel}</span>
              </h3>
              <p className="big">
                {facility.used}/{facility.capacity}
                <span className="muted"> busy</span>
              </p>
              <p className={facility.pending > 40 ? 'warn' : undefined}>
                {facility.pending} waiting
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="board">
        <h2>Roster</h2>
        <ul className="roster">
          {snapshot.roster.map((person) => (
            <RosterRow person={person} key={person.id} />
          ))}
        </ul>
      </section>

      <section className="board">
        <h2>Work priority</h2>
        <div className="speeds" role="group" aria-label="Work priority">
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              type="button"
              className={snapshot.priority === priority ? 'active' : ''}
              aria-pressed={snapshot.priority === priority}
              onClick={() => setPriority(priority)}
            >
              {PRIORITY_LABELS[priority]}
            </button>
          ))}
        </div>
        <p className="hint">{PRIORITY_HINTS[snapshot.priority]}</p>
      </section>

      <div className="speeds" role="group" aria-label="Simulation speed">
        {SPEED_ORDER.map((speed) => (
          <button
            key={speed}
            type="button"
            className={snapshot.speed === speed ? 'active' : ''}
            aria-pressed={snapshot.speed === speed}
            onClick={() => setSpeed(speed)}
          >
            {SPEED_LABELS[speed]}
          </button>
        ))}
      </div>

      <p className="hint">
        A day is {TICKS_PER_DAY.toLocaleString()} minutes. At 1× it takes about {dayLengthAt('1x')}; at 16×,{' '}
        {dayLengthAt('16x')}.
      </p>
    </main>
  );
}

function RosterRow({ person }: { person: RosterEntry }): JSX.Element {
  const percent =
    person.durationTicks === 0 ? 0 : Math.round((person.progressTicks / person.durationTicks) * 100);
  return (
    <li className={person.standby ? 'standby' : undefined}>
      <div className="who">
        <strong>{person.name}</strong> <span className="muted">{person.role}</span>
      </div>
      <div className="what">
        {person.task}
        {person.standby ? '' : <span className="muted"> — {percent}%</span>}
      </div>
      <div className="why">{person.reason}</div>
    </li>
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