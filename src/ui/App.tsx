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

const FOOD_TARGETS = [30, 60, 120, 240];

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
  const setFoodTarget = (target: number): void => controller.setFoodTarget(target);

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
        <h2>Base condition</h2>
        <div className="cards">
          <article className="card">
            <h3>Readiness <span className="muted">summary only</span></h3>
            <p className="big">{snapshot.readiness.toFixed(2)}</p>
            <p className={snapshot.readiness < 0.6 ? 'warn' : undefined}>
              {snapshot.readinessCauses.join(', ')}
            </p>
          </article>
          <article className="card">
            <h3>Larder</h3>
            <p className="big">
              {snapshot.food}
              <span className="muted"> meals</span>
            </p>
            <p className={snapshot.food < snapshot.foodTarget / 3 ? 'warn' : undefined}>
              {snapshot.supplies} supplies · target {snapshot.foodTarget}
            </p>
          </article>
        </div>
      </section>

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

      <section className="board">
        <h2>Larder target</h2>
        <div className="speeds" role="group" aria-label="Larder target">
          {FOOD_TARGETS.map((target) => (
            <button
              key={target}
              type="button"
              className={snapshot.foodTarget === target ? 'active' : ''}
              aria-pressed={snapshot.foodTarget === target}
              onClick={() => setFoodTarget(target)}
            >
              {target}
            </button>
          ))}
        </div>
        <p className="hint">
          The kitchen cooks while the larder is below this. A higher target means
          the kitchen always has work — and fewer people left for the workshop.
        </p>
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
    <li className={person.resting ? 'resting' : person.standby ? 'standby' : undefined}>
      <div className="who">
        <strong>{person.name}</strong> <span className="muted">{person.role}</span>
        {person.exhausted ? <span className="warn"> · too tired to work</span> : null}
      </div>
      <div className="what">
        {person.task}
        {person.standby || person.resting ? '' : <span className="muted"> — {percent}%</span>}
      </div>
      <div className="why">{person.reason}</div>
      {person.resting ? (
        <div className="bars">
          <span className="bar">
            <span className="fill sleep" style={{ width: '100%' }} />
          </span>
          <span className="muted">sleeping</span>
        </div>
      ) : (
        <div className="bars">
          <span className="bar" title="hunger">
            <span className="fill hunger" style={{ width: `${(person.hunger ?? 0) * 100}%` }} />
          </span>
          <span className="bar" title="fatigue">
            <span className="fill fatigue" style={{ width: `${(person.fatigue ?? 0) * 100}%` }} />
          </span>
          <span className="muted">
            hunger {(person.hunger ?? 0).toFixed(2)} · fatigue {(person.fatigue ?? 0).toFixed(2)}
          </span>
        </div>
      )}
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