# Milsim Stage 2 — Implementation Plan

**Author:** SpaceBunny · **Date:** 2026-10-14 · **Status:** Plan only. Nothing implemented.
**Repository inspected read-only at** `~/military-base-sim-dev`.

---

## 1. Executive verdict

**Proceed after four prerequisites are decided — two of them are real blockers found by reading the repository.**

Stage 2 is buildable in the existing architecture. The pure-simulation rule, the event log, the command queue, seeded RNG, and the headless runner all already exist and all already have the exact shape Stage 2 needs. No new infrastructure is required.

However, I found three conflicts and one arithmetic impossibility:

1. **`src/sim/architecture.test.ts` will fail the moment Stage 2 lands** (verified, §3.1).
2. **The Stage 2 reference fixture cannot produce the trade-off its own gate demands** (verified arithmetic, §3.2). This is the most important finding in this document and it needs your decision before any code is written.
3. Two blueprint/ownership conflicts about who owns job progress (§3.3).
4. A test-count drift in `AGENTS.md` (§2.2) — documentation only.

I did not silently "fix" #2. It is a change to a locked roadmap fixture and it is yours to make.

---

## 2. Verified workspace and baseline

### 2.1 Identity — verified by command, not assumed

| Check | Command | Result |
|---|---|---|
| Remote | `git remote get-url origin` | `https://github.com/MarkKramm/Milsim.git` |
| Branch | `git branch --show-current` | `main` |
| HEAD | `git rev-parse HEAD` | `88dbe92b2d331d9ee4eb74643e457f9908f44208` |
| Tree | `git status --porcelain` | *(empty — clean)* |
| Node / scripts | `package.json` | TS 5.7, Vite 6, React 18, `tsx`, Node 24 in CI |
| Toolchain flags | `tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules` |

HEAD is **unchanged** from the previously verified `88dbe92`. No repository file was modified, created, or deleted during this task.

### 2.2 Baseline differs from the historical record in one place

I ran the suite. **95 tests, 95 pass, 0 fail** (`npm test`). `AGENTS.md` still says *"88 tests"* in two places, and `CHANGELOG.md`'s known-gaps section is otherwise accurate. **Documentation drift, not a code problem** — worth correcting when Stage 2 work starts, since `AGENTS.md` is the file a future agent trusts first.

### 2.3 Stage 1 gate status — an outstanding prerequisite

`docs/reviews/STAGE1_EVIDENCE_AUDIT.md` §9 records the **phone manual gate as never performed**, in two places, and concludes the honest summary is *"verified in Node, not verified."* `AGENTS.md` names "Stage 1 manual gate on the phone" as the next action.

**This must be done before Stage 2.** Reasons: it is the only outstanding Stage 1 prerequisite; Stage 2's gate is judged *by watching the app on the phone*, so an unverified app cannot host a verified gameplay verdict; and the audit's own lesson applies — *"the suite is necessary and it is not sufficient."*

### 2.4 What Stage 2 gets for free (all read at HEAD)

`src/sim/` already contains `time.ts` (periods, `TICKS_PER_DAY`), `rng.ts` (`rand()`, cursor discipline), `events.ts` (`emit()`, tiers, `subjects`, `causeEventIds`, `causalReferencesAreValid`), `commands.ts` (queue + loud rejection), `intent.ts` (the `Intent` interface already exists), `state.ts` (`draftOf`, `statesEqual`), `tick.ts` (linear body, phase 0). `tools/headless.ts` already runs N ticks with no browser. `src/controller/` already owns wall-clock timing. `.github/workflows/ci.yml` already gates typecheck + tests + build + a 1440-tick headless run.

---

## 3. Authoritative requirements and document conflicts

### Authority rules — verified, not guessed

- `docs/PROJECT_MASTER.md` is a **generated bundle**; its header says *"Generated file. Do not edit… Source of truth: `~/military-base-sim-dev/docs/`."* Plan against `docs/`, never against `PROJECT_MASTER.md`.
- `ARCHITECTURE.md` §4 states in its own text: *"That document is authoritative for phase numbers"* — referring to `SYSTEM_DEPENDENCIES.md` §4. **Phase numbers and field ownership therefore come from `SYSTEM_DEPENDENCIES.md`; narrative explanation comes from `ARCHITECTURE.md`.**
- `GAME_DESIGN_BLUEPRINT.md` §"Status labels" defines `SETTLED` / `PROVISIONAL` / `OPEN`.
- `docs/_archive/**` is superseded. Excluded from this plan by rule.

### 3.1 Conflict A — the architecture test will fail on day one *(verified defect in the plan, not in the code)*

`src/sim/architecture.test.ts:117`:

```ts
const forbiddenFields = ['personnel', 'facilities', 'jobs', 'storage', 'items', 'readiness', 'resources'];
```

The test *"the simulation contains no placeholder systems for future stages"* asserts that **no** module declares any of these in `SimState`. But `ARCHITECTURE.md` §3 says `personnel: Person[]; jobs: Job[]; facilities: Facility[]; // Stage 2`.

**Consequence:** adding the Stage 2 fields breaks a passing test, and the natural beginner reaction is to delete or weaken the test — which would silently destroy the guardrail that stops Stage 3 and Stage 7 from being stubbed early. **Step 1 of the implementation sequence removes exactly the three Stage 2 names and leaves the other four in place, in the same commit as the fields that justify it.**

### 3.2 Conflict B — the reference fixture cannot starve either job *(verified arithmetic)*

`ROADMAP.md` §"The Stage 2 reference scenario" fixes: 7 personnel, workshop capacity 2, kitchen capacity 2, and demands that *"Maintenance first must visibly starve meal preparation on at least one in-game day."*

With those numbers the gate is **not achievable**, and the reason is structural rather than a matter of tuning:

- Total facility slots = 2 + 2 = **4**. Workforce = **7**. At least three people are idle at all times.
- Each job kind has its own facility. Maintenance work is never blocked by a full kitchen, and meal work is never blocked by a full workshop. **The two kinds do not compete for anything.**
- If maintenance demand exceeds the workshop's 2 slots, the workshop saturates *regardless of priority*. If meals demand exceeds the kitchen's 2 slots, the kitchen saturates *regardless of priority*.

| Regime | Maintenance workers | Meal workers | Does priority change it? |
|---|---|---|---|
| Demand ≥ 4 concurrent | 2 (workshop full) | 2 (kitchen full) | **No** — both facilities already saturated, both maximal |
| Demand < 4 concurrent | varies | varies | Only *which* person idles — nothing is starved |

**In a saturated regime every option is already at maximum, so reordering cannot change throughput. In an unsaturated regime nothing is starved.** Priority is throughput-invariant. Facility capacity of 2+2 against 7 workers can only ever produce *queueing*, never *starvation*.

The roadmap anticipates a broken fixture (*"If one order wins every day, the fixture is broken"*) but not this failure mode, which is stronger: the trade-off is absent regardless of tuning.

**Two ways out. You must pick one before coding.**

**Option A — make worker-minutes the scarce resource (recommended).** Raise facility capacity so it is never the binding constraint (each ≥ the workforce, so the "wait for a free slot" rule still exists and still emits events, but does not gate throughput), and bound each person's availability by *period* using the `periodOf()` helper that already exists in `src/sim/time.ts`. This costs **no new subsystem and no new state** — it reuses an existing pure function. Worker-minutes per day then become finite and genuinely contended, deferred work accumulates across days, and the two priority orders become symmetrically non-dominant.

**Option B — keep 2+2 exactly as written, and change the gate.** Accept that priority is observable only as *who* does *what* and *who stands by*, then amend `ROADMAP.md`'s condition 1 to match what the architecture can deliver. Honest, cheaper, but it weakens the one priority that distinguishes Stage 2 from Stage 4 (`ROADMAP.md` §Stage 2: *"Stage 4 tests the harder version of the same question"*).

I recommend **A**, because `ROADMAP.md` deliberately put intent at Stage 2 *because it can answer something*, and Option B leaves the stage answering almost nothing.

### 3.3 Conflict C — who owns job progress

- `SYSTEM_DEPENDENCIES.md` §3: Personnel owns `persons[].currentTask`, `.taskProgress`, `.location` (Stage 2); Jobs owns `jobs[]` progress, queues, assignment.
- `GAME_DESIGN_BLUEPRINT.md` B3 §2: *"State. Owned by Jobs: task assignment and progress. B1 owns nothing here."*

The same table also lists **`jobs[]` twice** — once for "definitions, eligibility, prerequisites" and once for "progress, queues, assignment" — under one owner, which is not a separation of concerns.

**Recommendation (needs your sign-off):** Jobs owns everything about a unit of work. `persons[]` holds identity only. **`persons[].currentTask` is not stored** — the roster derives it by reading `jobs[]`. This makes invariant 3 (*"No person holds two active jobs"*) structurally true rather than merely tested, removes a duplicated field, and matches the project's existing rule that derived values are never stored (`state.ts` header; invariant 12's spirit).

### 3.4 Conflict D — specialties are Stage 6 but the Stage 2 fixture needs them

The fixture specifies *"3 generalists, 2 maintenance-capable, 2 supply-capable."* `GAME_DESIGN_BLUEPRINT.md` B2 §11 places roles and specialties at **Stage 6**.

**Recommendation:** Stage 2 ships only what eligibility requires — a per-person `canWork: JobKind[]` on the 7-person fixture — and does **not** ship specialties, rates, or reliability modifiers (B2 §3). Those stay Stage 6 and reuse this field. B2's rule that *"specialties modify rate and reliability, never eligibility alone"* is preserved because Stage 2 has no rates at all.

### 3.5 Conflict E — facility degradation is Stage 2 in one place, Stage 7 in another

`GAME_DESIGN_BLUEPRINT.md` D2 §5 says *"Facilities degrade with use"* under **Stage 2**, while §11 says *"Stage 2 (basic), 7 (condition)."* **Recommendation: build no degradation in Stage 2.** §11 is the more specific statement, it agrees with the ownership table (condition is not a Stage 2 field), and your brief explicitly excludes it.

### 3.6 Verified requirements, preserved verbatim from `ROADMAP.md`

7 personnel · jobs **Maintenance**, **Meal preparation**, **Standby** · workshop capacity 2, kitchen capacity 2 · initial priority **Balanced** · Maintenance 90 min, Meal 30 min · hysteresis with progress forfeit · deterministic tie-breaking, lowest ID first, never random (B3 §3) · roster shows task **and the reason** · gate is Days 4–5 · at least 3 of 4 evidence items.

---

## 4. Stage 2 gameplay hypothesis and success criteria

**Hypothesis (Q25, `OPEN_QUESTIONS.md`):** *Can the player anticipate a problem, make a meaningful intervention, and later recognise the consequences of that intervention?*

**Minimum player experience:** watch seven named people work; see one of them take a job you would not have chosen; change a single priority setting; and on a later day see a different person in a different job, with a log entry that explains why.

**Why Days 4–5 is the honest test.** `ROADMAP.md` §Gate evidence names evidence item 4 — *"you continued past the point where novelty wore off"* — as both the hardest item and the one Stage 2 most often fakes, because *"six people working is cute, and cuteness feels like fun."* Day 1–2 novelty is the thing being eliminated on purpose. Day 4–5 is the first day where behaviour is *familiar but not yet explained*, which is the only state where item 4 can be honestly answered.

**Observable success criteria.** All must be checkable by looking, not by reading code:

| # | Criterion | Fails if |
|---|---|---|
| S1 | The roster explains every person's current task in plain language | You must open the source to know why |
| S2 | Changing priority produces a **different assignment or a different backlog** within one in-game day | The control appears inert (C1 §7: *"an intent whose effect cannot be observed is a dead control"*) |
| S3 | Deferred work persists and is visible the next day | Nothing carries over; every day restarts |
| S4 | Neither priority order wins every day | One order dominates → fixture is broken (ROADMAP §reference scenario) |
| S5 | Two runs, same seed, same priority-change ticks → identical state | Any divergence |
| S6 | You are still watching on Day 4 | Evidence item 4 fails |

---

## 5. Proposed minimal design and alternatives considered

### 5.1 Systems in scope

Exactly four, matching `SYSTEM_DEPENDENCIES.md` §3 Stage 2 rows: **Personnel (identity)**, **Jobs**, **Facilities (basic)**, **Player intent (one priority)**. Nothing else.

### 5.2 State additions

```ts
// proposed — does not exist at HEAD
interface Person { id: string; name: string; canWork: JobKind[]; hiredDay: number; }
interface Job    { id: string; kind: JobKind; status: 'queued'|'active'|'done';
                   assignedTo: string | null; facilityId: string; progressTicks: number; }
interface Facility { id: string; name: string; capacity: number; }
```

`SimState` gains `persons`, `jobs`, `facilities`. `intent` already exists. **Nothing derived is stored** — readiness, resources, occupancy, and each person's current task are all computed on read.

Per the serialization constraint (`ARCHITECTURE.md` §3): plain data only, no `class`, `Map`, `Set`, `Date`. Job *definitions* (kind, facility, duration) go in a frozen constant table in the new module; only *instances* live in state.

### 5.3 Job selection — deterministic, three rules

For each idle person, in ascending `id` order (B3 §3, "lowest ID first, never randomly"):

1. **Hysteresis gate.** If `active`, they continue until complete or until an explicit abandon decision forfeits progress. No re-evaluation mid-job. This is D6 and it is the reason people do not dither.
2. **Candidate scan.** Consider every `queued` job whose `kind` is in the person's `canWork` and whose facility has a free slot.
3. **Rank** by: player priority order first, then shortest remaining duration, then lowest job `id`. Emit `task_started` carrying the winning rule as `data.reason` — a literal string like `"meals rank first under Balanced priority"`, satisfying B3 §9's *"the literal reason it was chosen — 'no food available, hungry' beats 'selected job #3.'"* If nothing qualifies, they take **Standby**.

On completion, `jobs` entry becomes `done` and the person returns to selection in the same tick's progress step, so a fast job can be followed by another. **Abandonment** happens only when a higher-priority job cannot be started *and* the forfeit is worth it; it emits `task_abandoned` with `data.forfeitTicks` (B3 §8). D6 requires the forfeit to exceed "a better job appeared", so start at **50%** and treat the value as the Q30 tuning knob.

### 5.4 Alternatives considered and rejected

| Alternative | Why rejected |
|---|---|
| Facility degradation / condition | Explicitly excluded by your brief; `D2` §11 puts condition at Stage 7 (§3.5) |
| Needs, fatigue, hunger | Stage 3. `SYSTEM_DEPENDENCIES.md` §4 puts Needs at phase 4 — introducing it early breaks invariant 19 |
| Deadlines or perishable work | Adds a second subsystem (a due-date clock) and starts answering Stage 3's gate early |
| Storage / resource economy | Stage 7; needs `consume()` requests (invariant 17) that have no owner yet |
| Schedules (B5) | Stage 3. If Option A is chosen, use `periodOf()` as a shared availability window, not per-person schedules |
| A generic phase scheduler | Rejected in `STAGE1_PLAN_v4.md` §3. **Extend the linear `tick()` body** — it is already the decided shape |
| Named-option decisions | Stage 4. `ROADMAP.md` §Stage 2 explicitly re-scoped this |
| Full specialties / rates | Stage 6 (§3.4) |

### 5.5 Persistent consequence — the one thing that makes Days 4–5 work

Deferred work must be real. `jobs[]` entries in `queued` status persist across ticks and across days. **Do not prune them.** When a day ends with maintenance queued and meals cleared, the player can see it, change priority, and see the backlog swap on the following day. That is S3 and it is the whole mechanism behind evidence item 3.

---

## 6. Architecture and data-flow plan

### 6.1 Data flow (unchanged layering; only the sim gains content)

```
src/ui/App.tsx ──commands──▶ src/controller/controller.ts
                                     │ wall-clock, speed, pause
                                     ▼
                               src/sim/tick.ts  ──▶  new modules
                                     ▲                    │
                                     └────── events.ts ◀───┘
```

`src/sim/**` stays React-free, DOM-free, clock-free, and `Math.random`-free. The existing `architecture.test.ts` guards this; **Step 1 narrows its forbidden-field list without weakening any import or global check.**

### 6.2 Existing modules that change

| Module | Change | Nature |
|---|---|---|
| `src/sim/state.ts` | Add `persons`, `jobs`, `facilities` to `SimState` and to `draftOf` | **Modify** — `draftOf` must copy the new arrays or Stage 1's immutability guarantee silently breaks |
| `src/sim/tick.ts` | Insert new steps after command draining | **Modify** — keep the linear body |
| `src/sim/commands.ts` | `Command` stops being `never`; add a `set_priority` variant with a real handler | **Modify** |
| `src/sim/architecture.test.ts` | Remove `personnel`, `jobs`, `facilities` from `forbiddenFields` | **Modify** — Step 1 |
| `src/sim/tick.test.ts` | The assertion `rngCursor === 0` ("Stage 1 draws nothing") becomes false once names are generated | **Modify** — deliberately, with the comment rewritten to name *why* |

### 6.3 Proposed new modules (none of these exist today)

| Proposed file | Responsibility |
|---|---|
| `src/sim/personnel.ts` | `Person` type; deterministic seeded name generation via `rand()`; the 7-person fixture |
| `src/sim/jobs.ts` | Job kinds, durations, frozen definition table, selection, hysteresis, progress |
| `src/sim/facilities.ts` | `Facility`, occupancy queries, free-slot checks |
| `src/sim/priority.ts` | Resolve `state.intent[]` into an ordered kind list; render reason strings |

Deliberately **not** proposed: a scheduler, an event bus, a report module, or a save/load module — all declined in `STAGE1_PLAN_v4.md` §3 for the same reasons then.

### 6.4 Proposed tick order

`SYSTEM_DEPENDENCIES.md` §4 phases, with Stage 3+ steps **absent rather than stubbed** (the precedent set in `tick.ts`'s own header):

```
1. advance clock, emit day rollover        (exists — phase 0)
2. drain pendingCommands                   (exists — phase 0, extended)
3. apply intent → priority order           (exists as a no-op — phase 0, implemented)
   ── phases 2/3/4 (Delivery, Resources, Needs) do not exist yet: skipped, not stubbed
4. facilities: refresh availability        (new — phase 1)
   ── Items is phase 1 too but is Stage 7
5. job selection                           (new — phase 5)
6. advance job progress / completion       (new — phase 5)
```

Invariant 19 (*"every phase reads only fields owned by its own or earlier phases"*) holds: selection at phase 5 reads intent (0) and facilities (1), never the reverse.

### 6.5 Ownership boundary to hold

Only the new `jobs.ts` writes `jobs[]`. Only `personnel.ts` writes `persons[]`. Only `facilities.ts` writes `facilities[]`. Only `emit()` writes `log[]` and `nextEventId`. Only `intent.ts`'s owner writes `intent[]`, **and only via a command** (C1 §4: *"Written only by commands"*), which means `src/ui/App.tsx` must gain a real command path — the `Controller` currently has **no `enqueue` method at all**, which is a genuine gap Stage 2 must close.

---

## 7. Step-by-step implementation sequence

Each step is independently reviewable and leaves `npm run verify` green.

**Step 0 — Perform the Stage 1 phone manual gate. No code.**
Run `npm run dev`, open on the phone, confirm the seven values update, 1× advances ≈8 ticks/s, all four speeds change rate, Pause stops the clock, a rollover appears, the panel is usable at phone width. Record the result in `AGENTS.md`.
*Rationale:* the only outstanding Stage 1 prerequisite (§2.3). *Accept:* `AGENTS.md` no longer claims Stage 2 is next while an unverified gate is open.

**Step 1 — Open the guardrail deliberately.**
Remove `personnel`, `jobs`, `facilities` from `forbiddenFields` in `src/sim/architecture.test.ts`. Change nothing else in that file; leave `storage`, `items`, `readiness`, `resources` in place. Add a comment recording *why*, and that this test's real job is to stop **future** stages being stubbed early.
*Accept:* suite still 95/95. No behaviour change. *Risk:* a beginner deletes the whole test. The step exists precisely so that deletion is visible in review.

**Step 2 — Decide Conflict B (Option A or B) and Conflict C.**
Write the decision into `docs/ROADMAP.md` §Stage 2 reference scenario and `docs/SYSTEM_DEPENDENCIES.md` §3, then rebuild `PROJECT_MASTER.md` with `tools/build-master.sh`. **No code in this step.**
*Accept:* the fixture numbers in the docs match the numbers in the tests.

**Step 3 — Personnel (B1, identity only).**
Add `src/sim/personnel.ts` with the `Person` type and a seeded name generator using `rand()` from `src/sim/rng.ts`. Extend `createRun()` to build the 7-person fixture.
*Tests:* names are stable across two runs of the same seed; two seeds produce different rosters; `rngCursor > 0` after `createRun`; all fields survive a JSON round-trip (invariant 15).
*Accept:* `createRun(seed).persons.length === 7`; rerunning gives identical names.
*Risk:* names generated outside the seeded stream would break replay (B1 §3). Test with two seeds.

**Step 4 — Facilities (D2, basic).**
Add `src/sim/facilities.ts`: two facilities, `capacity`, and a free-slot query. No condition, no degradation.
*Tests:* occupancy never exceeds capacity; `noUnusedLocals` stays clean.

**Step 5 — Jobs: definitions and progress only.**
`src/sim/jobs.ts` with the frozen kind table (maintenance 90, meal 30, standby 0), plus progress advance and completion. No selection yet.
*Tests:* a job advances exactly 1 tick of progress per tick of work; completing resets the person to idle; invariant 10 unaffected.

**Step 6 — Facilities phase and job progress in `tick.ts`.**
Insert the new steps into the linear body with comments naming `SYSTEM_DEPENDENCIES.md` §4 phases.
*Tests:* `tick` still does not mutate its input (the existing test must keep passing); `statesEqual(run(createRun(S), n), run(createRun(S), n))`.

**Step 7 — Job selection + hysteresis + the reason string.**
Implement the three rules from §5.3, lowest-ID-first, `task_started` carrying `data.reason`.
*Tests:* invariant 3 (no person holds two active jobs) over 3,000 ticks; invariant 4 (no job progresses without a valid worker); invariant 9 (a person never oscillates without an explicit `task_abandoned` event); two identical runs produce identical logs.

**Step 8 — Intent: resolve priority, add a real command.**
`src/sim/priority.ts` resolves `state.intent[]` into an ordered kind list. Change `Command` in `src/sim/commands.ts` from `never` to a union with one `set_priority` variant and a real handler in `applyCommands`. Invalid values still emit `command_rejected` (C1 §3).
*Tests:* intent set headlessly produces identical behaviour to intent set through the UI path (C1 §10 — this is the test that proves intent is not a UI concept); the existing "a command is applied exactly once" test still passes.

**Step 9 — The Controller command path.**
Add an `enqueue`-style method to `src/controller/controller.ts` that appends to `state.pendingCommands` and returns the new state. This closes the real gap identified in §6.5.
*Tests:* a priority change issued at tick N takes effect at tick N+1, never mid-tick (A4 §10).

**Step 10 — Roster UI.**
Extend `Snapshot` in `src/controller/controller.ts` with a derived `roster` array (id, name, current task, reason). Add the roster panel and the priority control to `src/ui/App.tsx`. **Derive, never store; write via commands, never mutate state.**
*Tests:* none in CI — `src/ui/App.tsx` is imported by no test. This is a manual/browser gate, honestly labelled as such.

**Step 11 — Full verification and docs.**
`npm run verify`. Update `AGENTS.md` (including the 88→95 test drift), `CHANGELOG.md`, and `ROADMAP.md`.

---

## 8. Testing and acceptance gates

### 8.1 Automated (must all pass; `npm run verify` is the command)

| Group | Test | Invariant |
|---|---|---|
| Determinism | Same seed + same command sequence → identical `statesEqual` | 14 |
| Determinism | Two different seeds → different rosters | 14 |
| Determinism | JSON round-trip of a 3,000-tick state, then continued ticks | 15 |
| Selection | No person holds two active jobs over a long run | 3 |
| Selection | No job progresses without a valid worker | 4 |
| Selection | Selection order is stable across runs (lowest ID first) | 14 |
| Hysteresis | No task change without an explicit `task_abandoned` event | 9 |
| Capacity | Occupancy never exceeds facility capacity | — |
| Priority | `set_priority` changes assignments or the day's backlog | — |
| Priority | Headless intent ≡ UI-path intent | C1 §10 |
| Events | `causalReferencesAreValid` over a multi-day log | 6 |
| Events | Event ids sequential and unique | — |
| Architecture | `src/sim` free of React, DOM, `node:`, `Date.now`, `Math.random` | D9 |
| Architecture | Only `rng.ts` assigns `rngCursor` | 11 |

### 8.2 Manual phone gate — the Day 4–5 protocol

This is the Stage 2 exit gate and it cannot be automated.

1. **Balanced baseline.** Run Days 1→5 on the phone at 1×. Write down, each day, who did what and what was left queued.
2. **Prediction test.** Before Day 4, predict which kind of work will be backlogged. Check it. *A wrong prediction you can explain is a pass — evidence item 2 is "you noticed something before the report told you."*
3. **Intervention test.** On Day 4, change priority. Before Day 5, predict who will be in a different job. Check it, and trace it to a `task_started` reason string.
4. **Dominance check.** Over at least 5 days, confirm neither order wins every day (S4).
5. **Novelty test.** On Day 5, ask honestly whether you are still watching. This is evidence item 4 — the one `ROADMAP.md` names as the honest test.
6. **Score:** at least **3 of 4** evidence items. If item 4 fails, `ROADMAP.md` §Stage 5 says the fix is to **remove systems, not add them.**

**Honesty statement:** I have run the existing 95-test suite. I have **not** run any Stage 2 test, because none exists, and I have **not** performed any phone verification.

---

## 9. Deferred scope and preserved future milestones

**Deferred, with reasons:** needs/fatigue/hunger (Stage 3) · readiness as a derived summary (Stage 3, invariant 12) · storage and resources (Stage 7, invariants 1–2, 17) · **items, condition, durability, loadouts, weapons (Stage 7 — untouched by this plan)** · production (Stage 8) · named-option decisions and the full intent set (Stage 4) · end-of-day report and event timeline (Stage 4) · relationships (Stage 4) · anomalies and commitments (Stage 5) · relationships' cross-system chain (Stage 4) · schedules (Stage 3) · vehicles (Stage 9) · operations (Stage 10, parked) · save/load UI (Stage 3).

**Preserved explicitly:**

> **D21 — Equipment and loadouts remain a guaranteed Stage 7 milestone.** Nothing in this plan touches it, moves it earlier, or makes it conditional. Its scope remains negotiable; its existence does not. The "soldier / item / slot / loadout" structural contract in `GAME_DESIGN_BLUEPRINT.md` is unchanged. Stage 2 must not become a generic colony sim, and the cheapest insurance is that Stage 7's data model stays reachable: hence the recommendation in §3.3 to keep `jobs[]` as the owner of units of work, which is exactly where Stage 7's repair queue attaches.

Stage 2 also must not absorb needs, fatigue, relationships, or major decision systems — all explicitly excluded by `ROADMAP.md` and by your brief.

---

## 10. Risks, assumptions, and unresolved decisions

### 10.1 The smallest set of decisions needed to start

**Blocking (must be answered before Step 3):**

- **D-1 — Conflict B.** Option A (worker-minutes scarce, capacity non-binding, availability bounded by `periodOf()`) or Option B (keep 2+2, weaken the gate). *My recommendation: A.*
- **D-2 — Conflict C.** Does Jobs own task progress and assignment, with `persons[].currentTask` derived rather than stored? *My recommendation: yes.*
- **D-3 — Option A specifics.** Which periods are working periods, and the exact daily demand for each job kind so that demand exceeds throughput. These are numbers only you can pick by playing — but the plan needs them before Step 5, or the fixture cannot be tested.

**Non-blocking (decide during the work):**

- **D-4** Hysteresis forfeit percentage. Start at 50%; Q30 names it as the tuning knob if people dither.
- **D-5** Job kinds named in the roadmap are `Maintenance` / `Meal preparation` / `Standby`, while the fixture roster says *"supply-capable"* people. Are the two maintenance-capable and two supply-capable people the same set as the meal preparers? **This is unresolved in the source documents and I could not resolve it.**
- **D-6** Whether the roster shows the literal rule or a plain-language summary — Q29 is explicitly **OPEN** and says to try both in one session.
- **D-7** Room for growth: `D22` warns 6–8 is near the floor for Chain B and Chain D. Stage 2 uses 7; growth is a Stage 5+ question and is **not** a Stage 2 decision.

### 10.2 Assumptions I made, stated so you can reject them

- Facility capacity will be raised if you choose Option A — this is a change to a `ROADMAP.md` fixture number, and I have flagged it rather than absorbed it.
- The `set_priority` command is the only new command. If you want the player to also *pause* a job kind, that is a second command and a bigger gate.
- Job definitions can live in a frozen constant until Stage 7 makes them item-dependent.

### 10.3 Implementation risks

| Risk | Caught by |
|---|---|
| Deleting/weakening `architecture.test.ts` to make Step 1 "pass" | Step 1 is a commit on its own, reviewed in isolation |
| Losing `draftOf` array copying for the three new fields, silently mutating caller state | The existing "tick does not mutate the state it was given" test — it will fail loudly |
| Random tie-breaking sneaking in via `rand()` during selection | The existing architecture test already fails the build on `Math.random`; add an explicit "no `rand()` in `jobs.ts`" assertion |
| `statesEqual` via `JSON.stringify` silently dropping `undefined` fields and calling unequal states equal | Prefer explicit field comparisons in new determinism tests |
| Regressing the Stage 1 timing defect (audit **D1**) while touching the controller | The two existing regression tests; do not remove them |
| Building for 5 days of interest and discovering none | That is what the gate is for — and per `ROADMAP.md` the response is to cut scope, not add systems |

---

## 11. Exact Build Mode handoff instructions

```
1. Do not start Step 1 until Step 0 (phone gate) is done and recorded.
2. Steps 1 and 2 are independent of each other; do 1, then 2, then 3.
3. Before Step 3, answer D-1, D-2, D-3. If you cannot answer D-1,
   stop and ask — do not pick an option silently.
4. One commit per step. Plain descriptive messages, per WORKING_AGREEMENT.md:
      "Stage 2: open the architecture guardrail for personnel, jobs, facilities"
      "Stage 2: personnel identity and seeded names"
   Do not amend, force-push, or change branches.
5. After EVERY step run:  npm run verify
   It runs typecheck, tests, build, and a 1440-tick headless run. All must pass.
   A red suite is a stop, not something to route around.
6. Never edit src/sim to import React, the DOM, or a clock. Never add
   Math.random. Never store a derived value. If a change seems to need one of
   these, the design is wrong — fix the design, not the rule.
7. After Step 2, edit docs/ then run: bash tools/build-master.sh
   PROJECT_MASTER.md is generated. Never hand-edit it.
8. Mirror docs for phone reading with scripts/sync-docs.sh. The mirror is a
   copy — never edit it, never commit it.
9. Update AGENTS.md in the same session as any decision or stage change.
   Also fix the 88 -> 95 test count while you are there.
10. Do not implement anything in section 9.
```

---

## 12. Final recommendation

**Proceed after specific prerequisites.**

Stage 2 fits the existing architecture with no structural rework. The tick loop, event log, command queue, RNG discipline, controller, headless runner, and architecture guardrails are all already built and all already shaped for this stage. The implementation sequence above is ten small reviewable steps, each leaving `npm run verify` green.

Before Step 3, do three things:

1. **Perform the Stage 1 phone manual gate** — the only open Stage 1 prerequisite, recorded as never performed in two places in the project's own audit.
2. **Decide Conflict B.** The Stage 2 reference fixture as written **cannot** produce the starvation its own gate requires, because 7 people against 2+2 facility capacity means each job kind saturates its own facility independently and priority can never reallocate a saturated resource. This is arithmetic, not a tuning problem, and it is the single most important finding in this review. I recommend Option A, but it changes a locked roadmap number and that is your call.
3. **Confirm Conflict C** — Jobs owns task progress, `persons[].currentTask` is derived, not stored.

Everything else in this plan is either verified from the repository, or explicitly flagged as a recommendation awaiting your approval. I have not invented function signatures for things that do not exist, and I have not run any test that I did not actually run.