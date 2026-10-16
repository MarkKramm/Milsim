# Stage 4 Master Plan — decisions, reports, and the first relationships

**Status:** implementation-ready specification. Builds on pushed Stage 3 (`4e8c513`).
**Scope:** Stage 4 only. Does not reopen Stages 1–3. **D21 (equipment and loadouts, guaranteed Stage 7) is untouched and remains a commitment.**
**Tags:** `[V]` verified against the repository · `[D]` documented in an authoritative file · `[P]` new recommendation.

**Revision 2** — a narrow specification correction, not a new planning cycle. The developer's three decisions are approved: relationships carry the bounded modifier; blocking interrupts ship unused; `reserve_food` is the single new persistent intent. Four specification defects were corrected; they are listed in §13.

---

## 1. Verified baseline

`[V]` by command:

| Fact | Value |
|---|---|
| Root / branch | `~/military-base-sim-dev` · `main` |
| HEAD | **`4e8c513b8f525d284b81c3945379bcca5cfbf920`** — synchronized with `origin/main`, tree clean |
| Stage 3 | `4e8c513` · `e979af2` · `68aaf1c` · `9ab81e6` |
| Tests | 132 passing, in four slices (a single `npm test` wedges Termux on this device) |
| Plans directory | `STAGE1_PLAN_v4.md`, `STAGE2_MASTER_PLAN.md`, `STAGE3_MASTER_PLAN.md` |

**Authoritative Stage 4 scope — `ROADMAP.md` §Stage 4 `[D]`:** named-option decisions queued in the report · intent expanded into priorities, reserves and policies · rare blocking interrupts · event timeline and end-of-day report that **reads the log without recomputing** · debug view and "copy run as JSON" · relationships, minimal.

**Gate `[D]`:** *"you made a choice and understood its effect — you can point at the report and say why things happened."*

---

## 2. The scope conflict, and its resolution

**`ROADMAP.md` says relationships are "minimal: pair values surfacing as report lines." But `SYSTEM_DEPENDENCIES.md` Chain E requires the value to change job duration, and carries a kill rule:**

> *"if a relationship value never changes anything observable, the Relationships system has failed and should be cut rather than expanded."*

`GAME_DESIGN_BLUEPRINT.md` F1 §4 settles it: *"Read by Jobs as a cooperation modifier — applied at phase 8, read next tick."*

**Decision R1 — approved.** Stage 4 delivers the complete minimal F1: pair values **and** the cooperation modifier. The roadmap's "report lines" is the visible half; the modifier is what satisfies the kill rule. Specified precisely in §5.

**Phase ordering `[D]` (§9).** Relationships are phase 8; Jobs is phase 5. The documents resolve it: *"`Relationships` writing the multiplier at phase 8; `Jobs` reads it next tick."* **R2:** relationships accumulate at phase 8; Jobs applies the modifier at phase 5 **of the following tick**. The one-tick lag is intended, and must be commented in code so nobody "fixes" it into a cycle.

---

## 3. What Stage 4 must prove

**The gate is a sentence the player can say:** *"I chose X, and the report told me Y, because of Z."*

1. **A choice** — a real situation, 2–3 named options, each with a credible benefit *and* cost `[D]` (D2). An obvious answer teaches nothing.
2. **An effect** — the choice changes what happens afterwards, in the same run.
3. **An explanation** — the player points at the report and sees the cause chain, without reading source.

All three or the gate fails. Decisions without a report leave cause and effect unconnected; a report without decisions is Stage 3's log with better formatting.

---

## 4. Decisions

**Generated, never invented** — C2 §5: *"The simulation generates decisions from its own state; it never invents them for dramatic effect."* Three generators, each reading a real Stage 3 condition `[P]`.

### G1 — the larder

**Trigger `[V]`:** `storage.food` below half the target, sustained for 60 ticks.

| Option | Benefit | Cost |
|---|---|---|
| **a)** Raise the food target | kitchen works more, hunger eases | workshop waits; that backlog grows |
| **b)** Put meals first | meals clear without a stock increase | workshop backs up further |
| **c)** Hold the line | nothing changes, no commitment | hunger keeps rising, refusal risk |

### G2 — a growing backlog

**Trigger `[V]`:** any job's `pending` above 20 and rising across the last 120 ticks.

| Option | Benefit | Cost |
|---|---|---|
| **a)** Drop the other job's priority | this backlog clears | the other queue grows |
| **b)** Accept the delay | no labour diverted | that work stays undone |
| **c)** Approve an unsupplied sprint | repairs finish faster than with none | supplies fall further, future repairs slow |

Option (c) is a **transient** effect: it applies to the current backlog only and is consumed. It uses the Stage 3 `UNSUPPLIED_REPAIR_MULTIPLIER` mechanism rather than inventing one.

### G3 — exhaustion — corrected

**Trigger `[V]`:** two or more people currently at or above `DECLINE_THRESHOLD`.

> **The previous draft of this plan was wrong here, and it is worth recording why.**
> It offered "raise the rest threshold" as a way to *lighten* the workload. Stage 3
> rests a person when fatigue **reaches** the threshold
> (`shouldRest`: `fatigue >= REST_THRESHOLD`). Raising that threshold therefore
> makes them rest **later**, which is *more* work, not less — the option was
> exactly backwards, and a player choosing it to get slack would have been given
> the opposite. `[V]` `src/sim/needs.ts` `shouldRest`.

G3 must offer trade-offs that are real *given* Stage 3's rules, and must **not** introduce a second persistent intent lever. All three options are **transient, consumed on resolution**:

| Option | Benefit | Cost |
|---|---|---|
| **a)** Rest the two worst now, ahead of the threshold | they recover sooner, refusal stops | two people produce nothing for `REST_DURATION_TICKS`; the workforce shrinks exactly when output is already short |
| **b)** Press on | everyone keeps working | fatigue deepens past `DECLINE_THRESHOLD`; more refusals, and more of them |
| **c)** Rest the next to cross the threshold, first | recovery is ordered by who is worst | a deliberate hold: the current refusals continue until someone crosses |

**No option changes a persistent intent.** `reserve_food` (§4B) remains the only new persistent lever in Stage 4.

### 4B. Intent — one lever, approved

D2 calls for priorities, reserves and policies. Stage 3 already has priority and a food target. **Approved:** Stage 4 adds exactly one — **`reserve_food`**, a stock floor below which non-feeding work stops being claimed. It is genuinely different from priority (which reorders) and from the target (which changes production). **Policies are deferred**, with Q24 recorded as the reason: add one at a time, stop when the last is not read.

### 4C. Blocking interrupts — channel ships, nothing uses it

**Approved.** `blocking: true` exists on the decision type; no Stage 4 generator raises one. D2 reserves interrupts for injury and fire, both Stage 6. Inventing one now would be precisely the "for dramatic effect" the blueprint forbids.

---

## 5. Relationships — exact semantics

Stage 3's task model is one `currentTask` per person, carrying a `jobId`; a facility serves exactly one `jobId` (`facilities.ts`). **A job is a *kind* of work, not a discrete order** — orders are an anonymous `pending` counter. That shapes every definition below, and it is why the plan does not invent a squad or simultaneous-work model.

**R1 in detail, all phase 8, all read at phase 5 of the next tick:**

**What counts as "worked together."** Two people both held a task with the **same `jobId`** during the same tick. In Stage 3 that means they were both at the same facility doing the same kind of work in the same moment. Accumulated once per tick, not per completion, so long jobs do not dominate simply by lasting longer.

**What counts as "contended."** Two people were both **eligible** for the same `jobId` in the same tick, and at least one of them could not claim it — i.e. that person went to Standby with a capacity reason (`"Workshop is at capacity 4/4"`). Eligibility uses `isEligible(job, role)`; the capacity reason comes from `standbyReason`. This is the exact situation the Stage 3 roster already explains, so it costs no new concept.

**Which jobs receive the modifier.** Both — `maintenance` and `meals`. The modifier applies **only to the duration of a job a worker already holds**, and only when that worker is co-working the same `jobId` with someone whose pair value is at or past a threshold. It changes **nothing** about eligibility, selection order, progress counting, or whether a job is created.

**How multiple relationships combine.** For a given worker and job, take the **single most extreme** pair value among their co-workers — never a sum, never a product. Two good relationships cannot stack into a super-worker. Ties resolve to the lowest co-worker `id`, which is deterministic.

**Bounds.** Multiplier is clamped to **[0.9, 1.1]** — a 10% swing either way, at the ends of the value range. Determinism comes from: pair values changing only at phase 8, the modifier being applied at phase 5 of the next tick, ties broken by lowest id, and a clamp that makes the extremum unambiguous.

**Effects surface as one report line** per pair per day, per F1 §3.

---

## 6. Report — recorded events, never recomputed

### 6.1 The contradiction, and its resolution

`ROADMAP.md` requires the report to read *"the log without recomputing"* `[D]`. But the report's headline needs end-of-day **food and readiness**, which today live only in current state and change every tick. A report that read them would be reading live values; one that recomputed them would be re-running rules. Both contradict the rule in different ways.

**Decision D1 `[P]`:** *the report reads recorded events only, and therefore the facts it needs must themselves be recorded.*

**Where they are recorded — phase 9.** `SYSTEM_DEPENDENCIES.md` §4 already assigns phase 9 to "Derived summaries — readiness, morale". Phase 9 runs once per day at rollover and emits a `day_summary` event into the log:

```ts
{
  type: 'day_summary',
  tick,                       // the boundary this closes
  tier: 'routine',
  causeEventIds: [...],       // the day's notable events, links intact
  data: {
    day, food, supplies, readiness,
    maintenanceCompleted, mealsCompleted,
    maintenancePending, mealsPending,
    hungry, exhausted, resting,
  }
}
```

This is **recording a fact at the moment it was true**, not recomputing one. The day's food level is captured once, on the day it ended; it is never derived again. The end-of-day report is then a pure fold over that event plus the day's other events.

**Consequences, all `[P]`:**
- The report has **one** source. It cannot disagree with what happened, because it did not calculate anything.
- `readiness` and food now appear **in the log**, which is what lets the report explain *why* readiness moved without re-deriving it.
- Because `day_summary` carries `causeEventIds`, the cause chain a reader follows is the same chain the simulation actually recorded. **Causality is never invented** — the report links events that were already linked at write time.
- The live `readiness` in the controller snapshot is unchanged and still computed for the live UI. It is the *report* that reads the recorded value.

### 6.2 Report sections

1. **Headline** — read from the day's `day_summary`.
2. **What you chose** — every `decision_made`, its options, and its recorded consequences, each linked by `causeEventIds` back to the `decision_offered` that raised it.
3. **Why the numbers moved** — cause chains assembled by walking `causeEventIds`, never by re-running rules: *"meals fell behind → kitchen understaffed → 2 hungry"*.
4. **People** — per person: refused work, rested, exhausted, found nothing to eat.
5. **Deferred** — situations raised while the queue was full (§7).

### 6.3 Event timeline and debug view

**Timeline** — scrollback of the log, grouped by day, readable at phone width. **Debug view + copy-as-JSON** — the whole state, which is also the D15 save format. Cheap, and it makes a bug report reproducible.

---

## 7. The shared decision budget

D2/D16 `[D]`: decisions queue in batches, and the budget is **shared across all systems**, not per-generator. *"If any single system ever exceeds a third of the shared budget on its own, that system is the problem — the ceiling is not to be raised to accommodate it."*

**Decision B1 `[P]` — one explicit global ceiling, not a daily approximation.**

```
MAX_PENDING_DECISIONS = 6        // hard ceiling across all generators, always
DEFER_AFTER_TICKS      = 240     // a situation unseen for a day is deferred, once
```

**Rules, all `[P]`:**

1. **Pending is capped at 6 globally.** If all six slots are occupied, a generator that wants to raise another does **not** discard it. It records a `situation_deferred` event naming the generator and the condition, and the situation is **re-evaluated next tick**.
2. **A deferred situation is visible.** Its `situation_deferred` event appears in that day's report, so *"A situation the player never sees is indistinguishable from one that never occurred"* `[D]` cannot happen quietly.
3. **Repeated conditions do not flood the log.** Re-evaluation is **silent** — only the *first* deferral of a given generator, and only its eventual offering, produce events. This is what bounds the event stream: a condition that stays true for days costs **one** deferral event and **one** offering, not thousands.
4. **One offering per generator per condition episode.** A condition becomes an "episode" when it is false and then becomes true again. While it is continuously true it may raise at most one pending decision. This is the primary guard against an unbounded event stream and is deterministic — it depends only on state, never on time.
5. **Blocking decisions are capped separately and lower: 1.** No Stage 4 generator raises one (§4C), so this cap is recorded for the future and asserted to be zero.

**Determinism.** Every rule above keys off current state and event counts only. No timers, no randomness, no wall clock. `rngCursor` stays **7**.

---

## 8. Data model

```ts
// NEW
export interface Decision {
  readonly id: string;            // 'd12' — stable, survives save
  readonly tick: number;
  readonly generator: string;     // 'G1' | 'G2' | 'G3' — which one raised it
  readonly prompt: string;
  readonly options: readonly DecisionOption[];
  readonly causeEventIds: readonly number[];
  readonly blocking: boolean;     // false for every Stage 4 decision
}
export interface DecisionOption {
  readonly id: string;
  readonly label: string;
  readonly benefit: string;
  readonly cost: string;
}

// EXISTING, extended by one entry in intent[]
{ id: 'reserve-food', kind: 'reserve', value: number }
```

`decisions[]` is owned by **Decisions**; others may **request** `[D]` (§3). Resolution writes through the existing owners — Resources, Needs, Personnel — never directly, so invariant 18 holds.

**`relationships[]`** holds one entry per pair that has actually interacted, not all 21 pairs. Creating 21 entries nobody has met is the placeholder the project refuses.

**Every new object is frozen at creation**, per the Stage 3 immutability rule in `draftOf`.

---

## 9. Tick phases

`SYSTEM_DEPENDENCIES.md` §4 is authoritative. Phases 0–5 and 9 exist; Stage 4 adds **8** and **10**, and gives phase 9 a daily job.

```
0  clock · commands · intent                                     (Stage 1-3)
1  facilities                                                    (static)
2  delivery                                                      (Stage 3)
3  resources                                                     (Stage 3)
4  needs                                                         (Stage 3)
5  jobs: recovery -> duty -> intent -> opportunity, then progress (Stage 3)
   -- 6 production, 7 vehicles: absent
8  RELATIONSHIPS  accumulate pair opinion                        (NEW)
9  derived summaries — daily `day_summary` recorded              (NEW emission)
10 DECISIONS     resolve choices, then check for new situations  (NEW)
```

**Invariant 19 holds.** Phase 10 reads everything and writes only decisions. Phase 8 writes relationships; Jobs (phase 5) reads them next tick (R2).

**Why decisions are last `[D]`:** §4 — *"Must follow every other phase, or a decision could be raised on a situation that has not finished resolving."*

**Why `day_summary` sits at phase 9:** it is a derived summary, which is what phase 9 is for `[D]`.

**RNG: none.** Stage 4 draws nothing.

---

## 10. Module map

| Module | Status | Responsibility |
|---|---|---|
| `src/sim/decisions.ts` | **NEW** | generators G1–G3, the global budget, deferred-episode tracking, resolution |
| `src/sim/relationships.ts` | **NEW** | pair values, phase-8 accumulation, the bounded modifier |
| `src/sim/report.ts` | **NEW** | pure `log → report`. Reads only; calls no simulation rule |
| `src/sim/commands.ts` | modify | `choose_option`, `set_reserve` |
| `src/sim/tick.ts` | modify | phases 8 and 10; `day_summary` at phase 9; apply the modifier in progress |
| `src/sim/priority.ts` | modify | reserve resolution |
| `src/controller/controller.ts` | modify | snapshot carries decisions, relationships, the day's report |
| `src/ui/` | modify | report panel, decision queue, timeline, debug view |
| `tools/headless.ts` | modify | print decisions taken and the report |

**No new dependencies, no framework, no new UI stack.**

---

## 11. Implementation steps

Each step leaves `npm run verify` green; one commit each. Test in **four slices** — a single `npm test` wedges Termux.

**Step 1 — Relationships.** `relationships.ts`; pair accumulation at phase 8 (definitions in §5); the bounded modifier applied in `advanceWork`, reading **last** tick's value.
*Tests:* two people co-working the same `jobId` complete measurably faster; a contending pair measurably slower; multiplier never outside [0.9,1.1]; multiple pairs never stack; ties break to lowest id; opinion changes **only** at phase 8; `rngCursor` still 7.

**Step 2 — The global budget and deferred episodes.** §7, all five rules.
*Tests:* pending never exceeds 6 across all three generators; a deferral is **recorded**, never discarded; a condition held true for 5,000 ticks costs exactly one deferral and one offering; no generator alone exceeds a third of the ceiling.

**Step 3 — Decision generators G1–G3.** §4. Each reads a real condition; three options each.
*Tests:* each fires on its condition and not otherwise; **no option dominates on both benefit and cost**; **G3(a) rests a person who is below the rest threshold, and no G3 option changes a threshold**; no G3 option writes a persistent intent.

**Step 4 — Resolution as commands.** `choose_option` through `pendingCommands`; resolution writes through the owners.
*Tests:* applied exactly once at tick N+1; FIFO with other commands; unknown decision or option **rejected loudly**; causes recorded with `causeEventIds`.

**Step 5 — The reserve intent.** `set_reserve`; applied in selection.
*Tests:* headless ≡ command-path (C1 §10); an intent whose effect cannot be observed is a dead control, and the test proves it *can* be observed.

**Step 6 — `day_summary` and the report.** Emit at phase 9; `report.ts` pure.
*Tests:* **the report reads only the log** — the same log always yields the same report, and **no report function calls `tick` or any simulation rule**; headline values match the recorded `day_summary`, not the live state; cause chains resolve to real, earlier events (invariant 6); a day with no decisions produces a correct empty section; deferred situations appear.

**Step 7 — Controller and headless.**
*Tests:* determinism; identical report run to run.

**Step 8 — UI.** Decision queue, end-of-day report, timeline, reserve control, debug view.
*Tests:* none in CI — `src/ui/` is imported by no test. Manual only, and labelled so.

**Step 9 — Documentation.** `SYSTEM_DEPENDENCIES.md` phase/ownership rows, `ROADMAP.md` Stage 4 status, `AGENTS.md`, `CHANGELOG.md`, rebuild `PROJECT_MASTER.md`.

---

## 12. Acceptance criteria

| # | Criterion | Verified by |
|---|---|---|
| A1 | A decision is raised only from a real condition, never for drama | test per generator |
| A2 | No option is strictly dominant; each protects something different | test |
| A3 | A choice changes subsequent behaviour in the same run | test |
| A4 | The report names the choice, its effect and the cause | test |
| **A5** | **The report reads recorded events only; no report function calls a simulation rule.** Headline facts come from `day_summary` | source review + test |
| **A6** | **`day_summary` is emitted at phase 9 and records facts at the time they were true** | test |
| **A7** | **Report causality is never invented** — every link is a `causeEventIds` that already existed | test |
| A8 | Same seed + same commands → identical state, report and decisions | test |
| A9 | Every decision, option and relationship is frozen | isolation test |
| A10 | `rngCursor` is 7 after a 30-day run | existing test, unchanged |
| **A11** | **Pending decisions never exceed 6 globally; deferrals are recorded and visible; a sustained condition cannot flood the log** | test |
| A12 | Relationships change work measurably, satisfying their kill rule | Chain E test |
| **A13** | **The modifier is bounded to [0.9,1.1], never stacks, and applies only to a job already held on the same `jobId`** | test |
| **A14** | **No G3 option inverts Stage 3's rest direction or adds a persistent lever** | test |
| A15 | Invariants 3, 4, 6, 7, 9, 12, 14, 15, 18, 19 still hold | existing tests, unchanged |
| A16 | `npm run verify` green, in slices | CI |

---

## 13. What changed in this revision

| # | Defect corrected | Fix |
|---|---|---|
| 1 | **Report source of truth was self-contradictory** — "log only" versus a headline needing live food and readiness | **§6.1.** `day_summary` is emitted at phase 9, recording facts at the time they were true; the report folds over recorded events only. Causality stays in the causal links that already existed |
| 2 | **Relationship semantics were vague** — "worked together" and "contended" were undefined in Stage 3's task model | **§5.** Both defined against `jobId`, eligibility and the capacity reason the roster already reports; which jobs carry the modifier, that multiple pairs take the **extremum** not a sum, and the [0.9,1.1] clamp are all now specified. No squads, no simultaneous work |
| 3 | **G3 had the rest direction backwards** — raising the rest threshold was offered as lightening the load, when Stage 3 rests a person when fatigue *reaches* it, so raising it means resting *later* | **§4 G3.** Rewritten as three transient options that are correct given Stage 3's rules, none of which touches a threshold or adds a persistent lever |
| 4 | **The budget was approximate** ("~3–5 per day") and left repeated conditions unbounded | **§7.** One explicit global ceiling of 6, deferred episodes recorded and visible, and a one-offering-per-episode rule that bounds the event stream deterministically |

**Developer decisions recorded as approved:** relationships carry the modifier (§5, R1) · blocking interrupts ship unused (§4C) · `reserve_food` is the only new persistent intent (§4B).

---

## 14. Deferred, and why

| Deferred | To | Reason |
|---|---|---|
| **Items, condition, durability, weapons, loadouts** | **7** | **D21 — guaranteed and unchanged** |
| Blocking interrupts actually raising | later | D16 reserves them for injury and fire (Stage 6); the channel ships, nothing uses it |
| Policies in the intent set | later | Q24: add one at a time, stop when the last is not read |
| Hydration, morale, injuries | 6 | B4 §11 |
| Anomalies, commitments | 5 | D3, C3 |
| Relationship dialogue, personality, squads | never | F1 §3 forbids it; and Stage 3's task model has no notion of a squad |
| A real readiness crisis as an interrupt | 6 | Would need morale and injuries |

---

## 15. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Decisions that are obvious, so the interaction teaches nothing | **High** | A2 asserts no option dominates; each generator is built on a genuine conflict |
| The report restates the log without explaining it | **High** | A4/A5; the report's value is the cause chain |
| Relationships shipped as decoration | **High** | R1 approved; A12 asserts the chain end to end |
| A report fact drifts from what actually happened | **High** | A5–A7; the report recomputes nothing, and `day_summary` records facts once |
| A sustained condition floods the event stream | Medium | §7 rule 4; A11 measures a 5,000-tick condition |
| Phase 8 → phase 5 next-tick read looks like a bug and gets "fixed" | Medium | R2, and a code comment naming it as documented |
| Multiple relationship pairs stacking into a super-worker | Medium | §5 extremum rule plus the [0.9,1.1] clamp; A13 |
| Scope creep into Stage 5 anomalies or commitments | Medium | §14; generators read Stage 3 conditions only |
| A fifth decision generator or a second intent | Medium | §4B and §13 fix the counts; Q24 governs growth |

---

*Nothing here has been implemented. No source file or test was modified in producing this plan. Repository state at `4e8c513`, clean and synchronized with `origin`. **D21 unchanged.***

**Planning stops here.** This plan is ready for Build Mode on your word.
