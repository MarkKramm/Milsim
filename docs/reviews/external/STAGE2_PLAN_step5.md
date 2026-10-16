# Milsim — Stage 2 Implementation Plan

**Prepared for:** MarkKramm / Milsim
**Workspace verified:** `~/military-base-sim-dev`, remote `MarkKramm/Milsim`, branch `main`, HEAD `88dbe92`, clean tree
**Status:** plan only. Nothing implemented. Nothing in the repository was modified.

## How to read this

| Tag | Meaning |
|---|---|
| `[V]` | **Verified** — read from the source or docs at HEAD `88dbe92`, or executed by me |
| `[D]` | **Documented** — quoted from a named authoritative document |
| `[P]` | **Proposed** — my recommendation, not yet approved |
| `[?]` | **Open** — needs your decision before or during the build |
| `[C]` | **Conflict** — two authoritative sources disagree; both readings given |

I executed: `npm test` (95/95 pass), `npm run build` (clean), and the headless
CLI twice on the same seed (byte-identical output). I did not modify the repo.

---

## 1. Executive verdict

**PROCEED — after two prerequisites that cost one evening, not one design pass.**

**Prerequisite 1 (blocking).** The Stage 1 manual phone gate has **never been
performed** `[V]`. `docs/reviews/STAGE1_EVIDENCE_AUDIT.md:62` and `:457` state it
plainly, and `AGENTS.md:26` still lists it as the next action. Stage 2's gate is the
first *gameplay* gate in the project; running it on an unverified foundation means
that if Stage 2 disappoints, you will not know whether the problem is the people or
the clock underneath them. Run it first (§11.1). It takes minutes.

**Prerequisite 2 (blocking, and the most valuable thing in this plan).** The
documented Stage 2 reference fixture **cannot produce the contention its own gate
requires** `[V]` — see §3.2, Conflict A. This is not a matter of taste: the roster
arithmetic makes the priority control inert under all three settings. The roadmap
anticipates exactly this case and authorises the fix (*"If one order wins every day,
the fixture is broken and must be adjusted before the gate is attempted"*
`[D]` `ROADMAP.md:207`). The smallest change is one line of the fixture table.

**The verdict in one paragraph.** Stage 2 is buildable as specified, with three new
pure modules (`personnel`, `facilities`, `jobs`), one real command type, one intent
resolution, a three-button priority control, and a roster panel that shows each
person's job *and the reason*. No new subsystem is required: the cross-day pressure
comes from **deferred work**, which is the only persistent state available before
Needs (Stage 3) and Storage/Items (Stage 7) exist. The plan is 12 steps, each
leaving `npm test` green.

---

## 2. Verified workspace and baseline

### 2.1 Identity `[V]`

```
path     /data/data/com.termux/files/home/military-base-sim-dev
remote   https://github.com/MarkKramm/Milsim.git (fetch and push)
branch   main
HEAD     88dbe92b2d331d9ee4eb74643e4578eff9008f44208
status   clean — no modified, staged, or untracked files
```

### 2.2 Commands I ran `[V]`

| Command | Result |
|---|---|
| `npm test` | 95 tests, 95 pass, 0 fail |
| `npm run build` | typecheck clean; Vite production build succeeded |
| `npm run headless -- --ticks 5000 --seed 42` (twice) | byte-identical stdout |
| `npm run headless -- --ticks 5000 --seed 42 --json` | `digest: "feecc016"`, `logLength: 3` |

I did **not** run `npm ci`, install packages, or change anything.

### 2.3 Files present at HEAD `[V]`

```
src/sim/        commands.ts  events.ts  intent.ts  rng.ts  state.ts  tick.ts  time.ts
src/sim/*.test  architecture  rng  tick  time
src/controller/ controller.ts  timeline.ts  (+ 2 tests)
src/ui/         App.tsx  styles.css
src/main.tsx
tools/           headless.ts  (+ test)  build-master.sh  extract-steps.js
                sync-docs.sh
.github/         workflows/ci.yml  workflows/docs.yml
scripts/TERMUX.md
```

No `jobs.ts`, `personnel.ts`, or `facilities.ts` exists yet. No `reports/`.

### 2.4 The gate in force `[V]`

`AGENTS.md:26` and `docs/REVIEW_BRIEF.md:13-14`: **"Stage 1 manual gate on the
phone, then Stage 2."** `STAGE1_EVIDENCE_AUDIT.md:96` lists the phone UI gate as
**UNVERIFIED — never opened in a browser**. That is the gate in force and this plan
respects it rather than assuming Stage 1 is signed off.

### 2.5 Differences from the historical baseline you gave me

None. 95 tests pass (matches), CI green locally (I did not push; the `ci` workflow
is green per the project's own record), and the "phone gate unverified" status is
unchanged. `rngCursor` is still 0 at Stage 1 because Stage 1 draws nothing — this
plan changes that (§5.6), which is a deliberate, documented consequence.

---

## 3. Authoritative requirements and document conflicts

### 3.1 The Stage 2 requirements, as documented

From `ROADMAP.md:148-220` (Stage 2) `[D]`, cross-checked against
`SYSTEM_DEPENDENCIES.md` §3–§4 `[D]` and `GAME_DESIGN_BLUEPRINT.md` `[D]`:

| Requirement | Source |
|---|---|
| 6–8 personnel with IDs, names, duties | `ROADMAP.md:151`; fixture fixes **7** |
| 3 jobs: eligibility, duration, prerequisites, outputs | `ROADMAP.md:152` |
| Autonomous selection: needs → duties → availability → **player intent** | `ROADMAP.md:153`; ladder from `BLUEPRINT` B3 §3 |
| Hysteresis (D6): finish or abandon, abandoning forfeits progress | `ROADMAP.md:154`; `LOCKED_DECISIONS.md:173-178` |
| Deterministic tie-breaking | `ROADMAP.md:155`; B3 §3 "lowest ID first, never randomly" |
| **One** priority intent — the entire command surface | `ROADMAP.md:156-157` |
| UI: roster showing each person's task **and the reason** | `ROADMAP.md:158-159`; fixture `:209-212` |
| Gate: watching them work is interesting, and one priority visibly changed what happened | `ROADMAP.md:161` |
| 3 of 4 gate-evidence items | `ROADMAP.md:45-68` |
| Fixture: 3 generalists, 2 maintenance-capable, 2 supply-capable | `ROADMAP.md:193` |
| Fixture: Maintenance / Meal prep / Standby; workshop cap 2, kitchen cap 2 | `ROADMAP.md:194-195` |
| Fixture: initial priority **Balanced** | `ROADMAP.md:196` |
| Fixture: Maintenance 90 min, meal 30 min | `ROADMAP.md:197` |
| Both settings must change behaviour; neither may dominate | `ROADMAP.md:199-207` |
| Stage 2 owns: `persons[]`, `facilities[]`, `jobs[]`, `intent[]` | `SYSTEM_DEPENDENCIES.md` §3 |
| Jobs is **phase 5**; Facilities is **phase 1** | `SYSTEM_DEPENDENCIES.md` §4 |

Ownership, verbatim from `SYSTEM_DEPENDENCIES.md:93-105` `[D]`:

> `persons[].identity, .role, .specialties, .history` | **Personnel** | read | **2**
> `persons[].currentTask, .taskProgress, .location` | **Personnel** | request | **2**
> `persons[].schedule` | **Personnel** | read, request | **2**
> `facilities[]`, `.capacity`, `.availability` | **Facilities** | request | **2**
> `jobs[]` — definitions, eligibility, prerequisites | **Jobs** | read | **2**
> `jobs[]` — progress, queues, assignment | **Jobs** | request | **2**
> `intent[]` | **Player intent** | read | **1**

### 3.2 Conflicts found, and which source controls

I checked every pair of documents against the code. Seven meaningful conflicts;
only A and F need a decision before building. Authority rules I applied, in order,
are the project's own: `SYSTEM_DEPENDENCIES.md` §3 controls *who writes a field*;
`SYSTEM_DEPENDENCIES.md` §4 controls *when it runs*; `ARCHITECTURE.md` §3 controls
*what shape the state is*; `ROADMAP.md` controls *stage scope*; and where the
roadmap contradicts a data-ownership rule, the ownership rule wins because a
roadmap cannot create a writer the ownership table does not.

#### Conflict A — the reference fixture cannot create contention `[C]` `[V]`

**This is the most important finding in this plan.**

Selection ladder, `BLUEPRINT` B3 §3 `[D]`: 1 urgent needs → 2 recovery → 3 **duties
(assigned role)** → 4 **player intent** → 5 opportunity. Needs and recovery are
Stage 3 and do not exist, so at Stage 2 every selection is decided by **rule 3,
duties**, before the player's intent is ever consulted.

Now count the fixture:

- Maintenance duty → people whose role is maintenance-capable: **2**.
- Workshop capacity: **2**.
- Meal-prep duty → people whose role is supply-capable: **2**.
- Kitchen capacity: **2**.

The duties rule alone fills both facilities exactly. A generalist reaches rule 4
(intent) only if a facility slot is *free*, and one never is. So:

- `maintenance-first`, `meals-first` and `balanced` produce **the same roster,
  the same queue depths, and the same event log** apart from the intent event.
- The priority control is **inert**, which fails gate item 3 ("a decision visibly
  changed what happened") before a line of code is written.
- `ROADMAP.md:199-207` states the two conditions the fixture must satisfy and says
  the fixture must be adjusted if they are not met. So the document authorises the
  correction.

**Smallest correction that satisfies the documented conditions** `[P]`:

| Element | Documented | Proposed | Why |
|---|---|---|---|
| Personnel | 3 generalists, 2 maintenance-capable, 2 supply-capable | **5 generalists, 1 maintenance-capable, 1 supply-capable** | Frees exactly one slot in each facility. Those two slots are then contested by 5 generalists, and the priority decides which facility they flow to. Total stays 7; jobs, capacities and durations unchanged. |
| Jobs | Maintenance, Meal prep, Standby | unchanged | Standby is the *fallback* (`ROADMAP.md:194` "plus a fallback"), which this plan reads as the state a person is in when nothing is claimable — see Conflict D. |
| Capacities | workshop 2, kitchen 2 | unchanged | Capacity is what creates contention (`ROADMAP.md:195`) and stays the documented 2. |
| Durations | 90 min / 30 min | unchanged | |
| Initial priority | Balanced | unchanged | |

This also matches `LOCKED_DECISIONS.md:452-461` (D22), which explicitly anticipates a
roster where a specialist pool may be one person and calls that acceptable at
Stage 2 — "possibly wrong for Stage 5", which is a later gate's problem, not this
one.

Two alternatives I considered and rejected:

- **Keep 2/2/3 and raise capacity to 3/3.** Also frees one slot per facility, but
  it changes a documented fixture number *and* weakens the "capacity creates
  contention" mechanism by making capacity easier to satisfy.
- **Keep 2/2/3 and narrow eligibility** (e.g. only generalists cook). Contrived, and
  under one setting it produces "all generalists idle", which is a worse artefact
  than the one it fixes.

`[?]` **Decision A1: approve the mix change (5/1/1), or reject it and accept a
Stage 2 gate that cannot pass.** There is no third option that keeps both the
documented mix and a working control.

#### Conflict B — "outputs" have nowhere to go at Stage 2 `[C]`

`ROADMAP.md:152` requires "3 jobs with eligibility, duration, prerequisites,
**outputs**". But `SYSTEM_DEPENDENCIES.md:98-99` places `storage[].holdings` at
**Stage 7** and `resources` (aggregate) at **Stage 3**, and `BLUEPRINT` B3 §4 says
Jobs "Writes job progress and **Resources** (on completion)". At Stage 2 no system
owns a stock, so there is nothing for a completion to write into.

**Resolution: the ownership table controls.** At Stage 2 a job's *output* is a
reduction of its own pending queue plus a `notable` event. A completed maintenance
work order consumes one pending order; a completed meal order consumes one pending
order. No resource exists, and none is invented. When Storage arrives at Stage 7
the completion gains a `consume`/`produce` request to Storage, exactly as
`SYSTEM_DEPENDENCIES.md:128` describes ("Consumption is therefore a request from
the consuming system to Storage, never a direct write").

#### Conflict C — `jobs[]` "assignment" is owned by Jobs, but `persons[].currentTask` by Personnel `[C]`

Both are Stage 2 and both describe the same fact.

**Resolution: the documented request pattern** (`SYSTEM_DEPENDENCIES.md:69-83`)
`[D]`. `jobs.ts` never writes a person field; it calls one function exposed by
`personnel.ts` (`claimTask(person, jobId, reason)` `[P]`) which returns a new
person. `facilities.ts` likewise exposes only a read predicate
(`hasFreeCapacity` `[P]`); nothing writes facilities at Stage 2 because capacity is
static, so the phase-1 step is **absent rather than stubbed** — the precedent set by
`STAGE1_PLAN_v4.md:52-57` ("No generic phase scheduler... later phases are absent,
not stubbed"). When Stage 7 adds condition, a phase-1 step is added *then*.

#### Conflict D — is Standby a job or a fallback? `[C]`

`ROADMAP.md:152` calls it one of three jobs; `:194` calls it "a fallback".
**Resolution: fallback.** `BLUEPRINT` B3 §3 rule 5 is "Opportunity — anything else
eligible and unclaimed", and a person who reaches no rule stands by. Modelling
Standby as a queue would require inventing standby work, which no document defines.
`[?]` Decision A2: confirm this reading.

#### Conflict E — the blueprint numbers Facilities as a "system" with events, but nothing changes it at Stage 2 `[C]`

`BLUEPRINT` D2 is "SETTLED · Stage 2" and lists events ("Facility unavailable
(notable), condition degraded"). But D2 §11 says "Stage 2 (basic), **7
(condition)**", and at Stage 2 the only cause of unavailability is occupancy, which
is capacity. **Resolution: no facility events at Stage 2.** Occupancy is derived
from `persons[]`, so there is nothing for Facilities to report. Revisit at Stage 7.

#### Conflict F — `ARCHITECTURE.md` §3 declares the Stage 2 fields; a live test forbids them `[C]` `[V]`

`ARCHITECTURE.md:57-59` documents `personnel: Person[]`, `jobs: Job[]`,
`facilities: Facility[]` as Stage 2 state. But `src/sim/architecture.test.ts:113-127`
asserts `SimState` declares **none** of `personnel`, `facilities`, `jobs`, `storage`,
`items`, `readiness`, `resources`. Adding the Stage 2 fields therefore fails an
existing test. **This is expected and must be updated, not worked around** — the
test's purpose ("no placeholder systems for future stages") is preserved by letting
it permit exactly the three Stage 2 fields and continuing to forbid the rest.

#### Conflict G — two documents list Stage 2 fields the design does not use yet `[C]`

`persons[].specialties` (B2 is **Stage 6**, and B2 §3 says specialties modify *rate
and reliability*, never eligibility) and `persons[].location` are Stage 2 in the
ownership table but have no Stage 2 rule that reads them. **Resolution: omit both.**
`location` is derived for display from the current task's facility. Omitting a field
costs nothing to add later; storing one nothing reads is the placeholder the project
repeatedly refuses (`state.ts:20-23`, `STAGE1_PLAN_v4.md:52`). `[?]` Decision A3:
confirm.

---

## 4. Stage 2 gameplay hypothesis and success criteria

### 4.1 The hypothesis

`OPEN_QUESTIONS.md` Q25 `[D]` adopts the sharpened design test for the whole
project:

> Can the player anticipate a problem, make a meaningful intervention, and later
> recognise the consequences of that intervention?

At Stage 2's scale, reduced to what Stage 2 can actually answer
(`ROADMAP.md:163-174` `[D]`):

> **Does expressing a priority change autonomous behaviour in a way the player can
> observe?**

The full trade-off-under-uncertainty version is Stage 4's question. Stage 2 asks the
cheaper half, and the roadmap is explicit that this is deliberate rather than a gap.

### 4.2 Minimum player experience

The player opens the phone and sees:

1. **Day N — Period** (already exists).
2. **A priority control with three states** — Balanced / Maintenance first /
   Meals first. One control, the whole command surface (`ROADMAP.md:156-157`).
3. **Two facility cards** — workshop and kitchen — each showing occupancy `n/2` and
   the number of queued work orders.
4. **A roster of seven people**, each row showing name, role, the job they are doing
   *right now*, how far through it they are, and **the literal reason they chose it**
   (`BLUEPRINT` B3 §9 `[D]`: *"the literal reason it was chosen — 'no food
   available, hungry' beats 'selected job #3.'"*).
5. **A short recent-events feed** read from `state.log`.

The player's whole loop is: watch, form a prediction ("meals are going to pile up if
I keep pushing maintenance"), change one control, and see the queue trajectories
diverge over the next day or two.

### 4.3 What makes the Day 4–5 gate meaningful

The gate names Days 4–5 specifically (`ROADMAP.md:178-179`) because Day 1 is
contaminated by novelty and item 4 of the evidence list is the honest one: *"play a
fourth and fifth day without novelty, and notice whether you are still watching."*

For Day 4 to differ from Day 1, two things must be true, and the design must supply
both:

| Requirement | What supplies it |
|---|---|
| State that **persists** across the day boundary | Deferred work: the pending queues are not cleared at rollover. A backlog built on Day 1 is still there on Day 2. |
| Demand that is **not identical every day** | Seeded jitter on work-order arrivals (§5.5). Without it, Days 1–5 are the same day five times and the test is unwinnable for the wrong reason. |

The roadmap makes the second point itself at `BLUEPRINT` B5 §7 `[D]`: *"A schedule
everyone shares produces the same contention every day. Variation creates different
bottlenecks on different days."* B5 is a Stage 3 system, so Stage 2 borrows only the
principle, in the smallest possible form: jitter on arrival timing, drawn from the
seeded stream.

### 4.4 Gate evidence mapped to Stage 2 observables

| Evidence item (`ROADMAP.md:55-68`) | What must be observable at Stage 2 | Automated or manual |
|---|---|---|
| 1. Explain what happened without reading the source | The roster's reason string names the rule that fired | Manual |
| 2. Noticed something before the report told you | The kitchen card shows occupancy `1/2` while the meal queue climbs | Manual |
| 3. A decision visibly changed what happened | Queue trajectories diverge between settings | **Automated prerequisite** (§8.4) |
| 4. Continued past the point novelty wore off | Days 4–5 still watched | Manual |

### 4.5 What Stage 2 cannot prove — stated plainly

**Stage 2 cannot make a missed meal *hurt*.** Hunger is Stage 3, storage and items
are Stage 7, and the readiness spine is Stage 3 (`ROADMAP.md:224-246`). Until then, a
growing meal queue is a number on a card. The plan therefore does not pretend the
trade-off has teeth; it builds the **mechanism** the trade-off runs on, and records
whether the mechanism alone is enough to watch.

This matters because of how the roadmap handles failure: *"If a gate fails, the
response is to fix or simplify that stage — not to build the next one."* If Day 4 is
boring, the correct response is to simplify Stage 2 (fewer people, faster jobs, a
more legible roster), **not** to pull hunger forward. That instruction is in §9 and
§10 so it survives into the build.

---

## 5. Proposed minimal design and alternatives considered

### 5.1 Design in one diagram `[P]`

```
                     ┌─────────────────────────────┐
   intent[]  ───────▶│  resolvePriority()  [phase 0]│─── ordered job ids (local, never stored)
                     └─────────────────────────────┘
                                    │
                     ┌──────────────▼───────────────┐
   jobs[].pending ───│  arrivals      [phase 5]     │─── seeded jitter, +1 pending per arrival
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
  persons[]          │  selection     [phase 5]     │─── per person, ascending id:
  facilities[]       │                             │    first job in order with
  (capacity predicate│                             │    • eligibility (role)
   read, not written)│                             │    • pending > 0
                     │                             │    • a free facility slot
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
                     │  progress      [phase 5]     │─── advance; on completion:
                     └─────────────────────────────┘    pending -= 1, notable event,
                                                         history entry, task cleared
```

### 5.2 State shape `[P]`

Three arrays added to `SimState`, exactly the Stage 2 rows of `ARCHITECTURE.md:53-61`:

```ts
interface SimState {
  // ... existing seven fields unchanged ...
  personnel: Person[];     // Stage 2
  jobs: Job[];             // Stage 2
  facilities: Facility[];  // Stage 2
}
```

Plain JSON only — no class, function, `Map`, `Set` or `Date`
(`ARCHITECTURE.md:71` `[D]`, enforced by invariant 15).

```ts
// src/sim/personnel.ts                                         [PROPOSED — new file]
export type Role = 'generalist' | 'maintenance' | 'supply';

export interface Person {
  id: string;                    // 'p1' … 'p7', stable forever (B1 §3)
  name: string;                  // drawn from the seeded RNG at creation (B1 §3)
  role: Role;                    // the eligibility key at Stage 2
  currentTask: ActiveTask | null;
  history: TaskRecord[];         // capped; recent outcomes, for the roster
}
export interface ActiveTask {
  jobId: JobId;
  startedTick: number;
  progressTicks: number;
  reason: string;                // the literal rule citation — legibility lives here
}
export interface TaskRecord {
  tick: number;
  jobId: JobId;
  outcome: 'completed' | 'abandoned';
}
```

```ts
// src/sim/facilities.ts                                        [PROPOSED — new file]
export interface Facility {
  id: string;                    // 'workshop' | 'kitchen'
  label: string;
  capacity: number;              // 2 (fixture) — static at Stage 2
  servesJobId: JobId;
}
```

```ts
// src/sim/jobs.ts                                              [PROPOSED — new file]
export type JobId = 'maintenance' | 'meals';

export interface Job {
  id: JobId;
  label: string;
  facilityId: string;
  durationTicks: number;         // 90 maintenance, 30 meals (fixture)
  eligibleRoles: Role[];         // maintenance: [maintenance, generalist]
                                 // meals:      [supply, generalist]
  arrivalIntervalTicks: number;  // demand cadence — tunable fixture constant
  arrivalJitterTicks: number;    // seeded jitter — day-to-day variety
  nextArrivalTick: number;       // Jobs owns this
  pending: number;               // queued work orders = deferred work
  completionTier: EventTier;     // explicit significance rule (ARCHITECTURE §6.1)
}
```

Deliberately **absent**, with reasons: `specialties` (B2 is Stage 6; B2 §3 says it
modifies rate and reliability, never eligibility); `location` (derived for display);
`schedule` (B5 is Stage 3); `personalitySeed` (B1 §2 lists it, but no Stage 2 rule
reads it, and storing unread data is the placeholder the project refuses);
`readiness` and `resources` (`ARCHITECTURE.md:63-69` — derived, never persisted).

**Occupancy is derived, never stored.** `persons.filter(p => p.currentTask?.jobId ===
job.id).length` is the single source of truth. Storing an occupancy count would
create the exact duplication `SYSTEM_DEPENDENCIES.md:4-17` exists to prevent.

### 5.3 Selection — the algorithm `[P]`

Deterministic, no randomness (B3 §3: "Tie-breaking is deterministic — lowest ID
first, never randomly"):

```
selection(persons ascending id, priorityOrder):
  for person where currentTask === null:
    for jobId in priorityOrder:
      job = jobs[jobId]
      if job.eligibleRoles includes person.role
         and job.pending > 0
         and facilityHasFreeSlot(job.facilityId, persons, jobs):
        personnel.claimTask(person, jobId, reason=rule that fired)
        break
    else: person stands by — currentTask stays null
```

`resolvePriority(intent)` `[P]`:

| Intent value | Order |
|---|---|
| `maintenance-first` | `['maintenance', 'meals']` |
| `meals-first` | `['meals', 'maintenance']` |
| `balanced` | sorted by `pending` descending, ties broken by `['maintenance', 'meals']` |

`balanced` is a genuine neutral baseline — it always attacks the deeper backlog —
rather than an arbitrary tie-break, which matters because the roadmap calls Balanced
"the neutral baseline both other settings must beat".

Stored in state as one entry, using the `Intent` type that already exists
(`src/sim/intent.ts`, `ARCHITECTURE.md:224-231` `[D]`):

```ts
{ id: 'priority', kind: 'priority', value: 'maintenance-first' | 'meals-first' | 'balanced' }
```

`intent[]` is already Stage 1 state and is currently empty, so **no new state field is
needed for intent** — it is the first thing to actually be written.

### 5.4 Progress, completion, hysteresis `[P]`

```
progress(persons ascending id):
  for person where currentTask !== null:
    task.progressTicks += 1
    if task.progressTicks >= job.durationTicks:
       jobs[jobId].pending -= 1
       emit(task_completed, tier: job.completionTier, subjects: [personId, jobId])
       personnel.recordOutcome(person, 'completed')
```

**Hysteresis (D6), honestly scoped.** A person selects a task only when
`currentTask === null`, so switching is impossible without an explicit abandonment.
That satisfies invariant 3 (no person holds two active jobs) and invariant 9 (no
oscillation) structurally — they cannot be violated by construction.

Abandonment, however, has **no trigger at Stage 2**: facilities do not degrade
(condition is Stage 7), people cannot be injured (Stage 6), and no schedule removes
them from duty (B5 is Stage 3). I therefore propose implementing the *no-silent-
switching* half of D6 now and adding the abandonment branch when its first trigger
exists, together with the forfeit rule B3 §3 requires ("the forfeit must be slightly
larger than 'a better task just appeared'"). Adding an abandonment branch with no
trigger would be untestable code — exactly what the project refuses to scaffold.

### 5.5 Arrivals — where the cross-day pressure comes from `[P]`

```
arrivals(tick, jobs, rand):
  for job in jobs:
    if tick >= job.nextArrivalTick:
      job.pending += 1
      emit(work_order_queued, tier: 'routine', subjects: [jobId])
      jitter = Math.floor(rand() * (2 * job.arrivalJitterTicks + 1))
                 - job.arrivalJitterTicks
      job.nextArrivalTick = tick + job.arrivalIntervalTicks + jitter
```

Two properties worth stating because they are what make this safe:

- **The RNG is consumed only inside the Jobs phase, in a fixed job order.** Arrival
  jitter is the *only* place Stage 2 draws randomness during a tick, and it is drawn
  in a fixed order, so the stream alignment is deterministic. This is the property
  `SYSTEM_DEPENDENCIES.md:415` warns about ("Anomaly system inventing its own
  randomness … or the replay breaks").
- **Deferred work is never discarded.** `pending` carries across the day boundary
  untouched; nothing clears it at rollover. That is the entire persistence mechanism.

`[?]` **Decision A4 — the two arrival constants** (interval and jitter). The plan
does not prescribe exact numbers, because the right numbers are the ones that make
the §8.4 non-dominance test pass. Proposed starting point: maintenance one order per
~600 ticks with ±120 jitter, meals one order per ~100 ticks with ±20 jitter — chosen
so both queues stay non-empty most of the day. **Tune these against the test, not by
feel.**

### 5.6 Randomness budget `[P]`

Stage 1 draws nothing, so `rngCursor` is 0. Stage 2 draws for two things:

1. **Names**, once, in `createRun` in fixed person order (`BLUEPRINT` B1 §3:
   *"Names are fixed at creation from the seeded RNG — never randomly generated
   outside it, or replay breaks."*).
2. **Arrival jitter**, per arrival, in fixed job order.

Consequence: `rngCursor` is **7 immediately after `createRun`** and grows thereafter.
Four existing assertions hard-code `0` and must be updated — see §8.3. This is a
correct and expected change, not a determinism regression.

### 5.7 Alternatives considered for "consequences across days"

The brief asks for alternatives to be compared, not just chosen. These are the real
options, and none is adopted beyond the chosen one.

| # | Mechanism | Implementation cost | Clarity | Failure mode | Scope verdict |
|---|---|---|---|---|---|
| **1** | **Deferred work (queues persist)** `[chosen]` | Low — one integer per job, never cleared at rollover | High — visible as a number on a facility card, and in the roster's reason strings | Can degenerate into "a number that grows", which does not *hurt* | **Adopt.** The only persistent state available before Stages 3 and 7. |
| 2 | Hunger/fatigue pull-forward (Stage 3 early) | Medium — the Needs system, two needs, thresholds, consequence ladder | Medium | Two needs tuned at once means you cannot attribute an effect; violates `ROADMAP.md:224-246` staging | **Reject.** Breaks stage order and D13. |
| 3 | Facility condition / wear (Stage 7 early) | Medium — condition field, wear rule, unavailability cause | Medium | Wear needs a *cause*, which is use — that is Items (Stage 7). D2 §11 puts condition at 7 | **Reject.** |
| 4 | Deadlines / penalties | Medium — a deadline concept with no owner in the ownership table | Low | Invents a subsystem `SYSTEM_DEPENDENCIES.md` does not name | **Reject.** |
| 5 | A resource economy | High — Storage is Stage 7, aggregate Resources Stage 3 | — | Rejected by Conflict B | **Reject.** |
| 6 | Announcements / scripted pressure | Low | Low | D3 forbids scripted story beats; D3's hybrid anomaly model is Stage 5 | **Reject.** |

---

## 6. Architecture and data-flow plan

### 6.1 Module map — existing versus new `[V]` `[P]`

| Module | Status | Owns | Notes |
|---|---|---|---|
| `src/sim/state.ts` | **exists** `[V]` | all fields, by delegation | add 3 fields to `SimState` and to `draftOf`'s copy; `createRun` builds the fixture |
| `src/sim/tick.ts` | **exists** `[V]` | the tick sequence | add phase-5 steps; the step-4 intent no-op becomes real |
| `src/sim/rng.ts` | **exists** `[V]` | `rand`, `rngCursor` | unchanged — consumed by `createRun` and arrivals |
| `src/sim/events.ts` | **exists** `[V]` | `emit`, `log`, `nextEventId` | unchanged; new event *types* are strings, not new code |
| `src/sim/commands.ts` | **exists** `[V]` | `Command`, `applyCommands`, `enqueue` | `Command` stops being `never`; `applyCommands` gains a real handler |
| `src/sim/intent.ts` | **exists** `[V]` | `Intent` type | add `resolvePriority` |
| `src/sim/time.ts` | **exists** `[V]` | derived day/period | unchanged |
| `src/sim/personnel.ts` | **new** `[P]` | `persons[]` | identity, eligibility read, task claiming |
| `src/sim/facilities.ts` | **new** `[P]` | `facilities[]` | capacity data + one read predicate |
| `src/sim/jobs.ts` | **new** `[P]` | `jobs[]`, queues | arrivals, selection, progress |
| `src/controller/controller.ts` | **exists** `[V]` | clock, `this.state` | add `dispatch`; extend `Snapshot` |
| `src/ui/App.tsx` | **exists** `[V]` | nothing | roster, facility cards, priority control |
| `tools/headless.ts` | **exists** `[V]` | nothing | extend the summary; must keep working |

`tools/headless.ts` is the guardrail (`BLUEPRINT` G2 `[D]`: *"If it ever has to be
stubbed to make a feature work, the architecture has broken — fix that first"*). It is
step 10, deliberately after the simulation is complete, so any breakage is caught
while the code is still fresh.

### 6.2 The tick sequence `[P]`

Compared against `SYSTEM_DEPENDENCIES.md:165-178` `[D]`. Existing steps 1–3 are
untouched.

| # | Operation | Phase | Status |
|---|---|---|---|
| 1 | Advance clock | 0 | **exists** `tick.ts:33` |
| 2 | Check day rollover | 0 | **exists** `tick.ts:42` |
| 3 | Drain commands | 0 | **exists**, now handles `set_priority` |
| 4 | Apply intent to priority resolution | 0 | **no-op becomes real** — computes an ordered job-id list, held in a local, never stored |
| 5 | Update facilities and items | 1 | **absent** — nothing to update; capacity is static. Phase table rule satisfied by Jobs *reading* facility data (1 ≤ 5) |
| 6 | Apply deliveries | 2 | absent — Delivery is Stage 3 |
| 7 | Resource consumption / production | 3 | absent — Stages 3/8 |
| 8 | Update needs | 4 | absent — Stage 3 |
| 9 | **Job arrivals** | 5 | **new** |
| 10 | **Job selection** | 5 | **new** |
| 11 | **Job progress** | 5 | **new** |
| 12 | Relationships | 8 | absent — Stage 4 |
| 13 | Derived summaries | 9 | absent — Stage 3 |
| 14 | New decisions | 10 | absent — Stage 4 |

**Why arrivals sit before selection:** a work order that arrives at tick *N* can be
claimed at tick *N*. The alternative (arrivals last) defers every order by one tick.
Both are deterministic; the first is easier to reason about when reading the log.
`[?]` Decision A5: confirm.

**Why selection precedes progress:** matches `SYSTEM_DEPENDENCIES.md:167-171`
("Job selection — phase 5", then "Advance job progress — phase 5") and means a person
newly selected this tick does not also gain progress this tick, keeping the
progress-per-tick rate identical for everyone.

**Reads respect invariant 19** (`SYSTEM_DEPENDENCIES.md:145-147`): the Jobs phase (5)
reads personnel data (Personnel, written in the same phase via the request pattern),
facility capacity (phase 1), the resolved priority (phase 0), and its own queue. It
reads nothing from a later phase.

### 6.3 Ownership seams `[P]`

The request pattern from `SYSTEM_DEPENDENCIES.md:69-83` `[D]`, instantiated with the
minimum ceremony:

```
jobs.ts decides:        "p3 should work maintenance, because the queue is deeper"
personnel.ts applies:   person.currentTask = { jobId, reason, progressTicks: 0, startedTick }
facilities.ts answers:  hasFreeSlot(facilityId, persons, jobs)  — a read, never a write
```

`facilities.ts` exports **only** a predicate at Stage 2. Nothing writes facilities, so
no request protocol is needed there yet.

The static ownership guard is extended, not replaced (step 9): one test per module
asserting that only its owner writes its fields, mirroring the existing
`architecture.test.ts:101-111` guard for `rngCursor`.

### 6.4 Event catalog `[P]`

Tier assignment at write time by an explicit rule, per `ARCHITECTURE.md:280-305`
`[D]` ("Significance is assigned at write time by an explicit rule, never by ad-hoc
judgement"). And note `ARCHITECTURE.md:302`: *"a person becoming slightly more tired
is not a report entry"* — so a completed meal is **routine** and a completed repair is
**notable**, which is why `Job.completionTier` exists.

| Type | Tier | subjects | data | Rationale |
|---|---|---|---|---|
| `day_rollover` | routine | — | `{ day }` | exists `[V]` |
| `command_rejected` | routine | — | `{ command }` | exists `[V]` |
| `priority_set` | routine | — | `{ value }` | A4 §8: "Command application is recorded when it changes something"; C1 §8: "Intent changed (routine…)" |
| `work_order_queued` | routine | `[jobId]` | `{ jobId }` | one per arrival — bookkeeping, must not reach a report |
| `task_claimed` | routine | `[personId, jobId]` | `{ personId, jobId, reason }` | B3 §8; the reason is the legibility mechanism |
| `task_completed` | **`job.completionTier`** | `[personId, jobId]` | `{ personId, name, jobId, ticksTaken }` | §6.1: a completed repair is notable; a routine meal is not |
| `task_abandoned` | notable | `[personId, jobId]` | `{ personId, jobId, forfeitedTicks }` | B3 §8 — **unreachable at Stage 2** (§5.4); defined so the shape is ready |

`causeEventIds` stays empty at Stage 2. Linking a claim back to the `priority_set`
event that caused it requires either a log scan inside `tick()` or extra state, and
invariant 6 is already exercised by the existing suite. Causal linkage is explicitly
a Stage 4 report concern (`ROADMAP.md:262`).

**Log-volume guard.** With ~16 maintenance + ~21 meal arrivals per in-game day plus
claims, a day is roughly 100–150 events, mostly `routine`. `STAGE1_EVIDENCE_AUDIT.md:459`
lists "Behaviour with a large log" as unverified, so §8.3 adds a test asserting the
**notable** count per in-game day stays small (the §6.1 rule: *"If most events end up
notable, the thresholds are wrong"*). A3 §2 permits a cap that preserves `critical`
events; not needed at this volume.

### 6.5 Controller changes `[P]`

`src/controller/controller.ts:24-36` defines `Snapshot` `[V]` — *"Everything the UI is
allowed to read. All of it derived, none of it authoritative."*

One addition:

```ts
dispatch(command: Command): void {
  this.state = enqueue(this.state, command);
}
```

Generic rather than a `setPriority` method, because `BLUEPRINT` A4 §9 `[D]` says
*"Controls issue commands; they never mutate state directly"* — a generic `dispatch`
makes that true by construction, and Stage 4 will need it anyway. Commands are queued
and applied at the next tick's step 3, so a click mid-frame cannot affect the tick in
progress (`A4 §3` `[D]`).

`Snapshot` gains, all derived:

```ts
priority: PriorityValue;
roster: Array<{ id, name, role, jobLabel | 'Standby', reason | null,
                progressLabel | null, facilityLabel | null }>;
facilities: Array<{ id, label, occupancy, capacity, pending }>;
```

`snapshot()` is already called at most every `NOTIFY_INTERVAL_MS` (100 ms) `[V]`, so
deriving a 7-row roster there is cheap. No extra simulation cost.

One caution carried forward from the evidence audit: `src/ui/App.tsx` is **never
imported by any test** `[V]` (`STAGE1_EVIDENCE_AUDIT.md:465`), so a green build says
nothing about the new UI. §11.1 covers this.

### 6.6 Determinism analysis `[V]`

Stage 2 keeps every property Stage 1 established, and changes exactly one thing.

| Source of divergence | Status |
|---|---|
| `Math.random()` in `src/sim` | absent `[V]`, guarded by `architecture.test.ts:75-79` |
| Clock reads in `src/sim` | absent `[V]`, guarded by `architecture.test.ts:81-88` |
| Module-level mutable state | none in `src/sim` `[V]` |
| Object-key / `Map` / `Set` iteration order | none in `src/sim` `[V]` |
| Selection tie-break | ascending `person.id` — fixed, no RNG `[P]` |
| RNG stream alignment | fixed draw order: 7 name draws in `createRun`, then per arrival in fixed job order `[P]` |
| Controller frame timing | affects **how many** ticks run per second, never the content of a tick `[V]` |
| **New**: arrival jitter | seeded, persisted in `rngCursor`, replay-safe `[P]` |

The one genuinely new risk is the RNG alignment in §5.5, and the test in §8.3
(same seed + same command sequence → identical whole state) is what holds it.

---

## 7. Step-by-step implementation sequence

Twelve steps, dependency-ordered. **Every step leaves `npm test` green.** If a step's
tests do not pass, do not proceed to the next one — that rule is what stops a
beginner from accumulating three unexplained failures.

### Step 1 — Types and state shape

**Objective.** Make the Stage 2 state legal, with no behaviour yet.
**Files.** `src/sim/personnel.ts`, `src/sim/facilities.ts`, `src/sim/jobs.ts` (type
declarations only), `src/sim/state.ts`.
**State change.** `SimState` gains `personnel`, `jobs`, `facilities`; `draftOf` copies
all three; `createRun` returns a fixture with 7 people (placeholder names), 2
facilities, 2 jobs.
**Tests.** Extend `src/sim/architecture.test.ts:113-127` to permit the three Stage 2
fields and continue to forbid `storage`, `items`, `readiness`, `resources`. Keep
`src/sim/tick.test.ts` passing.
**Acceptance.** `npm test` green; a fresh run has 7 personnel, 2 facilities, 2 jobs;
`statesEqual` still compares whole states.
**Risk.** The forbidden-fields test fails on first run — that is the expected signal
that the test needs widening, not that the design is wrong.

### Step 2 — Names from the seeded stream

**Objective.** Satisfy `BLUEPRINT` B1 §3 and make `rngCursor` meaningful.
**Files.** `src/sim/personnel.ts` (name table + draw loop), `src/sim/rng.ts` (unchanged).
**Behaviour.** `createRun` draws 7 names in ascending person order from `rand()`.
**Tests.** New `src/sim/personnel.test.ts`: names stable for a seed; two seeds give
different name sets; `rngCursor === 7` after `createRun`; a JSON round-trip preserves
names.
**Acceptance.** Deterministic names; no name is generated outside `rand()`.
**Risk.** Anyone adding a person later without a draw breaks replay — add a test that
`persons.length * 1` draws occurred.

### Step 3 — Facility capacity predicate

**Objective.** One place that answers "is a slot free", derived from `persons[]`.
**Files.** `src/sim/facilities.ts`.
**Behaviour.** `occupancyOf(facilityId, persons, jobs)` and
`hasFreeSlot(...)`. Occupancy counts `persons` whose `currentTask.jobId` is served by
that facility.
**Tests.** New `src/sim/facilities.test.ts`: 0/2, 1/2, 2/2 (full); a person on a job
served by another facility does not count; a standby person does not count.
**Acceptance.** Capacity is never exceeded for any reachable state.
**Risk.** Low.

### Step 4 — Intent resolution

**Objective.** Turn the priority intent into a job order.
**Files.** `src/sim/intent.ts` (add `resolvePriority`), `src/sim/commands.ts`,
`src/sim/tick.ts`.
**Behaviour.** Step 4 of `tick()` computes an ordered job-id array into a local.
`resolvePriority` handles all three values and defaults to `balanced` for an unknown
value.
**Tests.** New `src/sim/intent.test.ts`: three settings give the documented orders;
`balanced` sorts by pending descending; ties break `maintenance` before `meals`; an
absent or invalid intent yields `balanced`.
**Acceptance.** Pure function, no state, no RNG.
**Risk.** Low. Keep this a pure function so it is trivially testable — it is the
piece the whole gate depends on.

### Step 5 — Arrivals and deferred work

**Objective.** The cross-day pressure.
**Files.** `src/sim/jobs.ts` (arrivals), `src/sim/tick.ts`.
**Behaviour.** At the start of the Jobs phase, each job checks `nextArrivalTick`,
appends to `pending`, emits `work_order_queued` (routine), and schedules the next
arrival with seeded jitter.
**Tests.** New `src/sim/jobs.test.ts`: identical seeds → identical arrival ticks and
pending values; different seeds → different arrival ticks; jitter never makes an
interval negative; `pending` is **not** cleared at a day boundary (run 3 days, assert
`pending > 0` throughout).
**Acceptance.** Deferred work survives rollover; arrival timing is reproducible.
**Risk.** Jitter sign errors → clamp to a minimum interval of 1 tick. This is the only
new RNG consumer, so its tests carry the determinism story.

### Step 6 — Selection

**Objective.** The heart of the stage.
**Files.** `src/sim/jobs.ts` (selection), `src/sim/personnel.ts` (`claimTask`),
`src/sim/events.ts` (unchanged).
**Behaviour.** Per person ascending id, walk the resolved order, apply the three
gates (eligibility, pending, free slot), claim through `personnel.claimTask`, store the
reason, emit `task_claimed` (routine).
**Tests.** New selection tests: invariant 3 (no person holds two jobs); invariant 5
(eligibility enforced — a `supply` person is never assigned maintenance); capacity is
never exceeded; lowest ID wins a contested slot; a person with no claimable work
stands by; `balanced` prefers the deeper queue.
**Acceptance.** All of the above, in 5 days of headless run, on several seeds.
**Risk.** This is the step most likely to be subtly wrong. Verify with a headless run
and *read the log backwards* (`SYSTEM_DEPENDENCIES.md:424-434` debugging order).

### Step 7 — Progress, completion, history

**Objective.** Work finishes and leaves a trace.
**Files.** `src/sim/jobs.ts`, `src/sim/personnel.ts`.
**Behaviour.** Advance `progressTicks`; on reaching `durationTicks`, decrement
`pending`, emit `task_completed` at `job.completionTier`, push a `TaskRecord`, clear
`currentTask`.
**Tests.** Invariant 4 (no job progresses without a valid worker); invariant 9 (no
oscillation — a person's job id never changes without a completion between); durations
are respected (a maintenance job completes at exactly 90 ticks); history is appended
and capped.
**Acceptance.** A full day produces a bounded, sensible set of notable events.
**Risk.** Off-by-one on completion (90 vs 91 ticks) — assert the exact count.

### Step 8 — The one command

**Objective.** Make the priority control real.
**Files.** `src/sim/commands.ts` (`Command` union, handler), `src/sim/state.ts` (write
via `intent[]`), `src/sim/tick.ts`.
**Behaviour.** `{ type: 'set_priority', value: PriorityValue }`. `applyCommands`
applies it by replacing the `priority` intent, emits `priority_set` (routine), and
rejects an invalid value with `command_rejected` (`BLUEPRINT` A4 §7 `[D]`: *"Invalid
commands must be rejected with a reason, not silently dropped"*).
**Tests.** Applied exactly once (the existing double-application test, reused); takes
effect at **tick N+1**, never mid-tick; an invalid value is rejected with a reason;
headless-set intent behaves identically to UI-set intent (`BLUEPRINT` C1 §10 `[D]`:
*"This is what proves intent is not a UI concept"*).
**Acceptance.** `Command` is a real union; `describeUnknown` still handles anything
else.
**Risk.** Low. The queue already exists and is tested — this step adds a handler, not
a mechanism.

### Step 9 — Determinism and invariant suite

**Objective.** Lock everything down before touching UI.
**Files.** `src/sim/tick.test.ts` (extend), new `src/sim/determinism.test.ts`,
extend the ownership guard.
**Behaviour.** No new behaviour. Tests only.
**Tests.** Invariant 14 (same seed + same command sequence → identical *whole state*,
not merely log); a 5-day run split at an arbitrary tick equals the same run in one
go; three priority settings produce **different** states (this is the inversion of
Conflict A — it fails while the control is inert); a static ownership test per module;
notable events per in-game day stay bounded; JSON round-trip at day 3.
**Acceptance.** All pass. Then the §8.4 fixture gate.
**Risk.** If "three settings differ" fails, stop and fix the fixture — do not
continue to UI work.

### Step 10 — Headless runner

**Objective.** The architecture guardrail, extended and still honest.
**Files.** `tools/headless.ts`, `tools/headless.test.ts`.
**Behaviour.** Summary gains roster rows, facility occupancy, pending depths and the
current priority. `digestOf` unchanged — it hashes event types and ticks only, so it
stays small (`STAGE1_PLAN_v4.md:99-101` rationale holds).
**Tests.** Update the four `rngCursor === 0` / `logLength` assertions; add
"the CLI shows the roster"; keep "repeated runs are deterministic"; keep "the digest is
stable and short" (the empty-log vector `811c9dc5` is unchanged).
**Acceptance.** `npm run headless -- --ticks 4320 --seed 42 --json` runs in Node, no
browser, and prints a readable day-3 summary.
**Risk.** Digest will change from `feecc016` because the log now has job events. That
is correct. Do not hard-code a new golden digest — ARCHITECTURE §10 warns that large
golden files get abandoned.

### Step 11 — Controller and UI

**Objective.** The player can see and act.
**Files.** `src/controller/controller.ts` (`dispatch`, `Snapshot`),
`src/ui/App.tsx`, `src/ui/styles.css`.
**Behaviour.** Three priority buttons calling `controller.dispatch({ type:
'set_priority', value })`. Two facility cards. Seven roster rows with reason strings.
Keep the existing seven-value line so the Stage 1 gate stays verifiable.
**Tests.** `src/controller/controller.test.ts`: `dispatch` queues and applies exactly
once; snapshot roster length is 7; priority round-trips through the command. **No UI
test exists or is proposed** — `App.tsx` is never imported by a test `[V]`, and adding
a React test harness for one panel is out of proportion at this stage. The UI is
verified manually (§11.1).
**Acceptance.** `npm run typecheck`, `npm test`, `npm run build` green.
**Risk.** Phone rendering. The panel must be readable at phone width — keep to one
column, no horizontal scroll.

### Step 12 — The fixture gate and Day 4–5 play

**Objective.** Decide whether Stage 2 passes.
**Files.** none (tuning `jobs.ts` constants only).
**Behaviour.** Run the §8.4 non-dominance test across the three settings; if it fails,
tune arrival constants or the mix — in that order, and record what you changed and
why in `CHANGELOG.md`.
**Acceptance.** §8.4 passes; then the manual protocol in §11.2.
**Risk.** The temptation to add a subsystem to make it interesting. `ROADMAP.md:298`
`[D]`: *"Do not pass this stage by adding features. If day 5 is boring, the fix is
usually to remove systems, not add them."*

---

## 8. Testing and acceptance gates

### 8.1 Automated tests to add `[P]`

| # | Test | Setup | Assert | Catches |
|---|---|---|---|---|
| T1 | Names stable per seed | `createRun(s)` twice | identical `personnel[].name` | replay break |
| T2 | Names differ per seed | seeds 42 and 99 | name sets differ | decorative seed |
| T3 | Cursor after creation | `createRun(s)` | `rngCursor === 7` | phantom/undercounted draws |
| T4 | Capacity bound | 5 days, all seeds | occupancy ≤ capacity every tick | inv 4, D2 §3 |
| T5 | One task per person | 5 days | `currentTask !== null` ⟹ unique | inv 3 |
| T6 | No task without eligibility | 5 days | `eligibleRoles` contains `role` | inv 5 |
| T7 | No progress without a worker | 5 days | progress advances only with `currentTask` | inv 4 |
| T8 | Lowest ID wins | two eligible people, one slot | the lower id claims it | non-determinism |
| T9 | No oscillation | 5 days | a person's job changes only after a completion or an abandon | inv 9, D6 |
| T10 | Duration exact | one maintenance claim | completes at exactly tick 90 | off-by-one |
| T11 | Deferral persists | run 3 days | `pending > 0` at each rollover | silent queue reset |
| T12 | Arrivals reproducible | same seed twice | identical `pending` and `nextArrivalTick` | inv 14 |
| T13 | Arrivals vary by seed | seeds 42, 99 | different arrival ticks | no day-to-day variety |
| T14 | Whole-state determinism | same seed **and same command sequence** | `statesEqual` on the entire state | inv 14 |
| T15 | Split-run equals whole-run | 2000 ticks vs 500+1500 | `statesEqual` | hidden state |
| T16 | JSON round-trip | day 3 | `statesEqual`, then continue identically | inv 15, D15 |
| T17 | Command once | enqueue `set_priority`, tick | exactly one `priority_set` | double apply |
| T18 | Command timing | enqueue then tick once | takes effect at tick N+1, not N | A4 §3 |
| T19 | Invalid command | `{type:'set_priority', value:'nonsense'}` | `command_rejected` with the value | A4 §7 |
| T20 | Intent is not a UI concept | set intent directly vs via `enqueue` | identical states | C1 §10 |
| T21 | **Three settings differ** | same seed, each setting | three distinct states | **inv 14, and Conflict A** |
| T22 | Notable-event budget | 5 days | notable events per day ≤ a small bound | ARCHITECTURE §6.1 |
| T23 | Ownership | static per module | only the owner writes its fields | inv 18 |
| T24 | Phase read order | static | Jobs reads only phase ≤ 5 fields | inv 19 |
| T25 | `src/sim` purity | static grep | no React/DOM/clock/`Math.random` | D9, G2 |

T21 and T22 are the two that a previous plan would most likely have omitted. T21 is
the mechanical form of the gate's central claim; T22 is what stops the log becoming an
unreadable wall by Day 20.

### 8.2 Invariants covered, and by what

From `SYSTEM_DEPENDENCIES.md:376-396` `[D]`:

| Invariant | Stage 2 coverage |
|---|---|
| 3, 4, 5, 9 | T5, T7, T6, T9 |
| 6 | already tested `[V]` (`tick.test.ts:67-70`) |
| 10, 11 | already tested `[V]` |
| 14 | T12, T14, T15, **T21** |
| 15 | T16 |
| 18, 19 | T23, T24 |
| 1, 2, 7, 8, 12, 13, 16, 17 | **not yet applicable** — they concern resources, needs, readiness, storage and items, which are Stages 3 and 7. Do not write passing-shaped tests for absent systems; that is the placeholder the project refuses. |

### 8.3 Existing tests that must be updated `[V]`

These fail the moment Stage 2 lands, and knowing why in advance saves an evening of
confusion. All four are consequences of §5.5–5.6, not regressions.

| File:line | Current assertion | Why it breaks |
|---|---|---|
| `tools/headless.test.ts:57` | `rngCursor === 0` ("Stage 1 draws nothing") | `createRun` now draws 7 names |
| `tools/headless.test.ts:86` | CLI output matches `rng cursor\s+0` | same |
| `tools/headless.test.ts:58-59, :94` | `logLength === 1`, `routine === 1` at 1440 ticks | job events are emitted |
| `tools/headless.test.ts:84-85` | `final tick 1440`, `Day 2` | still true — keep these as regression anchors |

Also update the comment at `src/sim/rng.ts:8-14`, which documents that `rngCursor`
rests at 0 — true at Stage 1, false from Stage 2. A stale comment that contradicts the
code is the failure mode `STAGE1_EVIDENCE_AUDIT.md` spent a section on.

### 8.4 The fixture gate — non-dominance `[P]`

This is the automated prerequisite for the manual gate, and it is the direct
implementation of `ROADMAP.md:199-207` `[D]`.

```
Seed set:      the default seed plus at least 3 others (spread, not adjacent)
Horizon:       5 in-game days (7200 ticks)
For each seed, for each setting in {balanced, maintenance-first, meals-first}:
  run with the setting applied at tick 1 (a set_priority command)
  record (maintenanceCompleted, mealsCompleted,
          generalistsOnMaintenanceTicks, generalistsOnMealsTicks)

Assert:
  1. For every seed, the three settings produce at least one differing measure.
     → If any seed shows all three identical, the control is inert: STOP.
  2. For every seed, neither extreme setting starves the other job to zero
     completions across 5 days.
     → If one does, that setting is dominant: STOP and retune.
  3. balanced is not the worst of the three on total completions for every seed.
     → If it always is, the baseline is a trap, not a baseline.
```

**Why this test, in this order.** `ROADMAP.md:207` states the two conditions the
fixture must satisfy and says the fixture must be adjusted if they are not met. So
the fixture is *tunable*, and this test is the objective function. Tune the arrival
constants (§5.5) first; only if they cannot be tuned into range does the personnel mix
change again. Record every tuning change in `CHANGELOG.md` — the audit's complaint
about undocumented behaviour (`STAGE1_EVIDENCE_AUDIT.md:393`) applies exactly here.

A note on what this test cannot do: it can prove the control is *not inert*. It cannot
prove the difference is *interesting*. That is the manual gate's job, and conflating
the two is precisely how a gate gets faked.

### 8.5 Manual Day 4–5 gate protocol `[P]`

On the phone, at 1× (a day is ~3 real minutes, D4 `[D]`).

**Before watching**, write down one prediction in a sentence — for example: *"with
meals-first, the workshop queue will be deeper at the end of Day 3 than with
maintenance-first."* Then run and check it. A prediction made after the fact is not
evidence, and this discipline is the whole point of Q25.

Then, for each of the four evidence items, answer yes or no:

1. **Explain without reading the source.** Look at a person mid-job. Can you say why
   they chose it from the roster row alone? If you have to open `jobs.ts`, the reason
   string is not legible enough — rewrite the string, not the code.
2. **Noticed something before the report told you.** Did the kitchen going to `1/2`
   occupancy while the meal queue climbed catch your eye unprompted?
3. **A decision visibly changed what happened.** Flip the priority at the start of a
   day. By the end of Day 5, is the difference visible **without comparing numbers
   side by side**? If you need a spreadsheet, the UI has failed even if the simulation
   is right.
4. **Continued past novelty.** You watched Days 4 and 5. Were you still looking?

**Pass rule:** 3 of 4 yes (`ROADMAP.md:56` `[D]`). **Record the answers in
`CHANGELOG.md`**, including the noes. A recorded no is worth more than an unrecorded
yes, because it tells Stage 3 what to fix.

**If it fails:** fix or simplify *this* stage — fewer people, shorter jobs, a plainer
roster — and re-run. Do not add a subsystem, and do not advance.

---

## 9. Deferred scope and preserved future milestones

### 9.1 What waits, and why `[D]`

| Feature | Stage | Why not now |
|---|---|---|
| Hunger, fatigue, needs, the consequence ladder | **3** | `ROADMAP.md:224-246`; two needs at once make effects unattributable (D13) |
| Schedules, rest, shift patterns | **3** | `BLUEPRINT` B5 §11; also B5 §3 makes a schedule a *preference* deviated from by needs, which requires needs |
| Readiness | **3** | D1: derived, read by nothing, removable; needs the conditions it summarises |
| Roles and specialties as a *system*, rate/reliability modifiers, Chain B | **6** | `BLUEPRINT` B2 §11; D22 anticipates the one-specialist fragility is acceptable at Stage 2 |
| Relationships, Chain E | **4** | `ROADMAP.md:264` |
| Named-option decisions, the report, end-of-day summary, debug view | **4** | `ROADMAP.md:258-263` |
| Anomalies, commitments, run history | **5** | D3, `ROADMAP.md:282-292` |
| **Equipment, items, slots, loadouts, condition, wear, repair queue, Chain F** | **7 — guaranteed** | **D21. Not a candidate, not optional, not moved.** |
| Storage, holdings, resource economy | **7** | `SYSTEM_DEPENDENCIES.md:98` |
| Production, recipes, Chain A2 | **8** | conditional; may merge with 7 |
| Vehicles, operations, combat | **9, 10** | parked |

### 9.2 Stage 7 is preserved and must not be weakened

**D21 `[D]`:** *"a minimum equipment and loadout experience is a guaranteed milestone.
Stage 7 happens. Its scope remains negotiable… but the stage does not."* And
`ROADMAP.md:29-30` `[D]`: *"Stage 7 is guaranteed. Equipment and loadouts are a
settled milestone (D21), not a candidate — the project must not quietly become a
generic colony sim."*

Nothing in this plan touches Stage 7. Deliberately:

- **No item, condition, wear or slot field is added to `SimState`.**
- **No repair queue** is built early. `ROADMAP.md:382-385` records that Stage 7 must
  ship its own minimal repair queue because Stage 8 is conditional; pre-building one
  here would repeat the dependency error that decision closed.
- **The Stage 2 job model is built so Stage 7 can extend it without a rewrite:**
  `Job` already has a `facilityId`, and when Items arrives a job gains a
  `prerequisites` entry naming an item id — which is the shape `SYSTEM_DEPENDENCIES.md:97`
  already defines (`items[]`, `.condition`, `.assignedTo` | Items | request | 7).

The one thing this plan owes Stage 7 is that `Person` carries a stable `id` that
outlives its role (`ROADMAP.md:369-371`). It does.

---

## 10. Risks, assumptions, and unresolved decisions

### 10.1 Decisions needed before building

| # | Decision | Recommendation | Cost of deciding late |
|---|---|---|---|
| **A1** | Fixture mix: keep 2/2/3 or adopt 5/1/1? | **Adopt 5/1/1** (Conflict A) | The gate cannot pass. Highest priority. |
| **A2** | Standby = fallback state or a real queue? | **Fallback** (Conflict D) | Invents standby work with no documented rule |
| **A3** | Omit `specialties`, `location`, `schedule`, `personalitySeed` at Stage 2? | **Omit all four** (Conflicts E, G) | Unread data; a placeholder the project refuses |
| **A4** | Arrival interval and jitter constants | Two numbers, tuned against §8.4 | Untunable fixture; retunes later anyway |
| **A5** | Arrivals before or after selection? | **Before** (§6.2) | One-tick deferral; cosmetic, but record it |
| **A6** | `Job.pending` as an integer count or as work-order objects? | **Integer** — objects are not needed for Stage 2's question, and they cost an id scheme | Objects are a clean later upgrade; the integer is not a dead end because `pending` is the only thing read |

A1–A3 are the ones I would want answered before writing code. A4–A6 can be decided
while building.

### 10.2 Assumptions (stated so they can be checked, not hidden)

1. **Stage 1's phone gate will pass.** If the seven values do not update on a phone,
   Stage 2 should not start — fix Stage 1 first.
2. **The duties rule precedes intent.** This is `BLUEPRINT` B3 §3 `[D]` and is the
   basis of Conflict A. If you read the ladder differently, Conflict A changes and A1
   must be re-derived.
3. **`balanced` means "attack the deeper backlog".** Not documented anywhere; my
   reading of *"the neutral baseline both other settings must beat"*
   (`ROADMAP.md:196`). `[?]` If you prefer a different definition, §5.3's table is the
   only place it lives.
4. **The three priority values are the whole command surface** at Stage 2
   (`ROADMAP.md:156-157`). No second control is added.
5. **Names can be plain strings from a fixed table.** B1 §3 requires them to come from
   the seeded stream, which a table + deterministic indexing satisfies.

### 10.3 Risks

| Risk | Likelihood | Impact | Detection | Mitigation |
|---|---|---|---|---|
| Fixture tuned into a fake pass | Medium | **High** — the gate is faked | §8.4 conditions 1 **and** 2 must both hold, on ≥4 seeds, and the manual prediction discipline | Tune one constant at a time, record each change |
| Priority control inert despite A1 | Low | **High** | T21 fails immediately | If 5/1/1 still fails, the constraint is people not slots: reduce generalists |
| RNG stream misaligned by a later change | Medium | High | T12, T14, T15 | Keep jitter draws in fixed job order; never draw in selection |
| Meal completion tier wrong | Medium | Low | T22 | One field, one test |
| Log growth on a long run | Low | Medium | T22 + §8.3 note | Routine-tier arrivals; revisit A3 §2's cap only if needed |
| Phone UI unreadable at 7 rows | Medium | Medium | Manual only — no UI test exists `[V]` | One column, no scroll; keep to name / job / reason |
| Scope creep into Stage 3 | **High** | **High** | The gate feels thin on Day 4 | §9.1; `ROADMAP.md:298`: if day 5 is boring, remove systems |
| `task_abandoned` defined but unreachable | Low | Low | Code review | §5.4 documents why; do not add a fake trigger |

### 10.4 Known unknowns, deliberately left open

- **Is the reason string enough?** Q29 `[D]`, decided by watching a real player.
  Smallest experiment `[D]`: show both a literal rule citation and a plain-language
  summary in one session.
- **Does hysteresis work?** Q30 `[D]`, decided by invariant 9 plus observation. At
  Stage 2 there is nothing to dither *between*, so this question is only partially
  answerable — say so rather than claiming it was tested.
- **Does one priority feel meaningful?** `ROADMAP.md:216` passes this forward
  explicitly. Answer it in the manual gate record.

---

## 11. Exact Build Mode handoff instructions

Give this section to Build Mode verbatim. It is self-contained.

### 11.0 Pre-flight (must pass before step 1)

1. `pwd` → `/data/data/com.termux/files/home/military-base-sim-dev`
2. `git rev-parse --short HEAD` → `88dbe92`; `git status --porcelain` → empty
3. `npm test` → 95 pass
4. **Stage 1 phone gate** — `npm run dev`, open the printed URL on the phone, and
   confirm all seven values update, 1× advances ≈8 ticks/s, all four speeds change the
   rate, Pause stops the clock, and a day-rollover event appears. Record the result.
   **Until this passes, do not build Stage 2.**

### 11.1 Rules for the whole build

- Only create or edit files inside `~/military-base-sim-dev`. No repos elsewhere.
- `npm test` must be green at the end of **every** step. Commit at step boundaries.
- Never add a field to `SimState` that no rule reads. Never store a derived value.
- `src/sim/**` stays free of React, DOM, browser globals, `Math.random()` and clock
  reads. The static guard must keep passing unchanged in spirit.
- `tools/headless.ts` must keep working. If it has to be stubbed, stop.
- One control, three states. Do not add a second command type.
- Where a document and the code disagree, say so in a comment and open a decision —
  do not silently resolve it.

### 11.2 Per-step loop

For each step in §7:

```
write the types  →  npm run typecheck
write the tests  →  npm test          (expect the new ones to fail)
write the code   →  npm test          (expect green)
                  npm run headless -- --ticks 1440 --seed 42 --json
read the log backwards from anything that looks wrong
git add -A && git commit -m "<step N>: <one line>"
```

Debugging order when something looks wrong (`SYSTEM_DEPENDENCIES.md:424-434` `[D]`):
reproduce headlessly → read the log **backwards** from the wrong outcome → check the
owning system → check the phase → check the switch. Never fix a symptom in the UI.

### 11.3 Files Build Mode will create (nothing else)

```
src/sim/personnel.ts      new
src/sim/facilities.ts     new
src/sim/jobs.ts           new
src/sim/personnel.test.ts new
src/sim/facilities.test.ts new
src/sim/jobs.test.ts      new
src/sim/intent.test.ts    new
src/sim/determinism.test.ts new
src/sim/state.ts          modify  (+3 fields, +fixture)
src/sim/tick.ts           modify  (+phase 5 steps)
src/sim/commands.ts       modify  (+1 command type, +handler)
src/sim/intent.ts         modify  (+resolvePriority)
src/sim/architecture.test.ts   modify  (permit 3 Stage 2 fields)
tools/headless.ts         modify  (extend summary)
tools/headless.test.ts    modify  (4 assertions + digest note)
src/controller/controller.ts   modify  (+dispatch, +Snapshot)
src/ui/App.tsx            modify  (roster, cards, control)
CHANGELOG.md              modify  (record every tuning change and the gate result)
src/sim/rng.ts            comment only (§8.3)
```

**Not to be touched:** `AGENTS.md`, any `docs/` file (except via `CHANGELOG.md`),
`.github/`, `src/main.tsx`, `tools/headless.ts`'s CLI contract, any `_archive/`.

If a step needs a file not on this list, that is a signal the plan is wrong — stop and
re-read §9.1 rather than proceeding.

### 11.4 Definition of done for Stage 2

- All steps 1–12 complete, `npm run verify` green (typecheck, tests, build, headless).
- §8.4 non-dominance test passing on ≥4 seeds.
- Stage 1 gate still passing.
- `CHANGELOG.md` records: the fixture change and its reason; every arrival-constant
  tuning; the four answers to the Day 4–5 gate; and anything the build discovered that
  contradicts this plan.

---

## 12. Final recommendation

**PROCEED after two prerequisites.**

1. **Run the Stage 1 phone gate** (`AGENTS.md:26`; `STAGE1_EVIDENCE_AUDIT.md:457`).
   It has never been performed and costs minutes. The first gameplay gate in the
   project should not stand on a foundation nobody has looked at.
2. **Decide A1.** Adopt the 5 generalists / 1 maintenance-capable / 1 supply-capable
   mix so the two free facility slots are contested and the priority control can
   actually change behaviour. This is the single highest-value decision in the plan:
   without it, Stage 2's gate fails for a reason that has nothing to do with whether
   the game is fun, and the failure will be misattributed.

Then build steps 1–12 in order, keeping `npm test` green at each boundary, and let
§8.4 decide the fixture before you invest an evening in the Day 4–5 watch.

**Two things this plan deliberately refuses to do.** It does not add a subsystem to
make Day 4 interesting — needs, condition, deadlines and a resource economy all have
documented owners at later stages, and pulling any of them forward would make the
Stage 3 effects unattributable (D13's reasoning). And it does not treat Stage 7's
guarantee as negotiable: no item, condition or slot field enters state, and no repair
queue is pre-built.

**The honest bottom line.** Stage 2 as specified can prove that autonomous people
make legible, priority-sensitive choices and that deferred work persists across days.
It cannot prove that a missed meal *hurts* — hunger is Stage 3. Build the mechanism,
watch Days 4 and 5 with a written prediction, and record the answer either way. If it
is boring, simplify; if it works, you have earned Stage 3.

---

## Appendix A — proposed reference fixture `[P]`

| Element | Value | Source |
|---|---|---|
| Personnel | 7: 5 generalists, 1 maintenance-capable, 1 supply-capable | `ROADMAP.md:193` mix, adjusted per Conflict A |
| Job: Maintenance | facility `workshop`, 90 ticks, roles `[maintenance, generalist]` | `ROADMAP.md:194,197` |
| Job: Meal preparation | facility `kitchen`, 30 ticks, roles `[supply, generalist]` | `ROADMAP.md:194,197` |
| Job: Standby | fallback state, no facility, no queue | Conflict D |
| Facilities | workshop capacity 2; kitchen capacity 2 | `ROADMAP.md:195` |
| Initial priority | `balanced` | `ROADMAP.md:196` |
| Arrivals | per §5.5; constants decided by A4 and tuned against §8.4 | `[P]` |
| Demand | must exceed what one specialist can clear, so a queue exists | `ROADMAP.md:199` |

## Appendix B — verification performed for this plan `[V]`

| What | Command | Result |
|---|---|---|
| Workspace identity | `git remote -v`, `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain` | as §2.1 |
| Test suite | `npm test` | 95 pass, 0 fail |
| Typecheck + build | `npm run build` | both clean |
| Headless determinism | `npm run headless -- --ticks 5000 --seed 42`, twice | byte-identical |
| Headless content | `--json` | digest `feecc016`, `logLength: 3` |
| Repo untouched | `git status --porcelain` after all commands | empty |
| Storage writable | `touch`/`rm` in `/storage/emulated/0/Download` | OK |

**Not verified, and not claimed:** any Stage 2 behaviour (none exists), the phone UI
(never opened in a browser), and `npm ci` (not run).

## Appendix C — the one-paragraph version

> Stage 2 adds people, jobs and facilities to a simulation that is already pure,
> deterministic and headless. The whole experiment is whether one priority control
> changes what seven autonomous people do in a way you can see. The persistent
> pressure is deferred work: queues of maintenance and meal orders that arrive, get
> worked down, and carry across the day boundary. Two things must be true before the
> experiment is worth running — the phone gate from Stage 1 has to pass, and the
> personnel mix has to leave a free slot in each facility so the priority has
> something to decide. Then it is twelve small steps, each leaving the tests green,
> with an automated non-dominance test standing between you and a faked gate.




