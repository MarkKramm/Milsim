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
  nextEventId: number;       // Events owns log[] and nextEventId
  log: Event[];              // appended, never mutated
  pendingCommands: Command[]; // queue, drained at tick step 2 (see §4.0)
  intent: Intent[];          // policies set by the player (see §4.2)
  personnel: Person[];       // Stage 2
  jobs: Job[];               // Stage 2
  facilities: Facility[];    // Stage 2
  storage: Storage[];        // Stage 7 — owns holdings; `resources` is derived
  items: Item[];             // Stage 7
  decisions: Decision[];     // Stage 4
}
```

> **Corrected after the fourth external review and a Stage 1 plan review.** The
> earlier shape omitted `pendingCommands` and `nextEventId`, which the event and
> command contracts both require, and listed `readiness` as stored state when §3
> of `SYSTEM_DEPENDENCIES.md` says it is derived and **never persisted**. It also
> listed `resources` as its own field, before Storage and Resources were split.

**Readiness is not in this shape, and that is deliberate.** It is recomputed from
underlying conditions every tick and never stored, so no system can read a stale
copy (§4.1). `resources` is likewise absent — it is a derived aggregate over
`storage[]`, not a field anyone owns.

**Fields appear when their owning system arrives.** The stages in comments are
when each field first exists in state. A Stage 1 run therefore holds only the
first seven, and that is correct rather than incomplete.

**Serialization constraint:** nothing in `SimState` may be a class instance,
function, `Map`, `Set`, or `Date`. Plain data only. This is what makes save/load
cheap and is the one rule that pays for itself most often.

---

## 4. The tick loop

`tick(state) → SimState` — commands arrive through `state.pendingCommands[]`,
not as an argument (see §4.0).

Ordering within a tick is fixed and deterministic, and defined as numbered
**phases** in `SYSTEM_DEPENDENCIES.md` §4. That document is authoritative for
phase numbers; this one explains why.

| # | Step | Why here |
|---|---|---|
| 1 | Advance clock, then check for day rollover | Everything is relative to time. Rollover is checked **immediately after the tick advances and before commands are applied**, because it depends only on the clock. Tick 0 emits nothing. |
| 2 | Apply queued commands | Player commands land before anyone acts on them. A command issued last tick takes effect now, deterministically. |
| 3 | Apply intent to priority resolution | Intent must be readable by job selection. |
| 4 | Update facilities and items | Equipment wear affects whether a job is possible. |
| 5 | Apply deliveries | **Deliveries before consumption.** |
| 6 | Resource consumption and production | Consumes what just arrived. |
| 7 | Update needs | Needs change, *then* people react to them. |
| 8 | Job selection | Reads needs, availability, intent, items — all current. |
| 9 | Advance job progress | Work completes. |
| 10 | Relationships | Reads who worked with whom this tick. |
| 11 | Recompute derived summaries | Readiness and morale summarise everything above. |
| 12 | Check for new decisions | New situations arise from this tick's results. |

**There is no "emit events" step.** Systems emit as they go, so an event can
reference causes from earlier in the same tick. An earlier draft listed
"emit events" as step 10 while also treating the event system as the *first*
tier — incoherent. Events are a service, not a phase
(`SYSTEM_DEPENDENCIES.md` §2).

The order matters enormously and will be a common source of bugs. It is fixed
in one function and never rearranged casually.

**The order itself introduces biases and must be tested, not assumed correct.**
Two named cases to cover from day one, both with a decision of record:

- resource consumption vs. delivery arrival → **delivery first**
- need updates vs. job selection → **needs first**

Both are argued in `SYSTEM_DEPENDENCIES.md` §6, along with the test each one
requires.

**Determinism:** the same seed and the same commands must produce an identical
event log. Any use of `Date.now()`, `Math.random()`, or object key iteration
order in the simulation is a bug.

**Render rate is decoupled from tick rate.** The simulation may run many ticks
before the UI repaints. Eight ticks per second does **not** mean eight React
renders per second; the UI coalesces. This protects phone performance and
changes nothing about determinism.

### 4.0 The event-log contract

An earlier draft wrote `tick(state) → { state, events }` while also storing
`log[]` inside `SimState`. That is ambiguous: an event could be returned but
never appended, or appended twice. **Resolved — the log is the only copy.**

```ts
function tick(state: SimState): SimState
function enqueue(state: SimState, command: Command): SimState
```

- `state.log` is the single authoritative event history.
- `tick` returns the **whole new state**. It does not return a separate event
  array; callers read `newState.log`.
- The new state is a new object. The previous one is untouched, which is what
  makes time-travel debugging possible.
- `tick` is pure: same input, same output. No I/O, no clock reads, no globals.
- **Commands live in `state.pendingCommands[]` and nowhere else.** `enqueue`
  returns a new state with the command appended; `tick` drains the queue at
  step 2 and empties it.

> **Corrected after a Stage 1 plan review.** An earlier draft of this section
> showed `tick(state, commands)` taking commands as a parameter *while* also
> saying they were "drained from `state.pendingCommands`". Both cannot be true,
> and the ambiguity is dangerous rather than merely untidy: a caller that both
> enqueues a command and passes it would have it applied **twice**.
>
> The queue is the only source of truth, for a concrete reason rather than
> tidiness — the Stage 1 contract requires orders to be *persisted with state*,
> so a run saved mid-flight resumes with unissued orders intact (D15). A
> function parameter is not persisted, so it cannot be the primary channel.
>
> The parameter was therefore removed. `tick(state)` reads the queue and nothing
> else, and one code path owns every command in the system.

UI code that wants to know what happened this tick reads the tail of the log.
There is no other channel.

### 4.1 Readiness is derived, never an input

Corrected after external review — twice. The first correction made it derived
rather than a magic meter. The second resolved a contradiction: it is **both**
derived *and* incapable of affecting anything, because the underlying
conditions rule and readiness only explains them.

**Readiness summarises. It does not rule.** No system may read
`state.readiness`. The consequences of neglect are driven by fatigue, hunger,
injury, and workload — the conditions it aggregates. A person declines a hard
task because their fatigue crossed a threshold, not because a summary number
crossed one.

This is an architectural rule with teeth: if any system ever reads
`state.readiness`, that is a bug, because it would make tuning the summary
require re-tuning the world.

```ts
interface ReadinessBreakdown {
  score: number;
  contributors: { cause: string; delta: number }[];
  changedThisTick: { cause: string; delta: number }[];
}
```

The player must always be able to see *why* it moved. If readiness is presented
without its contributors, the feature has failed regardless of what it does.

**It may be cut entirely.** If it adds no information beyond hunger and fatigue
(which it may well not), deleting it costs one panel. That is the point of making
it a summary.

**Legitimate rest is not idleness.** Readiness must not fall while someone is
recovering from work. Only *unproductive* idleness — awake, capable of work, and
not recovering — counts against the base. Penalising rest is a design bug, not a
difficulty setting.

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