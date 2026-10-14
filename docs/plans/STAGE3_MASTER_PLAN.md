# Stage 3 Master Plan — needs, rest, food, and consequence

**Status:** implementation-ready specification. Builds directly on the implemented, audited Stage 2 (`3b3a0f7`).
**Scope:** Stage 3 only. Does not reopen Stages 4–10. **D21 (equipment and loadouts, guaranteed Stage 7) is untouched and remains a commitment.**
**Tags:** `[V]` verified against the repository during preparation · `[S]` source-level · `[D]` documented in an authoritative file · `[P]` new recommendation.

---

## 1. Verified baseline

`[V]` by command, 2026-10-15.

| Fact | Value |
|---|---|
| Root / branch / remote | `~/military-base-sim-dev` · `main` · `MarkKramm/Milsim` |
| HEAD | `3b3a0f7df2ed2f56a755407416f3a5d72bf46169` (matches the reported audit commit) |
| Working tree | Clean |
| `npm run typecheck` | exit 0 |
| `npm test` | **123 pass, 0 fail** |
| `npm run build` | succeeds |

Stage 2 fixes confirmed present `[V]`: `Object.freeze` × 2 in `personnel.ts`; the corrected standby wording in `tick.ts`; both audit regression tests in `stage2-gate.test.ts`.

**Stage 2 reference figures, re-verified independently from the CLI** `[V]`: balanced 267/866 (30/30) · maintenance-first 297/777 (0/119) · meals-first 257/896 (40/0). Exactly as reported.

### 1.1 The `history` gap — the audit's specific follow-up

**The Stage 2 fix was incomplete.** `[V]` proven by probe:

```
history array shared between state and draft?  true
PUSH SUCCEEDED   -> original history length went 4 -> 5
ENTRY WRITE      -> original entry tick became -777
```

`ActiveTask` was frozen; `TaskRecord` and the `history` array were not. `completeTask` currently rebuilds the array (`[...person.history, record].slice(-12)`), so nothing mutates it in place today — **the same latent status `ActiveTask` had before it was fixed.** But Stage 3 adds `needs` (a nested object) to every person, multiplying exactly this exposure.

**Decision D1 — the state-safety rule.** Adopt one rule and apply it without exception:

> **Everything reachable inside `SimState` is either frozen at creation or rebuilt immutably on every write. No object or array placed in state is ever mutated in place.**

This is not a new framework. It is the rule `events.ts` already follows with `Object.freeze`, extended to the person fields Stage 3 adds. **Prerequisite before Step 1 of the implementation.**

**Smallest sufficient fix** (not a rewrite): freeze `TaskRecord` entries and the `history` array in `completeTask`; declare `needs` readonly and frozen; extend the existing isolation test to cover history, not just `currentTask`.

### 1.2 Audit findings carried forward

| Finding | Disposition in this plan |
|---|---|
| Person-field ownership not enforced by tests | **Closed at Step 1.** §7.1 |
| Latent type-only import cycles (`personnel ⇄ jobs`, `state ⇄ rng`) | **Closed at Step 1.** §7.2 |
| Single `currentTask` person model | **Decided in §3.B** — mutually exclusive activity, no simultaneous work+rest |
| Work arrival is a provisional assumption | **Decided in §3.C** — meal production becomes need-driven; maintenance keeps its cadence |
| UI unverified at phone width | **Outstanding.** §11 |
| Stage 1 and Stage 2 Day 4–5 gates unperformed | **Outstanding.** §11 |
| Preliminary human feedback: the interface "feels visually uneventful, all seven personnel working continuously" | **Accepted as evidence that Stage 3's premise is right.** Seven people working without rest *is* the uneventfulness. Recorded as preliminary observation, **not** as a completed formal gate |

---

## 2. Two document conflicts, and their resolution

### 2.1 Resources derives from Storage, but Storage is Stage 7 `[D]`

`SYSTEM_DEPENDENCIES.md` §3: `storage[].holdings` → **Stage 7**; `resources` (derived from Storage) → **Stage 3**. Resources at Stage 3 would derive from a system that does not exist. Meanwhile `ROADMAP.md` §Stage 3 requires *"Food consumption and one maintenance-supply interaction"* and *"Resource contention changing outcomes."*

**Resolution `[P]`:** bring a **minimal Storage** forward to Stage 3 — bulk counts only (`food`, `supplies`), owned by Storage, consumed exclusively through `consume()`/`produce()` requests (invariant 17). This does **not** move Stage 7: Stage 7 is individual items, condition, slots and loadouts — a different system from bulk stock. **D21 is unaffected.** Record the change in the `SYSTEM_DEPENDENCIES.md` §3 table.

### 2.2 `persons[].schedule` is listed Stage 2; B5 is Stage 3 `[D]`

§3 lists `persons[].schedule` at Stage 2; `GAME_DESIGN_BLUEPRINT.md` B5 §11 places schedules at Stage 3. Stage 2 shipped no schedule field, correctly.

**Resolution `[P]`:** accept Stage 3 as the stage that delivers it, and deliver **only the minimum** — needs-driven rest, no calendar. See §3.E.

---

## 3. Design decisions

### A. Needs, fatigue, rest, recovery

**Two needs only: `hunger` and `fatigue`, each in [0, 1]** `[D]` (B4 §2, §11; D13). Hydration, morale and injuries are Stage 6 `[D]`. Two is the documented number and each will have an observable effect; a third need that behaved like the first two would be a meter without a consequence.

**Rates.** Needs change over *hours*, not minutes `[D]` (B4 §3), so at 1× the player sees meaningful change every ~20 seconds without flicker.

| Need | Rises while | Falls while | Full recovery / full depletion |
|---|---|---|---|
| `fatigue` | working | resting | working → +1/600 ticks (10 h) · resting −1/240 ticks (4 h) |
| `hunger` | always | after eating | +1/720 ticks (12 h) · eating → 0 |

**Rest is self-selected.** When an idle person's `fatigue ≥ 0.5` they take a **rest** activity of 240 ticks, during which no job may claim them. This is selection-ladder **rule 2 (recovery)** `[D]` (B3 §3), which is currently unimplemented because Needs did not exist.

**Legitimate rest is not idleness** `[D]` (D1 correction 2; B4 §3). Readiness must not fall while a person is resting. This was a documented design bug; invariant 8 guards it.

**Too exhausted.** At `fatigue ≥ 0.85` a person **declines demanding work** (ladder step 3 `[D]` D1) — they stand by rather than claim, with the reason *"too exhausted to work"*. They do not refuse *everything*; a person at 0.9 fatigue who has not eaten still seeks food. That distinction is what makes the two needs non-redundant.

**Hunger without food.** At `hunger ≥ 0.5` a person eats **if and only if** a meal is in storage. With an empty larder they stand by with reason *"no food available"*. This is the causal chain the roadmap asks for, and it is the first thing that can be *lost*.

**Deciding factors in the model:**
- *Why hunger and not fatigue first as the thing that can be lost?* Because food is the resource with a stock; fatigue is self-correcting given rest. The roadmap's gate is "something can be lost, and you felt it lose it" — food is the only Stage 3 quantity that can run out.
- *Why does eating not restore readiness?* Readiness is a summary, never causal `[D]` (invariant 12, D1 correction 3).

### B. Concurrent activity and the person-state model

**Decision `[P]`: mutually exclusive activity. A person is working, resting, or idle. Never two at once.**

Representation — minimal addition to the existing `Person`, no change of shape:

```ts
export interface Needs { readonly hunger: number; readonly fatigue: number; }

export interface Person {
  // ...existing, unchanged...
  needs: Needs;                 // frozen, [0,1] each
  restUntilTick: number | null; // non-null ⇒ resting until this tick
}
```

`currentTask` keeps its meaning: a **work** task or `null`. Resting is expressed by `restUntilTick`, because a rest is a duration rather than a queue item — modelling it as a third `JobId` would force `pending` (a count of *unclaimed orders*) to carry a meaning it cannot carry, and would put a fake facility on it.

**Transitions, and the rule that prevents bad ones:**

| From | To | Trigger |
|---|---|---|
| idle | working | selection rule 3 (duty) or 4 (intent), subject to the fatigue ceiling |
| working | working | completion, then re-selection next tick (Stage 2 rule, unchanged) |
| idle | resting | `fatigue ≥ 0.5` — **selection rule 2, before duties** |
| resting | idle | `tick ≥ restUntilTick` |
| resting | working | **not permitted.** Rest completes; selection runs next tick |

Rule 2 is evaluated **before** rule 3 `[D]` (B3 §3 order), so fatigue preempts duty. That ordering is why the ladder works, and it is the one place Stage 3 changes who works.

**Why not allow work while resting.** A soldier cooking while "recovering" makes rest meaningless and makes fatigue a number that only sometimes matters. It would also make Stage 7's slot/equipment model ambiguous — carrying a weapon while resting is a question Stage 7 should answer, not one Stage 3 should pre-empt by accident.

**Hysteresis survives unchanged.** A resting person is skipped by `selectWork`; a working person is never re-selected. Invariants 3 and 9 remain structurally true — no new code needed to preserve them.

**Stage 4+ implication, recorded not solved:** if a person may later hold several activities (a guard shift *and* a meal break), this representation must widen. That is a Stage 4/6 question. The one-activity rule is the simplest model that supports Stage 3's mechanics; it is not a claim that one activity is always enough.

### C. Work demand and arrival ownership

**Decision `[P]`: split the two kinds of demand by cause.**

| | Model | Reason |
|---|---|---|
| **Meals** | **Need-driven.** The kitchen produces up to a **target stock of 40 meals**; work orders exist only when `food < 40`. Each completion yields 3 meals | Makes hunger causally connected to food. With Stage 2's fixed 8-tick meal arrivals, food would accumulate without limit and starvation could never happen — the need would be decoration |
| **Maintenance** | **Kept at the fixed 24-tick cadence** | Upkeep is not consumption. Turning it need-driven would invent a "how broken is the workshop?" system that belongs to Stage 7's condition |
| **Supplies** | **New: delivered on a fixed 1,200-tick schedule, 20 units per delivery** | `ROADMAP.md` Stage 3 requires "one maintenance-supply interaction". Delivery is phase 2 `[D]` |

**Maintenance consumes 1 supply per completion.** That is the supply interaction, and it is what makes supplies scarce: at the current 24-tick cadence the base completes ~50 maintenance jobs/day and consumes 50 supplies, while receiving 24/day. **Deliberate structural scarcity** — but §4.C sets the numbers.

**This changes Stage 2 outcomes, deliberately.** The Stage 2 fixture assumed meals arrived whether or not anyone was hungry. Stage 3 replaces that with a production rule, so **267/866/30/30 and friends will no longer hold.** That is not a regression; it is the stage doing its job. §10 specifies the new expectations and forbids loosening thresholds to match.

**Avoiding runaway workload:** production is capped by target stock, and consumption is capped by one meal per eating opportunity. Neither rate depends on player input except through priority, which is bounded by facility capacity. No feedback loop can grow without bound.

### D. Resources and readiness

**Resources own no mutable field** `[D]` (D1 §2, §4). `storage.food` and `storage.supplies` are the only stock. `resourceOf(state, kind)` derives a total by reading storage.

**Storage owns holdings and is the only writer** (invariant 17). Consumption is a request that Storage may refuse, recording why — the documented request pattern `[D]` (§3).

**Readiness `[D]` — derived, never causal.** A base-level figure in [0,1] = the mean of the seven people's condition, where a person's condition is `1 − (0.5·fatigue + 0.5·hunger)`. It is **never written to `SimState`, never read by any system, and only ever computed for the UI** (invariant 12, D1 correction 3).

**Causality stays on the underlying conditions.** Every ladder step triggers on `fatigue` or `hunger`, never on readiness:

| Ladder step `[D]` (D1) | Trigger | Stage 3 behaviour |
|---|---|---|
| 1. Warning | sustained `fatigue ≥ 0.7` or missed meals | `notable` event once per crossing |
| 2. Reduced effectiveness | `fatigue ≥ 0.7` while working | work rate × 0.6, emitted as a `notable` event with the cause |
| 3. Declines demanding work | `fatigue ≥ 0.85` | stands by, reason *"too exhausted to work"* |
| 4. Refuses optional assignments | `fatigue ≥ 0.9` for a sustained period | declines maintenance specifically; **deferred to Stage 5** (see §10) |
| 5. Leaves | sustained neglect across days | **deferred** — severity and permanence are explicitly open `[D]` (Q23, ROADMAP Stage 3) |

**Traceability.** The chain the player must be able to follow is one hop longer than Chain A1 in `SYSTEM_DEPENDENCIES.md` §7, and it is the stage's point:

```
kitchen understaffed (priority) → meals not produced → food stock falls
  → a hungry soldier finds no meal → stands by, "no food available"
    → that worker is idle → less maintenance done → workshop backlog grows
      → readiness falls (summary only) → the player sees the cause in the report
```

### E. Scheduling and duty availability

**Decision `[P]`: needs-driven rest now; the calendar is deferred to Stage 5.**

B5 is marked Stage 3 `[D]` but its status is **PROVISIONAL** and its stated purpose is *"gives days a rhythm"*. Needs-driven rest produces that rhythm as an **emergent consequence** — a base that has been working hard sleeps at staggered times, which is more interesting than a uniform rota and requires no calendar.

The calendar (`periods[]` per person) is deferred with its unlock condition recorded: **when Stage 5 asks whether days repeat identically, or when the player needs a work/rest policy control.** Delivering half of B5 at Stage 3 is a deliberate partial completion, not an oversight — recorded here so it is not mistaken for one.

**Interaction with priority:** a priority setting never pulls a resting person onto a job. Priority ranks *work*; rest preempts it.

### F. Deterministic state safety and module ownership

Covered by §1.1 (state rule) and §7.1–7.2 (ownership test, cycle guard). No new framework — one invariant and two targeted tests.

---

## 4. Data model

### 4.1 New state fields

```ts
// src/sim/state.ts — additions
export interface SimState {
  // ...the existing ten fields unchanged...
  personnel: Person[];   // gains `needs` and `restUntilTick`
  jobs: Job[];           // unchanged
  facilities: Facility[];// unchanged
  storage: Storage;      // Stage 3 — minimal, bulk counts only
}

// src/sim/storage.ts  [NEW]
export interface Storage { readonly food: number; readonly supplies: number; }

// src/sim/needs.ts  [NEW] — a value, never a store of its own
export interface Needs { readonly hunger: number; readonly fatigue: number; }
```

`readiness` is deliberately **absent from `SimState`** — derived on read, exactly as `ARCHITECTURE.md` §3 already explains for readiness and resources `[D]`.

### 4.2 Ownership boundaries (invariant 18)

| Field | Owner | Others |
|---|---|---|
| `persons[].needs` | Needs | read |
| `persons[].restUntilTick` | Needs | read |
| `storage.food`, `storage.supplies` | Storage | **request only** — `consume`/`produce` |

`personnel.ts` remains the only writer of person fields. `needs.ts` computes new `Person` objects through `personnel.ts`'s existing request functions, so the "exactly one place writes a person" property from Stage 2 survives intact.

---

## 5. Tick phases

`SYSTEM_DEPENDENCIES.md` §4 is authoritative for numbering `[D]`. Phase 0 and 5 are unchanged; 2, 3, 4 and 9 are new.

```
0  clock · commands · intent                      (exists)
1  facilities                                    (static — still absent, arrives with condition at 7)
2  DELIVERY   supplies arrive on schedule         (NEW)
3  RESOURCES  consume/produce against storage     (NEW)
4  NEEDS      update hunger and fatigue           (NEW)
5  JOBS       recovery → duty → intent → opportunity, then progress   (extended)
   ── phases 6 (production), 7 (vehicles), 8 (relationships) absent
9  DERIVED    readiness, for display only         (NEW — never stored)
```

**Invariant 19 holds:** phase 4 reads nothing later than itself; phase 5 reads phases 0–4; phase 9 reads everything and writes nothing.

**The order is load-bearing and is not adjustable:**
- delivery (2) before consumption (3) — a scheduled arrival is a fact that already happened `[D]`
- needs (4) before job selection (5) — a worker decides on current hunger, not last tick's `[D]` (SYSTEM_DEPENDENCIES §6)
- selection (5) after everything it depends on `[D]`

**RNG:** nothing new draws. Names are still the only consumption. `rngCursor` remains **7**. This is asserted by an existing test and must keep passing.

---

## 6. Module map

| Module | Status | Responsibility |
|---|---|---|
| `src/sim/needs.ts` | **NEW** | hunger/fatigue values, rest selection, eating, the refusal ceiling |
| `src/sim/storage.ts` | **NEW** | `food`/`supplies`; the only writer; `consume`/`produce` with recorded refusals |
| `src/sim/readiness.ts` | **NEW** | derives base readiness and its causes. Reads only. Writes nothing |
| `src/sim/resources.ts` | **NEW** | consumption *rules* only (how much an action yields/costs). No state `[D]` |
| `src/sim/delivery.ts` | **NEW** | the supply schedule |
| `src/sim/personnel.ts` | modify | freeze `history`/`TaskRecord`; add `needs`, `restUntilTick`; writers |
| `src/sim/jobs.ts` | modify | drop `arrivalIntervalTicks` from meals; add maintenance supply cost |
| `src/sim/tick.ts` | modify | phases 2, 3, 4, 9; recovery rule in selection |
| `src/sim/commands.ts` | modify | target stock becomes a player-set goal (below) |
| `src/controller/controller.ts` | modify | roster gains condition; add stock + readiness to snapshot |
| `src/ui/App.tsx` | modify | need bars, rest strip, stock, readiness |
| `tools/headless.ts` | modify | print needs, stock, readiness |

**No new UI framework. No new dependencies.**

### 6.1 Player agency — target stock `[P]`

`ROADMAP.md` Stage 3 requires *"Player-set goals tracked by the report"*. The report is Stage 4 `[D]`, so the goal is **set now and displayed now, reported in Stage 4**. One command, `set_food_target`, controlling the kitchen's target stock. This gives the player a lever, keeps the command surface small, and avoids building a report to satisfy a Stage 4 bullet.

---

## 7. Prerequisites — close these before implementation

### 7.1 Ownership invariant (audit finding)

**Add one static test** to `architecture.test.ts`: only `personnel.ts` may assign a field of a `Person`; only `needs.ts`/`storage.ts` may assign their own. Same technique as the existing *"only rng.ts advances the RNG cursor"* test, which already works. **Not a framework — one grep-and-assert.**

### 7.2 Import-cycle guard (audit finding)

Add a test that walks `src/sim/*.ts`, follows value (non-`import type`) imports, and fails on a cycle. **This matters specifically because Stage 3 adds six modules**, several of which will want to reach into person or storage state.

### 7.3 State-isolation rule

Adopt the §1.1 rule; freeze `TaskRecord` and `history`; extend the existing isolation test to cover a state's history, not only `currentTask`.

---

## 8. Implementation steps

Each step leaves `npm run verify` green. One commit each.

**Step 1 — Safety prerequisites.** §7.1, §7.2, §7.3. New tests fail-then-pass. *No gameplay change.* **Acceptance:** the history probe from §1.1 now throws; ownership and cycle tests green.

**Step 2 — Needs values.** `needs.ts` with hunger/fatigue integration; `Person.needs` frozen; initial values set so nobody starts exhausted. Phase 4 in `tick.ts`.
*Tests:* invariant 7 (needs stay in [0,1]) over 30 days; needs never fall during rest (invariant 8's precondition); a fresh run has sane values. *Risk:* a rate set so steep that people oscillate. Rates come from B4 §3's "hours, not minutes".

**Step 3 — Storage and resources.** `storage.ts`, `resources.ts`. Starting stock: **60 food, 40 supplies.**
*Tests:* only Storage writes holdings (invariant 17); `consume` refuses and records why when short; no path produces negative stock (invariant 1).

**Step 4 — Delivery.** `delivery.ts`; supplies +20 every 1,200 ticks; phase 2.
*Tests:* delivery precedes consumption; stock never exceeds a stated cap; arrival is deterministic.

**Step 5 — Production and consumption.** Kitchen produces 3 meals when `food < target`. Maintenance completion costs 1 supply. Phase 3.
*Tests:* production stops at target; maintenance without supplies emits a recorded refusal and **still completes the work** (a shortage should delay, not silently void); invariants 1 and 2.

**Step 6 — Rest.** `restUntilTick`; recovery as selection rule 2, ahead of duties.
*Tests:* a person at `fatigue ≥ 0.5` stops claiming work and rests; rest ends on schedule; a resting person is never claimed; duty cannot preempt rest; hysteresis (invariant 9) survives.

**Step 7 — Eating and the refusal ceiling.** Eat when `hunger ≥ 0.5` **if food > 0**, consuming 1; at `fatigue ≥ 0.85`, decline work with a readable reason.
*Tests:* a hungry person with food stops being hungry; a hungry person with an empty larder stands by with *"no food available"*; an exhausted person declines but still eats.

**Step 8 — Ladder steps 1–3.** Threshold-crossing events; reduced work rate above 0.7.
*Tests:* each threshold fires once per crossing and not per tick; work rate reduces without changing duration bookkeeping; **no threshold is expressed in readiness**.

**Step 9 — Readiness.** `readiness.ts`, computed for display only.
*Tests:* **invariant 12 — nothing in `src/sim` outside `readiness.ts` may reference readiness**; readiness never falls during rest (invariant 8); readiness changes only when a need changes.

**Step 10 — Commands.** `set_food_target`, replacing the removed `arrivalIntervalTicks`.
*Tests:* invalid target rejected loudly; applied at tick N+1; applied exactly once.

**Step 11 — Controller and headless.** Snapshot gains `needs`, `restUntil`, `stock`, `readiness`, `readinessCauses`. Headless prints them.
*Tests:* snapshot derivation mutates nothing; headless stays byte-identical across runs.

**Step 12 — UI.** Need bars with the refusal threshold marked; rest indicator; food/supply readouts; readiness with its top two causes; `set_food_target` control.
*Acceptance:* every number traces to simulation state; phone-width layout checked (§11).

**Step 13 — Save/load** `[D]` (ROADMAP Stage 3, D15). Round-trip the whole state including `needs`, `restUntilTick` and `storage`.
*Tests:* invariant 15; a restored state continues identically to an uninterrupted run.

**Step 14 — Docs.** `SYSTEM_DEPENDENCIES.md` §3 (storage→3), `ROADMAP.md` Stage 3 build list, `AGENTS.md`, `CHANGELOG.md`, rebuild `PROJECT_MASTER.md`.

---

## 9. Objective acceptance criteria

| # | Criterion | Verified by |
|---|---|---|
| A1 | Needs stay in [0,1] over 30 in-game days | test |
| A2 | Readiness is never stored and never read by a system | invariant-12 test + grep |
| A3 | Only Storage writes holdings; only Needs writes needs | ownership test |
| A4 | No stock is ever negative; totals equal the sum of holdings | invariants 1, 2 |
| A5 | Every ladder trigger is on hunger or fatigue, never readiness | source review + test |
| A6 | Nobody works through a required rest without a recorded reason | test (invariant 9) |
| A7 | Readiness never falls during legitimate rest | test (invariant 8) |
| A8 | An empty larder produces starvation that is **visible and traceable** | scenario test |
| A9 | Priority still reallocates under Stage 3 (backlog divergence persists) | gate re-run |
| A10 | `rngCursor` is still 7 after 30 days at 16× | existing test, unchanged |
| A11 | Same seed + same commands → identical state over 7,200 ticks | test |
| A12 | A saved state resumes identically | test |
| A13 | No type-only import cycle became a value cycle | cycle guard |
| A14 | `npm run verify` green | CI |

---

## 10. Tests and regression requirements

**Must remain unchanged and passing:** all 123 existing Stage 2 tests, including the whole fixture gate and the audit's two regression tests.

**Expected to change — and why, stated plainly:**

The Stage 2 five-day figures (267/866, 297/777, 257/896) **will not survive**, because Stage 3 replaces fixed meal arrivals with need-driven production and adds the fatigue ceiling. This is the point of the stage, not a regression.

**Handling, which is not negotiable:**
1. Record the Stage 2 figures as superseded, with the reason, in `CHANGELOG.md` and in the fixture gate's own comment.
2. Replace them with **Stage 3 figures measured from the implementation**, then hand-check that they still show: meals-first backing up maintenance, maintenance-first backing up meals, neither dominant, neither starving to zero.
3. **Never lower a threshold to make a build pass.** If Stage 3 numbers come out degenerate — meals never scarce, or everyone permanently exhausted — the *rates* are wrong and must be re-derived, exactly as Stage 2's were.

**New coverage beyond the existing gate:** need range and monotonicity; rest exclusivity; eating only with stock; refusal ceiling; storage refusal recording; ladder crossing idempotence; readiness not stored; save/load round-trip.

---

## 11. Manual verification — outstanding

| Check | Status |
|---|---|
| Stage 1 phone gate | **Never performed.** Unchanged |
| **Stage 2 Day 4–5 gate** | **Not performed.** Your preliminary observation — "visually uneventful, all seven working continuously" — is recorded as *evidence that Stage 3's premise is correct*, not as a completed gate |
| Stage 2 UI at phone width | Not systematically verified |
| **Stage 3 phone gate** | Plan: after Step 12 — watch that people **stop working and sleep**, that food runs out if you neglect the kitchen, and that you can read *why* from the roster |
| `NOTIFY_INTERVAL_MS` at 16× | Unmeasured |

I have no browser in this environment and have performed none of these. None is claimed.

---

## 12. Deferred

| Deferred | To | Reason |
|---|---|---|
| **Items, condition, durability, weapons, loadouts** | **7** | **D21 — guaranteed. Untouched by this plan** |
| Hydration, morale, injuries | 6 | B4 §11; B2 |
| Named decisions, the report, event timeline | 4 | ROADMAP Stage 4 |
| Relationships | 4 | Chain E |
| Ladder steps 4–5 (refusal of optional work, leaving) | 5 | Severity and permanence are explicitly open (Q23). Step 3 declines demanding work; steps 4–5 need several days of observation to tune honestly |
| Schedule calendar | 5 | §3.E |
| Production/workshop | 8 | Route deliberately used for the supply line; a production system is not |

---

## 13. Stage 3 risks

| Risk | Severity | Mitigation |
|---|---|---|
| Rates make everyone permanently exhausted, or nobody ever needs food | **High** | Both directions are degenerate and visible within one in-game day. Tune against the measured figures in §10, not by feel |
| Stage 3 breaks the fixture gate and the numbers are "fixed" by loosening | **High** | §10 forbids it in writing; superseding must be documented and hand-checked for non-dominance |
| Storage→3 is read as weakening D21 or moving Stage 7 | Medium | §2.1 states bulk stock and individual items are different systems. **D21 untouched** |
| The exhaustion ceiling starves the workshop so hard that maintenance stops entirely | Medium | Step 7 tests that an exhausted person still seeks food and returns; watch the backlog during tuning |
| `needs` and `restUntilTick` reintroduce aliasing | Medium | §1.1 rule + Step 1 tests, before the fields exist |
| Report deferred, so "player-set goals" is only half-delivered | Low | §6.1 makes the goal settable and visible now; the report is Stage 4 |

---

## 14. Decisions genuinely needing your input

Two, and only two. Everything else above was resolvable from the documents.

1. **§2.1 — bring a minimal Storage forward to Stage 3?** Required for food scarcity, which the Stage 3 gate depends on. Alternative is to defer food entirely, which would leave the stage with no losable thing.
2. **§3.E — accept needs-driven rest in place of the Stage 3 calendar?** B5 is marked Stage 3. The plan delivers rest but defers the calendar to Stage 5.

Everything else — the two needs, mutual exclusivity, need-driven meals, supply delivery, readiness as a pure summary, target stock as the player lever — follows from the roadmap and needs no decision from you.

---

*Nothing here has been implemented. No source file or test was modified in producing this plan. Repository state at `3b3a0f7`, tree clean.*