# Architecture

Technical foundation for the whole project, written before implementation so
the structure is decided once and the later stages slot into it.

Stack: **TypeScript + Vite + React**, running in a phone browser via a Termux
dev server.

---

## 1. The one non-negotiable rule

> **The simulation contains no UI code.**
>
> `src/sim/**` must not import React, the DOM, or anything browser-specific.
> It must be runnable in a plain Node script with no browser present.

This is checked by building the simulation as a separate module and running it
headless as a smoke test. If that test ever needs to be deleted to make
something work, the architecture is being violated.

Why it matters: it makes the game testable, reproducible, saveable, and lets a
headless run generate a whole day of events in under a second for debugging.

---

## 2. Layering

```
┌─────────────────────────────────────────────┐
│  UI (React)                                 │  reads state, sends commands
│  panels, roster, job board, report          │  no rules, no randomness
├─────────────────────────────────────────────┤
│  Controller                                 │  owns the clock, applies
│  tick loop, speed, pause, commands          │  commands, feeds state to UI
├─────────────────────────────────────────────┤
│  Simulation (pure)                          │  state → state + events
│  needs, jobs, resources, decisions, RNG     │  deterministic given seed
└─────────────────────────────────────────────┘
```

Dependencies point downward only. The simulation never calls up. The UI never
mutates simulation state directly.

---

## 3. State shape

One authoritative state object, plain JSON-serializable. This shape is the
contract for save/load (D15) and for replay.

```ts
interface SimState {
  seed: number;              // master seed for the run
  rngCursor: number;         // position in the seeded stream
  tick: number;              // 1 tick = 1 in-game minute
  personnel: Person[];
  jobs: Job[];
  facilities: Facility[];
  resources: Record<string, number>;
  readiness: ReadinessBreakdown;  // derived summary, never an input (see §4.1)
  playerIntent: Intent[];         // policies set by the player (see §4.2)
  pendingDecisions: Decision[];
  log: Event[];              // appended, never mutated
}
```

**Serialization constraint:** nothing in `SimState` may be a class instance,
function, `Map`, `Set`, or `Date`. Plain data only. This is what makes save/load
cheap and is the one rule that pays for itself most often.

---

## 4. The tick loop

`tick(state) → { state, events }`

Ordering within a tick is fixed and deterministic. Proposed order:

1. Advance clock.
2. Apply queued player decisions.
3. Apply player intent to job priority resolution.
4. Update needs (hunger, fatigue, and later hydration, morale).
5. Update facilities and equipment (wear, availability).
6. Run job selection (with hysteresis).
7. Advance in-progress job progress.
8. Apply resource consumption and production.
9. Recompute readiness **as a derived summary**.
10. Emit events for anything notable.
11. Check for new decisions or interrupts.

The order matters enormously and will be a common source of bugs. It is fixed
in one function and never rearranged casually.

**The order itself introduces biases and must be tested, not assumed correct.**
Consuming a resource before applying a pending delivery gives a different result
than the reverse, and neither is obviously right. Two named cases to cover from
day one:

- resource consumption vs. delivery arrival
- need updates vs. job selection (does a worker decide before or after their
  hunger changes this tick?)

**Determinism:** the same seed and the same commands must produce an identical
event log. Any use of `Date.now()`, `Math.random()`, or object key iteration
order in the simulation is a bug.

**Render rate is decoupled from tick rate.** The simulation may run many ticks
before the UI repaints. Eight ticks per second does **not** mean eight React
renders per second; the UI coalesces. This protects phone performance and
changes nothing about determinism.

### 4.1 Readiness is derived, never an input

Corrected after external review. Readiness is **not** a magic meter that drifts
on its own. It is recomputed each tick from observable underlying state, and it
is **never** an input to any other system — it only summarises and reports.

```ts
interface ReadinessBreakdown {
  score: number;
  contributors: { cause: string; delta: number }[];
  changedThisTick: { cause: string; delta: number }[];
}
```

The player must always be able to see *why* it moved. If readiness is presented
without its contributors, the feature has failed regardless of what it does.

**Legitimate rest is not idleness.** Readiness must not fall while someone is
recovering from work. Only *unproductive* idleness — awake, capable of work, and
not recovering — counts against the base. Penalising rest is a design bug, not
a difficulty setting.

### 4.2 Player intent is a design concept, not a UI control

Corrected after external review. The player's expressed intent is a first-class
simulation input, stored in state as data:

```ts
interface Intent {
  id: string;
  kind: 'priority' | 'reserve' | 'policy';
  target?: string;       // job, resource, or facility
  value: number | string | boolean;
}
```

The interface that sets an intent is only one way to set it. Headless tests set
intents directly, and a future preset system would set them without a UI. If
intent only exists as a slider in React, the design has leaked into the
interface again.

Intent must resolve into something personnel act on **and the player can see**.
An intent whose effect cannot be observed is a dead control.

---

## 5. Randomness

Single seeded stream, one function, no exceptions:

```ts
function rand(state: SimState): number   // deterministic draw
```

- Never `Math.random()` in `src/sim`.
- The UI never draws from the simulation stream — rendering must not shift the
  random sequence, or replay breaks.
- Seed is displayed in the UI so a run can be shared or reproduced.

---

## 6. Events and reports

- Every meaningful state change appends an `Event` with enough context to
  explain itself.
- **Reports read the log. They never recompute.** This makes "the report is
  accurate" true by construction.
- A player-facing decision stores the event IDs that caused it, so the report
  can say *why* a choice was offered.

```ts
interface Event {
  id: number;
  tick: number;
  type: string;
  tier: 'routine' | 'notable' | 'critical';
  subjects: string[];        // person/job/facility ids
  causeEventIds: number[];   // for causality
  data: Record<string, unknown>;
}
```

Causality is recorded, not inferred. That is what makes an explainable report
possible later without rewriting the simulation.

### 6.1 Significance tiers

Corrected after external review. An unstructured log becomes an unreadable
wall within days. Every event carries a tier:

| Tier | Meaning | Example | In the daily report? |
|---|---|---|---|
| `routine` | Internal bookkeeping | "hunger rose by 0.2" | No — never shown |
| `notable` | Something a person would mention | "Bakary completed the generator repair" | Yes, summarised |
| `critical` | Changes the player's situation | "Amina collapsed during the repair" | Yes, prominently, with causes |

The rule: **a person becoming slightly more tired is not a report entry. A
person becoming too exhausted to finish a critical repair is.**

Significance is assigned at write time by an explicit rule, never by ad-hoc
judgement scattered through the simulation. If most events end up `notable`,
the thresholds are wrong.

Reports work in three layers: **current state** (what is true now), **notable
events** (what changed), and **causal explanation** (why, and what it affected).
Only the third layer is genuinely expensive, and it is only built for `notable`
and `critical` events.

### 6.2 Do not build an event-sourcing framework

A plain append-only list with typed events and causal references is sufficient.
If a stage ever requires a full event-sourcing library, that is a signal the
design has outgrown its own log — fix the design first.

---

## 7. Decisions (the player agency layer)

A pending decision is data, not UI:

```ts
interface Decision {
  id: number;
  tick: number;
  prompt: string;
  options: { label: string; immediate: ...; delayed: ... }[];
  causeEventIds: number[];
  blocking: boolean;   // true only for the rare interrupt
}
```

- `blocking: false` → queued, resolved at the next decision point or in the
  report.
- `blocking: true` → the world pauses. Budgeted to roughly once per in-game day
  (D16).

This keeps decisions testable in a headless run — a script can answer them
programmatically, which is how decision balance gets tuned without a human in
the loop.

---

## 8. Project layout

```
military-base-sim-dev/
  docs/                all planning documents (source of truth)
  src/
    sim/               PURE simulation. No UI. The only place rules live.
      state.ts
      rng.ts
      tick.ts
      needs.ts
      jobs.ts
      resources.ts
      readiness.ts
      decisions.ts
      events.ts
    ui/                React components. No rules.
    controller/        clock, speed, command dispatch
  tools/
    headless.ts        runs N ticks with no browser — the architecture smoke test
```

`tools/headless.ts` is the enforcement mechanism for rule 1. It must keep
working forever.

---

## 9. Development workflow

- Dev server in Termux, opened in the phone browser. Vite hot reload.
- Headless runs for debugging: simulate a full day, print the event log.
- Playtest on the phone; that is the target device, so design for it.
- Docs live in `docs/`, code alongside. Sync docs to shared storage for reading.

---

## 10. Testing strategy

Prioritised in this order, per external review:

1. **Invariant tests — the primary suite.** Assert properties hold after N
   ticks: no negative resources, no infinite loops, nobody starves while food
   is in storage, readiness never falls during legitimate rest, no person holds
   two jobs at once. These catch real bugs and do not break when balance
   changes.
2. **Headless smoke test.** The simulation runs with no UI at all.
3. **Tick-order bias tests.** Two cases from day one: resource consumption vs.
   delivery arrival, and need updates vs. job selection.
4. **Golden runs — deliberately small.** A handful of fixed seeds producing a
   short digest (counts, notable events) rather than a full transcript. Large
   golden files break on every inconsequential change and get abandoned.

**Invariant tests first, golden runs second.** Exact-output testing is a
maintenance trap in a game whose balance is expected to change constantly.

---

## 11. Scaling the architecture later

Designed-for extensions, without building them:

| Later feature | How it fits |
|---|---|
| More needs | A needs module with a common interface; added one at a time. |
| Equipment condition | Facilities already hold condition; extend the struct. |
| Production chains | Resources and jobs are already a graph. |
| Vehicles | A person-like actor with different job types. |
| Save/load | Already free, given the serialization constraint. |
| Multiple bases | State holds a list; start with one. |
| External layer | A new event source feeding the same log. |

None of these require a rewrite. That is the goal of the structure, not the
structure itself.

---

## 12. What would invalidate this architecture

Honest failure modes:

- If the UI needs to know simulation internals to render sensibly, the boundary
  is wrong.
- If save/load ever becomes painful, the serialization constraint was broken.
- If the headless runner has to be abandoned to make features work, the
  separation has decayed.

Any of these is a signal to fix the boundary immediately, before building on it.