# Stage 2 Master Plan — autonomous jobs and first intent

**Status:** authoritative Stage 2 specification. Supersedes no existing document; `docs/plans/STAGE2_MASTER_PLAN.md` did not previously exist.
**Synthesised from:** the repository at HEAD `88dbe92`, `docs/ROADMAP.md`, `SYSTEM_DEPENDENCIES.md`, `GAME_DESIGN_BLUEPRINT.md`, `LOCKED_DECISIONS.md`, `ARCHITECTURE.md`, `OPEN_QUESTIONS.md`, `docs/reviews/STAGE1_EVIDENCE_AUDIT.md`, `docs/plans/STAGE1_PLAN_v4.md`, and two independently written Stage 2 plans (`Milsim_Stage2_Plan_SpaceBunny.md`, `Milsim_Stage2_Plan_Step5.md`).
**Scope of this document:** Stage 2 only. It does not implement Stage 2, and it does not reopen Stages 3–10.

**Tags used below.** `[D]` documented in an authoritative document · `[C]` inferred from existing code · `[P]` newly recommended here · `[V]` verified by command · `[M]` measured by a standalone model of these rules, run outside the repository (see §4A).

---

## 0. Revision log — balance correction (rev 2) · self-audit (rev 3) · consistency pass (rev 4)

An earlier draft of this plan specified arrival rates that made the priority control **completely inert**, and asserted a throughput difference that was computed from *capacity* rather than from *demand*. Both were found after the fact and are corrected here. Sections changed: **4.1, 5.2, 6.2, 6.4, 6.5, 6.6, 7 (Step 5), 8.1, 8.3, 10, 12.2, 13.3, 14.** Nothing was weakened to make the plan pass; two acceptance criteria were made **stricter**.

Three substantive corrections:

| # | Was | Now | Evidence |
|---|---|---|---|
| **R1** | Arrivals at 600 / 100 ticks | **Arrivals at 24 / 8 ticks** | All three settings produced byte-identical output at the old rates (§4A.1). At the new rates the settings diverge on 7/7 seeds (§4A.3). |
| **R2** | *"33% throughput difference"* claimed from worker counts | **Removed.** The real observable is *backlog divergence*: meal backlog 119 vs 0, maintenance backlog 40 vs 0 | The 33% figure described capacity, which demand never used. Measured completion differences are 297 vs 257 maintenance (+15.6%) and 777 vs 896 meals (−13.3%) (§4A.3). |
| **R3** | `pending -= 1` on **completion** | **`pending -= 1` on claim**; completion decrements nothing | With the old rule, 7 workers each claim the same single pending unit and `pending` ends at **−6**. Phantom work (§4A.2). |

Also: **arrival jitter is set to 0** (§5.2). Measured to be non-load-bearing — the trade-off is identical with jitter disabled.

**Post-revision self-audit (rev 3).** After rev 2, a full audit of the document against itself and against the authoritative sources found **11 further defects**, all now fixed. They are listed in §11A so a reviewer can see what was wrong rather than trusting a clean-looking document. Three were substantive:

| # | Defect | Fix |
|---|---|---|
| **A1** | **Two rows of the §4A.3 reference table were wrong** — `balanced` and `meals-first` had been transcribed from an averaged, jittered run and did not match the no-jitter figures actually being cited | Re-measured; table is now 267/866, 297/777, 257/896 |
| **A2** | **§4.3 still said `pending` is decremented "on completion"**, contradicting the corrected §6.4 | Corrected to "on claim", with the error noted in place |
| **A3** | **Work arrivals were an undocumented invention, declared nowhere.** `ROADMAP.md` requires jobs with "eligibility, duration, prerequisites, outputs" — **no arrival cadence is specified anywhere** | New **§4.10 Decision J** declares it explicitly so a reviewer can reject it |

**Rev 4 — targeted consistency pass found 4 more, now fixed (§11A).** The most serious: **§13.3 still cited the superseded reference figures**, and **ASSERT 8 required forcing `arrivalJitterTicks > 0`** while §5.2 and §6.2 had deliberately removed jitter — satisfying it would have meant re-adding the RNG draw or introducing test-only behaviour that misrepresents the real simulation. ASSERT 8 is now a stronger equivalent: it asserts the arithmetic that makes the trade-off structural, against the real constants, consuming no RNG.

---

## 1. Verified repository state and baseline

`[V]` — all of the following were produced by running the commands, not recalled:

| Check | Command | Result |
|---|---|---|
| Remote | `git remote get-url origin` | `https://github.com/MarkKramm/Milsim.git` |
| Branch | `git branch --show-current` | `main` |
| HEAD | `git rev-parse HEAD` | `88dbe92b2d331d9ee4eb74643e457f9908f44208` |
| Working tree | `git status --porcelain` | *(empty — clean)* |
| Test suite | `npm test` | **95 pass, 0 fail** |
| Full gate | `npm run verify` | typecheck + tests + build + headless run, all pass |
| Headless determinism | `npm run headless -- --ticks 5000 --seed 42 --json`, twice | digest `feecc016` both times — identical |
| Planning directory | `ls docs/plans/` | only `STAGE1_PLAN_v4.md` |

**HEAD is unchanged** from the last two verification passes. No source file or test was modified in preparing this plan.

**One documentation drift `[V]`:** `AGENTS.md` states "88 tests" in two places. The real number is **95**. Correct it when Stage 2 work begins; `AGENTS.md` is the file a future agent trusts first.

**Authority rules applied `[V]`, read from the documents themselves:**

- `docs/PROJECT_MASTER.md` is a **generated bundle** — its own header says *"Generated file. Do not edit… Source of truth: `~/military-base-sim-dev/docs/`."* Rebuild with `tools/build-master.sh`. Never hand-edit it.
- `SYSTEM_DEPENDENCIES.md` §3 controls **who writes a field**; §4 controls **when a system runs**.
- `ARCHITECTURE.md` §3 controls **state shape**; §4 states in its own text that phase numbers defer to `SYSTEM_DEPENDENCIES.md`.
- `ROADMAP.md` controls **stage scope and the reference fixture**, and explicitly authorises adjusting that fixture when its own stated conditions are not met.
- `GAME_DESIGN_BLUEPRINT.md` §"Status labels" defines `SETTLED` / `PROVISIONAL` / `OPEN`.
- `docs/_archive/**` is superseded and is excluded by rule.

---

## 2. Authoritative Stage 2 requirements

`[D]` unless marked. Quoted or closely paraphrased from the source, not reconstructed.

**Scope — `ROADMAP.md` §Stage 2:**
- 6–8 personnel with IDs, names, and duties.
- 3 jobs with eligibility, duration, prerequisites, outputs.
- Autonomous task selection: needs → duties → availability → **player intent**.
- Hysteresis (D6): finish or abandon; abandoning costs progress.
- Deterministic tie-breaking.
- **One simple player intent:** a priority order between two competing kinds of work. *"That is the entire command surface at this stage."*
- UI: roster showing each person's current task **and the reason they chose it**.

**Gate — `ROADMAP.md`:** *"watching them work is interesting, and one priority setting visibly changed what happened."* At least **3 of 4** evidence items (§Gate evidence). **Days 4–5** are the honest test; item 4 is named as both the hardest item and the one Stage 2 most often fakes.

**The two fixture conditions — `ROADMAP.md`, quoted:**
1. *"Both priority settings change observable behaviour."*
2. *"Neither setting is strictly dominant. If one order always wins, the fixture is broken and must be adjusted before the gate is attempted."*

**The documented fixture — `ROADMAP.md`:** 7 personnel (3 generalists, 2 maintenance-capable, 2 supply-capable); jobs Maintenance / Meal preparation / Standby; workshop capacity 2, kitchen capacity 2; initial priority Balanced; durations 90 min and 30 min.

**Selection ladder — `GAME_DESIGN_BLUEPRINT.md` B3 §3 `[D]`, verified verbatim at HEAD:**
1. Urgent needs · 2. Recovery · 3. **Duties (assigned role)** · 4. **Player intent** · 5. Opportunity.

Plus, same section: *"Tie-breaking is deterministic — lowest ID first, never randomly"*, and *"Hysteresis is mandatory"*.

**Ownership — `SYSTEM_DEPENDENCIES.md` §3 `[D]`:**

| Field | Owner | Stage |
|---|---|---|
| `persons[].identity`, `.role`, `.specialties`, `.history` | Personnel | 2 |
| `persons[].currentTask`, `.taskProgress`, `.location` | Personnel | 2 |
| `facilities[]`, `.capacity`, `.availability` | Facilities | 2 |
| `jobs[]` — definitions, eligibility, prerequisites | Jobs | 2 |
| `jobs[]` — progress, queues, assignment | Jobs | 2 |

**Phases — `SYSTEM_DEPENDENCIES.md` §4 `[D]`:** Facilities/Items = phase 1; Jobs (selection then progress) = phase 5; Player intent = phase 0. A phase may read only fields owned by its own or earlier phases (invariant 19).

**Invariants Stage 2 must make true:** 3 (no person holds two active jobs) · 4 (no job progresses without a valid worker) · 6 (causal ids valid) · 9 (no silent task switching) · 10 (tick +1) · 11 (cursor advances only in `rand()`) · 14 (same seed + same commands → identical log) · 15 (JSON round-trip) · 18 (no system writes a field it does not own) · 19 (phase read rule).

**D21 `[D]`:** equipment and loadouts remain a **guaranteed Stage 7 milestone**. Nothing in this plan touches it. See §9.2.

---

## 3. Comparison of the two submitted plans

Both plans independently arrived at the same three findings, which raises confidence in all three. They differ on the fixture and on who owns task progress.

| Issue | SpaceBunny plan | Step 5 plan | Adopted here |
|---|---|---|---|
| Why the fixture is broken | 7 people vs 2+2 slots ⇒ ≥3 idle; each kind saturates its own facility ⇒ **priority cannot reallocate a saturated resource** | Duties (ladder rule 3) outranks intent (rule 4); 2 maintenance-capable fill workshop-2 exactly, 2 supply fill kitchen-2 exactly ⇒ **intent is never consulted at all** | **Both are correct and complementary.** Duties-inertness is the sharper failure (control is *totally* dead); saturation is what survives the fix. See §4. |
| Proposed fixture | Raise capacities to be non-binding; bound availability with `periodOf()` | Change the mix to 5 generalists / 1 maintenance / 1 supply; keep capacities 2/2 | **Neither as proposed.** Step 5's 5/1/1 leaves slot counts *identical* under both priorities (proof in §4.1). Adopted: **keep the documented 3/2/2 mix, raise capacity to 4/4.** |
| Task progress ownership | Jobs owns everything; `persons[].currentTask` **derived, never stored** | Personnel owns `currentTask`; Jobs calls a `claimTask` request | **Adopt the documented table exactly:** Personnel owns `currentTask`/`taskProgress` and exposes the only writer functions; Jobs owns `jobs[].pending` and never writes a person field directly. |
| Deferred work | `jobs[]` entries stay `queued` across days | `jobs[].pending` counter, never cleared at rollover | **Step 5's counter**, with **SpaceBunny's insistence on a visible "why not done" reason**, added to §6.5 |
| Hysteresis | Implement full D6 including abandonment | Implement only no-silent-switching; abandonment has **no trigger at Stage 2** | **Step 5, and SpaceBunny agrees in substance.** Abandonment with no trigger is untestable scaffolding. |
| Arrival jitter | Not proposed | Seeded jitter, one RNG draw per arrival, fixed order | **Neither.** Proposed by one plan, then measured non-load-bearing and **removed** (§5.2, §4A). No in-tick randomness at Stage 2 |
| `architecture.test.ts` | Step 1 of the sequence opens it narrowly | Conflict F — must be updated, not worked around | **Both.** Adopt as Step 1. |
| Non-dominance test | Narrative "the backlog swaps" | Concrete 5-seed × 3-setting assertion set | **Step 5's gate, adopted then substantially strengthened** to 7 seeds and 8 causal assertions (§8.3) |

**Neither plan is treated as authoritative.** Where they agree, the agreement is corroboration; where they disagree, §4 resolves it from the documents and from arithmetic.

---

## 4. Explicit decisions resolving the conflicts

### 4.1 Decision A — the fixture, resolved by arithmetic

**Finding `[V]`.** Read the selection ladder at B3 §3: **duties (rule 3) outrank intent (rule 4)**. In the documented fixture the two maintenance-capable people exactly fill workshop-2, and the two supply-capable exactly fill kitchen-2. Both generalists find every facility full. **Intent is never reached. The control is inert — condition 1 of the roadmap fixture fails before a line of code exists.**

**But that is not the whole problem, and Step 5's proposed fix does not solve it.** Step 5 proposes 5 generalists / 1 maintenance / 1 supply at capacity 2/2. Trace it, priority = maintenance-first, ascending ID, everyone eligible for everything they can do:

| Person | Rule that fires | Result |
|---|---|---|
| maintenance spec | 3 — duties | maintenance, workshop 1/2 |
| supply spec | 3 — duties | meals, kitchen 1/2 |
| generalist A | 4 — intent | maintenance, workshop 2/2 **full** |
| generalist B | 4 — intent | falls through to meals, kitchen 2/2 **full** |
| generalists C–E | — | standby |

Final: **maintenance 2, meals 2.** Repeat with `meals-first`: the generalists fill the kitchen first, then spill onto the free workshop slot. Final: **meals 2, maintenance 2.**

**Slot counts are identical under every priority. Throughput is therefore identical, and the fix produces a control that is *weakly* observable — it changes *who* works, not *how much gets done*.** `ROADMAP.md` condition 1 says *"visibly starve meal preparation"*. Starvation requires a throughput difference. 5/1/1 does not produce one.

**The structural reason, stated once so it is not re-derived.** Occupancy of a facility is a function of *(its queue being non-empty)* and *(the workforce)*. It is not a function of priority. With 7 people and 4 slots, whenever both queues are non-empty all four slots fill identically no matter the order; whenever a queue is empty, the other fills identically. **Priority can only change throughput when facility capacity is not the binding constraint** — that is, when there are enough slots for the workforce, and priority instead decides which queue the workforce attacks first.

**Decision A1 `[P]` — the adopted fixture.** One documented number changes; everything else in the roadmap table is preserved.

| Element | Documented | **Adopted** | Change |
|---|---|---|---|
| Personnel | 3 generalists, 2 maintenance-capable, 2 supply-capable | **unchanged** | — |
| Jobs | Maintenance, Meal preparation, Standby | **unchanged** | — |
| Durations | 90 min / 30 min | **unchanged** | — |
| Initial priority | Balanced | **unchanged** | — |
| Facilities | workshop 2, kitchen 2 | **workshop 4, kitchen 4** | **the one change** |

**Why this satisfies both roadmap conditions — traced, not asserted.** Seven people, roles: 2 maintenance, 2 supply, 3 generalist. Capacities 4/4.

*`maintenance-first`*: maint-spec ×2 → maintenance (2/4). supply-spec → meals (1/4). generalist A → maintenance (3/4). generalist B → maintenance (4/4 full). generalist C → meals (2/4). supply-spec #2 → meals (3/4).
**⇒ maintenance 4, meals 3.**

*`meals-first`*: maint-spec ×2 → maintenance (2/4). supply-spec ×2 → meals (2/4). generalist A → meals (3/4). generalist B → meals (4/4 full). generalist C → meals full → falls to maintenance (3/4).
**⇒ maintenance 3, meals 4.**

- **Condition 1 satisfied — measured, not asserted.** `ROADMAP.md` asks that *"Maintenance first"* visibly starve meal preparation and *"Meals first"* visibly defer maintenance. At the adopted arrival rates (§4A.3): `maintenance-first` ends 5 days with **119 unstarted meal orders** and a clean workshop; `meals-first` ends with a clean kitchen and **40 unstarted maintenance orders**. Each is worse on a different job, so neither setting dominates. Full figures and the Day 4–5 window in §4A.3.
- **~~A 33% throughput difference~~ — withdrawn.** An earlier draft of this plan claimed 33% from comparing 4 workers against 3. That compared *capacity*, which the then-proposed demand of 2.4 arrivals/day never used; at those rates all three settings were measured identical. The real and much larger observable is **backlog divergence** (119 vs 0). Measured completion differences are 297 vs 257 maintenance (+15.6%) and 777 vs 896 meals (−13.3%). Do not quote the 33% figure.
- **Intent is reached `[M]`:** with both queues non-empty, the three generalists fall through rule 3 to rule 4 on every selection. The control is live.

**Why this and not the alternatives:**

| Option | Rejected because |
|---|---|
| Keep 3/2/2 at 2/2 | Intent unreachable. Control inert. `ROADMAP.md` authorises adjusting the fixture. |
| 5/1/1 at 2/2 (Step 5's proposal) | Slot counts proven identical above. Weakly observable only. |
| Keep 2/2, raise to 3/3 | Traced above: both orders give 3/3. Identical. |
| Raise capacities, keep mix 3/2/2 | **Adopted.** Smallest single deviation, and it keeps the documented roster mix intact — which matters, because the roster mix is what `D22` reasons about. |
| Reduce workforce below 4 | Violates `D22` ("6–8 personnel", Stage 2). Not permitted. |
| Share one capacity pool between both job kinds | Invents a facility arrangement no document describes. More complexity for the same result. |

**Documented cost of this change, stated honestly.** `ROADMAP.md` annotates capacity with *"Capacity is what creates contention."* At 4/4 with 7 workers, capacity is no longer the *primary* source of contention — demand is. Capacity still binds during bursts and must never be exceeded, so the mechanism survives; but the annotation is now less load-bearing than it was written to be. **`ROADMAP.md` §Stage 2 reference scenario must be updated to match.** This is a change to a documented fixture number, made openly and with the reasoning above — not silently.

### 4.2 Decision B — "outputs" have nowhere to go `[C]`

`ROADMAP.md` requires jobs with *"outputs"*, but `SYSTEM_DEPENDENCIES.md` §3 places `storage[].holdings` at Stage 7 and `resources` at Stage 3, and B3 §4 says Jobs *"Writes job progress and Resources (on completion)"*. At Stage 2 no system owns a stock.

**Resolved:** the ownership table controls. A job's Stage 2 *output* is a decrement of its own pending queue plus a `notable` completion event. No resource is invented. When Storage arrives at Stage 7 the completion gains a `consume`/`produce` request, exactly as `SYSTEM_DEPENDENCIES.md` §3 describes.

### 4.3 Decision C — who writes a person field `[D]`

The ownership table assigns `persons[].currentTask` and `.taskProgress` to **Personnel**, and `jobs[]` progress/queues/assignment to **Jobs**. Two blueprints describe the same fact differently (`SYSTEM_DEPENDENCIES.md` §3 vs B3 §2 *"Owned by Jobs: task assignment and progress"*).

**Resolved by following the documented table literally**, which is both the ownership rule and the request pattern (`SYSTEM_DEPENDENCIES.md` §3):

- `personnel.ts` exposes the **only** writers: `claimTask(...)`, `advanceTask(...)`, `releaseTask(...)`, `recordOutcome(...)`. Each returns a new `Person`. **`jobs.ts` never assigns a person field.**
- `jobs.ts` owns `pending` and decrements it **on claim** (§6.4), not on completion. *(Corrected in rev 2 — the earlier text here said "on completion", which contradicted §6.4 and produced phantom work; see §4A.2.)*
- `facilities.ts` exposes a **read-only** predicate `hasFreeCapacity(facilityId, persons)`. Nothing writes facilities at Stage 2 because capacity is static, so **the phase-1 step is absent rather than stubbed** — the precedent set in `STAGE1_PLAN_v4.md` §3. It is added at Stage 7 when condition arrives.

This satisfies invariant 18 by construction: there is exactly one place in the codebase where a person field is written.

### 4.4 Decision D — Standby is a fallback, not a queue `[P]`

`ROADMAP.md:152` calls Standby one of three jobs; `:194` calls it *"a fallback"*. Modelling it as a queue would require inventing standby work that no document defines.

**Resolved: fallback.** Ladder rule 5 is *"Opportunity — anything else eligible and unclaimed"*. A person who reaches no rule stands by: `currentTask === null`. The roster shows **Standby** as the label. This is what makes the idle pool visible rather than invisible.

### 4.5 Decision E — no facility events at Stage 2 `[C]`

D2 is *"SETTLED · Stage 2"* and lists *"Facility unavailable (notable), condition degraded"*. But D2 §11 says *"Stage 2 (basic), 7 (condition)"*, and at Stage 2 the only cause of unavailability is occupancy, which is already displayed on the roster. **No facility events.** Occupancy is derived from `persons[]`, so there is nothing new for Facilities to report.

### 4.6 Decision F — facility degradation is rejected `[D]`

One submitted plan proposes facility degradation. **Rejected**, on three independent grounds:

1. **The roadmap assigns it elsewhere.** D2 §11 puts condition at Stage 7; `SYSTEM_DEPENDENCIES.md` §3 has no `condition` field at Stage 2.
2. **It has no cause at Stage 2.** Degradation requires wear, and wear is applied by use of *items* — which are Stage 7 (invariant 16, *"Only Items writes items[].condition"*). Facility wear without items is an invented loop with no driver.
3. **It is a runaway.** Degradation lowers availability, which lowers throughput, which increases backlog, which increases idle time — a self-amplifying spiral with no relief valve, in a stage whose gate is *"watching them work is interesting"*. A spiral that ends the base in a corner is a Stage 3–5 concern with a designed consequence ladder.

**The same scrutiny, same answers** — all deferred, none is needed for Stage 2:

| Tempting mechanic | Verdict |
|---|---|
| Facility degradation / condition | **Reject** — Stage 7 (D2 §11), no Stage 2 cause, runaway risk |
| Schedules (B5) | **Reject** — B5 §11 is Stage 3 |
| Deadlines / perishable work | **Reject** — no owner in the ownership table; invents a subsystem |
| Needs, hunger, fatigue | **Reject** — Stage 3, phase 4; D13 |
| Random events / anomalies | **Reject** — D3, Stage 5; scripted beats forbidden |
| A resource economy / storage | **Reject** — Stage 7 (invariants 1, 2, 17) |
| Seeded arrival jitter | **Reject — measured, then removed.** Proposed by one plan, tested in §4A, found non-load-bearing (§5.2). Removing it deletes the only in-tick RNG draw |
| A third facility | **Reject** — no document names one |
| Named-option decisions | **Reject** — Stage 4 |

### 4.7 Decision G — omit fields nothing reads `[C]`

`SYSTEM_DEPENDENCIES.md` §3 lists `persons[].specialties` and `persons[].location` as Stage 2, but B2 §11 puts specialties at **Stage 6** and B2 §3 says they modify *rate and reliability, never eligibility* — and Stage 2 has no rates. `location` is derived for display from the current task's facility.

**Both omitted.** Storing a field no rule reads is the placeholder the project refuses repeatedly (`src/sim/state.ts:20-23`, `STAGE1_PLAN_v4.md` §3). Omission is free to reverse. `personnel.ts` therefore adds only what Stage 2 reads: `id`, `name`, `role`, `currentTask`, `history`.

### 4.8 Decision H — `architecture.test.ts` must be opened deliberately `[V]`

`ARCHITECTURE.md` §3 documents `personnel`, `jobs`, `facilities` as Stage 2 state. `src/sim/architecture.test.ts:117` asserts `SimState` declares **none** of them.

**Resolved: the test is updated, never weakened.** Remove exactly `personnel`, `jobs`, `facilities` from `forbiddenFields`. **Keep** `storage`, `items`, `readiness`, `resources` — those are still future stages, and the test's real purpose is to stop Stage 3 and Stage 7 from being stubbed early. This is **Step 1**, on its own, so that any deletion of the whole test is visible in review.

### 4.9 Decision I — `Command` stops being `never` `[D]`

`src/sim/commands.ts` declares `export type Command = never`, so `applyCommands` rejects everything. Stage 2 needs the **one** command `ROADMAP.md` authorises: set the priority. C1 §4 says intent is *"Written only by commands"*, so the UI must reach intent through the queue — never by writing state. Invalid values still emit `command_rejected` with a reason (C1 §3).

### 4.10 Decision J — work arrivals are an invention, and is declared as one `[P]`

**This is the one mechanic in Stage 2 that no authoritative document specifies, and the audit found it undeclared.**

`ROADMAP.md` §Stage 2 requires *"3 jobs with eligibility, duration, prerequisites, outputs"*. It names **no arrival cadence** — no statement that work arrives at all, let alone on a schedule. `GAME_DESIGN_BLUEPRINT.md` B3 describes *selection, progress, hysteresis and abandonment*; it never says where the units of work come from. `SYSTEM_DEPENDENCIES.md` §3 gives Jobs ownership of *"progress, queues, assignment"* — the word **queues** implies a backlog, but nothing states a source.

**Without a demand model there is nothing for priority to allocate.** With zero work, every worker stands by forever; with unconstrained work, everything completes and nothing ever queues. Both make the control inert, which is exactly the failure measured in §4A.1. So arrivals are not optional decoration — they are load-bearing, and they are ours, not the documents'.

**Declared explicitly so a reviewer can reject it:**

| Property | Value | Status |
|---|---|---|
| Arrival cadence | maintenance every 24 ticks, meals every 8 ticks | **`[P]` invented.** Derived from capacity ceilings, §4A.3 |
| Arrival jitter | **none** | `[P]` proposed, measured, removed (§5.2) |
| Queue survival | `pending` persists across the day boundary | `[P]` invented — but it is the literal reading of `ROADMAP.md` condition 1 (*"must be adjusted before the gate is attempted"*) only if queues persist, and of B3 §7 *"delay is what makes consequences visible"* |
| `Job.output` | decrement own queue + emit event | Forced by §4.2; no resource exists at Stage 2 |

**The honest framing for a reviewer:** Stage 2's gate is *"watching them work is interesting, and one priority visibly changed what happened."* The documented fixture supplies people, jobs, durations and capacity, but **no source of work** — so the plan must supply one, and any two choices of demand will produce different games. The chosen rates are the weakest possible claim: a fixed, jitter-free, uniform cadence with no new state and no new system. **A reviewer who prefers a different demand model should change the two interval constants in §12.2 D-2 and re-run §8.3 — nothing else in the plan depends on them.**

What must *not* happen is closing this gap with a mechanic borrowed from a later stage — perishable work with deadlines, needs-driven demand (D13/Stage 3), anomalies (D3/Stage 5), or a resource requirement that implies storage (Stage 7). All four are rejected in §4.6 for exactly that reason.

---

## 4A. Measured workload analysis `[M]`

This section exists because §4.1 originally asserted numbers that turned out to be wrong. Every figure below was produced by **running a standalone model of this plan's rules** — selection ladder, eligibility, facility capacity, hysteresis, arrivals, completion — held entirely outside the repository in Termux's temporary directory. It is a scratch model, **not** application code, and nothing in `src/`, `tools/`, or `docs/` was changed to produce it. Build Mode will re-derive the same figures from the real implementation; §8.3 requires it to.

### 4A.1 The original rates made the control inert

At the originally proposed rates — maintenance 1 per 600 ticks ±120, meals 1 per 100 ticks ±20, capacity 4/4, 7,200 ticks — measured output was:

| Setting | maintenance done | meals done | maint backlog | meal backlog | worker-time utilisation | standing by |
|---|---|---|---|---|---|---|
| balanced | 12.6 | 71.4 | 0 | 0 | **6.4%** | **93.5%** |
| maintenance-first | 12.6 | 71.4 | 0 | 0 | **6.4%** | **93.5%** |
| meals-first | 12.6 | 71.4 | 0 | 0 | **6.4%** | **93.5%** |

**All three rows are identical.** Demand was roughly **4%** of what the base could process, so both queues were empty almost every tick, no worker ever had a genuine choice, and the priority scan order was never consulted. The base was idle 93.5% of the time.

The arithmetic behind it, now corrected:

| | Arrivals/day | Max service/day (4 workers) | Utilisation of capacity |
|---|---|---|---|
| maintenance | 2.4 | 64 | **3.8%** |
| meals | 14.4 | 192 | **7.5%** |

### 4A.2 A second defect found while measuring: phantom work

§6.5 of the original draft decremented `pending` **on completion**, while §6.4 allowed any number of eligible workers to claim a job whenever `pending > 0` and a facility slot was free. With one pending unit and free slots, **all 7 workers claim it**; all 7 then complete and each decrements, driving `pending` to **−6**. Four units of work would be performed for one order, and the backlog counter would be nonsense.

**Correction `[P]`:** `pending` is decremented **at claim** and represents *unclaimed work waiting*. Completion decrements nothing. Abandonment (when it gains a trigger, Stage 3+) returns the unit to the queue. This makes `pending` never negative by construction and makes it directly readable as backlog.

### 4A.3 Measured behaviour at the adopted rates

**Arrivals: maintenance every 24 ticks (60/day), meals every 8 ticks (180/day), jitter 0. Capacity 4/4. 7,200 ticks (5 days).** Measured over 7 seeds; with jitter 0 the result is seed-independent, so all seeds give the identical row below — which is itself the robustness property §8.3 relies on.

| Setting | maintenance done | meals done | maint backlog | meal backlog |
|---|---|---|---|---|
| **balanced** | 267 | 866 | 30 | 30 |
| **maintenance-first** | **297** | 777 | 0 | **119** |
| **meals-first** | 257 | **896** | **40** | 0 |

Completion deltas against `meals-first` as the baseline: `maintenance-first` completes **+15.6%** maintenance and **−13.3%** meals; `balanced` sits between at **+3.9% / −3.3%**. **The dominant observable is backlog, not throughput** — a 119-order swing on meals versus a 40-order swing on maintenance is far larger than the completion differences, and it is the number a player can read off a card.

Claim attribution over the run (for ASSERT 6, §8.3): duty-rule claims 638–639 under every setting — the specialists are unaffected by priority, as B3 §3 intends. Intent-rule claims 442 (`maintenance-first`), 501 (`balanced`), 522 (`meals-first`), each carrying its own setting's reason string.

Isolated to the **Day 4–5 window only** (ticks 2,881–7,200), which is what the gate actually judges:

| Setting | maintenance done in D4–5 | meals done in D4–5 | maint backlog at end | meal backlog at end |
|---|---|---|---|---|
| balanced | 162 | 522 | 30 | 30 |
| maintenance-first | **180** | 468 | 0 | **119** |
| meals-first | 156 | **540** | **40** | 0 |

**Condition 1 — both settings change observable behaviour. `[M]` satisfied.** The dominant observable is **backlog**, not throughput: `maintenance-first` ends with 119 unstarted meal orders and a clean workshop; `meals-first` ends with a clean kitchen and 40 unstarted maintenance orders. Both are plainly visible on a facility card at phone width.

**Condition 2 — neither is strictly dominant. `[M]` satisfied.** Each setting is *worse* on a different job than the other:

| | `maintenance-first` | `meals-first` | which is worse? |
|---|---|---|---|
| maintenance backlog | 0 | **40** | meals-first |
| meal backlog | **119** | 0 | maintenance-first |

Neither ranks higher on both axes, so there is no ordering of these two settings that is simply better. `ROADMAP.md` condition 2 is met.

**No starvation to zero. `[M]`** Even under `maintenance-first`, meals still complete 777 orders over 5 days; even under `meals-first`, maintenance still completes 257. Neither job ever stops.

**Why these rates, and not numbers chosen to force a backlog.** The rates are set by two capacity ceilings that follow from the *documented* fixture and nothing else:

| Quantity | Value | Derivation |
|---|---|---|
| Worker-ticks available/day | 10,080 | 7 people × 1,440 ticks |
| Maintenance service capacity/day | 64 | 4 workshop slots × (1440 ÷ 90 ticks) |
| Meal service capacity/day | 192 | 4 kitchen slots × (1440 ÷ 30 ticks) |
| Maintenance demand | **60/day** | interval 24 ticks — set just **under** the 64 ceiling, so maintenance is serviceable when prioritised and falls behind when not |
| Meal demand | **180/day** | interval 8 ticks — set just **under** the 192 ceiling, for the same reason |
| Total demand | **10,800 worker-ticks/day** | **107% of available** — a small, deliberate structural deficit |

That last line is the whole design. Each job is individually serviceable but the pair is overcommitted, so **priority is a genuine allocation choice rather than a foregone conclusion.** If either demand were set *above* its own ceiling the job could never be cleared and priority would stop mattering; if both were set well *below*, the queues would never build and nothing would be visible. Sweeping the interval space confirmed a sharp transition — at 30/12 and 36/14 all three settings are again identical; at 24/8 they diverge. The adopted values sit just inside the divergent region, not at its edge.

**Known cost, stated rather than hidden.** At **99.7%** worker-time utilisation `[M]` (standalone 0.3% across 7,200 ticks × 7 workers) the base is permanently saturated and backlog grows without bound. Nothing breaks, because Stage 2 defines no consequence for a backlog — but it is a signal, not a solution. `D1`'s consequence ladder and `D7`'s pressure belong to Stage 3, and this is precisely the pressure Stage 3 is meant to make meaningful. **A structural deficit is the correct thing to hand Stage 3, and it must not be resolved by adding a Stage 2 relief valve.**

---

## 5. The chosen gameplay loop and intended player experience

### 5.1 The loop

```
  work arrives (queued)  →  a free worker picks the highest-priority
  claimable job  →  they work it for its full duration  →  it completes,
  or it waits, visibly, until someone can take it
```

Three things the player does: **watch**, **read the reason**, **change one setting**.

### 5.2 Where cross-day pressure comes from

Work arrives on a **fixed cadence per job kind, with no jitter** — maintenance every 24 ticks, meals every 8 ticks. The derivation and the measured consequences are in §4A.3.

**Jitter was proposed, measured, and removed.** An earlier draft carried seeded arrival jitter and justified it as preventing the two queues from running in exact lockstep. Measured against the model:

| Configuration | maintenance-first | meals-first | trade-off present? |
|---|---|---|---|
| jitter ±5 / ±2 | meal backlog 128–146 | maintenance backlog 38–44 | yes |
| **jitter 0** | **meal backlog 119** | **maintenance backlog 40** | **yes, identical** |

The trade-off is produced by the **throughput-versus-demand mismatch**, not by arrival timing. Jitter changed nothing except the exact figures. It is therefore **removed**:

- It was the only randomness during a tick, so removing it deletes the only place invariant 11 could be violated by a new system.
- With jitter 0 the balance is **provable rather than luck-dependent** — §4A.3 measures identical outcomes on all 7 seeds, so the gate cannot be passing "because jitter happened to change the outcome".
- `rngCursor` is then exactly **7** after `createRun` and never grows, which makes the RNG accounting trivial to audit.

**Honest consequence, stated plainly:** with no randomness in the simulation, **the seed no longer affects outcomes — only roster names.** That is not a determinism failure and not a regression of D10; the stream is intact and still governs every draw. It simply means Stage 2's behaviour is workload-determined, which is what makes the balance provable. Seed-driven variety in *outcomes* belongs to Stage 3 (needs thresholds) or Stage 5 (anomalies, D3), where a document actually assigns it. Do not re-add jitter at Stage 2 to make runs look different.

**Deferred work is never discarded.** `pending` carries across the day boundary untouched. That single rule is the entire persistence mechanism, and it is why Day 4 differs from Day 1.

### 5.3 Player experience, stated as an observable

> It is Day 4. The kitchen card reads **119 queued** and the workshop card reads **0**. You had set *Maintenance first* two days ago because the kitchen kept backing up, and every meal-prep row on the roster explains why it was chosen. You switch to *Meals first*. By Day 5 the kitchen reads **0** and the workshop reads **40** — the backlog has moved, not vanished, and each roster row still tells you *why* that person is where they are. That is the whole stage: you moved a queue you could see, and you could read why it moved.

---

## 6. Data model and simulation flow

### 6.1 State additions — three arrays, exactly the documented Stage 2 rows

```ts
// src/sim/state.ts — proposed additions
export interface SimState {
  // ...the existing seven fields unchanged...
  personnel: Person[];     // Stage 2 — ARCHITECTURE.md §3
  jobs: Job[];             // Stage 2
  facilities: Facility[];  // Stage 2
}
```

Plain JSON only — no class, function, `Map`, `Set` or `Date` (`ARCHITECTURE.md` §3, invariant 15). **`draftOf` must copy all three new arrays**, or Stage 1's immutability guarantee breaks silently. The existing test *"tick does not mutate the state it was given"* will catch that.

### 6.2 Proposed new modules — none of these exist today `[P]`

```ts
// src/sim/personnel.ts
export type Role = 'generalist' | 'maintenance' | 'supply';
export interface Person {
  id: string;                  // 'p1'…'p7', stable forever (B1 §3)
  name: string;                // drawn from the seeded RNG at creation (B1 §3)
  role: Role;                  // the eligibility key at Stage 2 (Conflict G)
  currentTask: ActiveTask | null;
  history: TaskRecord[];       // capped
}
export interface ActiveTask {
  jobId: JobId;
  startedTick: number;
  progressTicks: number;       // Personnel owns this (§4.3)
  reason: string;              // the literal rule citation — legibility lives here
}
export interface TaskRecord { tick: number; jobId: JobId; outcome: 'completed' }

// src/sim/jobs.ts
export type JobId = 'maintenance' | 'meals';
export interface Job {
  id: JobId;
  label: string;
  facilityId: string;
  durationTicks: number;       // 90 maintenance, 30 meals (fixture)
  eligibleRoles: Role[];       // maintenance: [maintenance, generalist]
                                 // meals: [supply, generalist]
arrivalIntervalTicks: number;  // 24 maintenance, 8 meals — see §4A.3
  nextArrivalTick: number;
  pending: number;               // UNCLAIMED work waiting. Decremented on CLAIM.
}

// src/sim/facilities.ts
export interface Facility {
  id: string;                  // 'workshop' | 'kitchen'
  label: string;
  capacity: number;            // 4 (fixture — Decision A1)
  servesJobId: JobId;
}

// src/sim/priority.ts
export type Priority = 'balanced' | 'maintenance-first' | 'meals-first';
```

**Occupancy is derived, never stored:** `persons.filter(p => p.currentTask?.jobId === job.id).length`. A stored occupancy count would create exactly the duplication `SYSTEM_DEPENDENCIES.md` exists to prevent.

### 6.3 Simulation flow — proposed tick order

`SYSTEM_DEPENDENCIES.md` §4 phases. Stage 3+ phases are **absent rather than stubbed**, per `STAGE1_PLAN_v4.md` §3.

```
1. advance clock; emit day rollover        (exists — phase 0)
2. drain pendingCommands                   (exists — phase 0, extended by §4.9)
3. resolve intent → priority order         (exists as a no-op — phase 0, implemented)
   ── phases 2/3/4 (Delivery, Resources, Needs) do not exist: skipped, not stubbed
   ── phase 1 (Facilities): static at Stage 2, absent by Decision C
5. job arrivals                            (new — phase 5)
6. job selection                           (new — phase 5)
7. job progress and completion             (new — phase 5)
```

Invariant 19 holds: phases 5–7 read `intent` (0), `facilities` (1) and `personnel` — never a later phase.

### 6.4 Selection — faithful to B3 §3, deterministic

For each person ascending `id`, when `currentTask === null`:

```
  if person.role implies a duty and that job has pending > 0 and a free slot
        → claim it, reason = "assigned duty"          (ladder rule 3)
  else for jobId in priorityOrder:                      (ladder rule 4)
        if eligible(role) and pending > 0 and hasFreeCapacity(facilityId)
             → claim it, reason = "<setting> puts <job> first"
             break
  else → Standby, currentTask stays null               (ladder rule 5)

  on every claim: jobs[jobId].pending -= 1     // AT CLAIM — see §6.5
```

**The decrement happens at claim, inside the loop, immediately before `break`.** It is placed there deliberately: `pending` is the mutual-exclusion token that stops two workers taking the same order, so it must be spent at the moment of taking, not at the moment of finishing. Putting it in the progress step instead permits phantom work (§4A.2).

No randomness anywhere in selection (B3 §3: *"lowest ID first, never randomly"*).

`resolvePriority(intent)` `[P]`, stored as **one** entry in the existing `intent[]`:

| Value | Order |
|---|---|
| `maintenance-first` | `['maintenance', 'meals']` |
| `meals-first` | `['meals', 'maintenance']` |
| `balanced` | descending `pending`, ties → `['maintenance', 'meals']` |

`balanced` attacks the deeper backlog — a genuine neutral baseline, which matters because `ROADMAP.md` calls Balanced *"the neutral baseline both other settings must beat"*. A fixed tie-break would not be neutral. **`intent[]` is already Stage 1 state, so no new field is needed for intent** — it is simply the first thing written to it.

### 6.5 Progress, completion, and the reason string

```
progress(persons ascending id):
  for person where currentTask !== null:
    task.progressTicks += 1
    if task.progressTicks >= job.durationTicks:
      emit(task_completed, tier: job-completion tier, subjects: [personId, jobId])
      personnel.recordOutcome(person, 'completed')   // releases currentTask
      # pending is NOT decremented here — see §6.4. It was decremented at claim.
```

**`pending` is decremented on CLAIM, not on completion `[P]` — corrected.** An earlier draft decremented on completion while §6.4 let any number of eligible workers claim whenever `pending > 0` and a slot was free. That permits N workers to claim one order; all N complete and all N decrement, driving `pending` negative and performing phantom work (§4A.2). Under the corrected rule `pending` means **unclaimed work waiting**, is decremented the instant a worker takes it, and can never go below zero by construction. Abandonment — when it gains a trigger — returns the unit.

**Hysteresis (D6), honestly scoped `[P]`.** A person selects only when `currentTask === null`, so switching is impossible without an explicit abandonment. Invariants 3 and 9 are then true *structurally* — they cannot be violated by construction. **Abandonment has no trigger at Stage 2**: facilities do not degrade (Stage 7), people cannot be injured (Stage 6), and no schedule removes anyone from duty (B5, Stage 3). The abandon branch is added at the stage where its first cause exists, together with the forfeit rule B3 §3 requires. Adding an untriggerable branch would be untestable code — the exact scaffolding this project refuses.

**The reason string is the feature, not a nicety.** B3 §9: *"the literal reason it was chosen — 'no food available, hungry' beats 'selected job #3.'"* Gate evidence item 1 is *"you can explain what happened without reading the source code."* At Stage 2 the vocabulary is small enough to be literal:

- `"on duty: maintenance"` — ladder rule 3 fired
- `"Meals first puts meals ahead"` — ladder rule 4 fired
- `"Balanced: meals queue is deeper"` — balanced, and why
- `"maintenance is at capacity 4/4"` — fell through, capacity-bound (this is the **"why not done"** the brief asks for)
- `"nothing claimable — standing by"` — ladder rule 5

### 6.6 Event catalogue `[P]`

Reusing the existing `emit()` in `src/sim/events.ts`, its `subjects` field, and its tiers. No new event machinery.

| Type | Tier | Subjects | Data | Emitted when |
|---|---|---|---|---|
| `work_order_queued` | routine | `[jobId]` | `{pending}` | **only on a `pending` 0 → 1 transition** |
| `task_started` | routine | `[personId, jobId, facilityId]` | `{reason}` | every claim |
| `task_completed` | notable | `[personId, jobId]` | `{}` | every completion |
| `intent_changed` | routine | — | `{from, to}` | every accepted priority change |
| `command_rejected` | routine | — | `{command}` | every rejected command *(existing)* |

**`work_order_queued` is transition-gated, and this is load-bearing.** At the adopted rates the base queues **240 orders per day — 1,200 over the gate** (§4A.3). Emitting one event per arrival would add 1,200 `work_order_queued` events across the run, taking the log from ~2,800 to ~3,500 — and `STAGE1_EVIDENCE_AUDIT.md` already records **behaviour with a large log as unverified**. Gating the event to 0 → 1 transitions records *"work arrived again after the base had caught up"*, which is the fact the player needs, at a fraction of the volume. The authoritative backlog figure is `pending` itself, shown on the facility card — not a count of events.

`causeEventIds` links a completion to its `task_started`, satisfying invariant 6. `causalReferencesAreValid()` in `events.ts` already permits same-tick causes, which is what a completion needs.

---

## 7. Implementation steps and dependency order

Each step leaves `npm run verify` green. One commit per step. Plain descriptive messages, per `_reference/WORKING_AGREEMENT.md`.

**Step 0 — Perform the outstanding Stage 1 phone manual gate. No code.**
*Why first:* it is the only open Stage 1 prerequisite — see §12.1. Run `npm run dev`, open on the phone, confirm the seven values update, 1× advances ≈8 ticks/s, all four speeds change rate, Pause stops the clock, a rollover appears, and the panel is usable at phone width. **Record the result in `AGENTS.md`.**
*Acceptance:* `AGENTS.md` no longer lists the Stage 1 gate as pending.

**Step 1 — Open the architecture guardrail deliberately.**
`src/sim/architecture.test.ts`: remove `personnel`, `jobs`, `facilities` from `forbiddenFields`. **Change nothing else in the file.** Add a comment naming what remains forbidden and why.
*Tests:* none added. Suite must stay **95/95**.
*Risk:* a beginner deletes the test instead. Step 1 is a commit on its own precisely so that is visible in review.

**Step 2 — Record the fixture and workload decisions in the documents.**
Update `docs/ROADMAP.md` §Stage 2 reference scenario: facility capacity 2→4 (Decision A1) **and** the arrival intervals (24 / 8 ticks, §4A.3), with both reasonings inline. Then `bash tools/build-master.sh` to regenerate `PROJECT_MASTER.md`.
*Acceptance:* the capacity and intervals in the docs match the constants in the code, and the roadmap no longer carries rates that leave the control inert.
*No source changes in this step.*

**Step 3 — Types and state shape.**
Add `Person`, `Job`, `Facility` to state; extend `draftOf` to copy all three arrays; build the 7-person fixture in `createRun` with names drawn from `rand()` in fixed person order (B1 §3).
*Tests:* the 7 people exist; two runs of the same seed give identical names; two seeds give different names; `rngCursor === 7` after `createRun`; state survives a JSON round-trip (invariant 15); **`tick does not mutate the state it was given` must still pass** — it is the guard on `draftOf`.
*Risk:* names generated outside the seeded stream break replay. Caught by the two-seed test.

**Step 4 — Facilities.**
`facilities.ts` with the two facilities and a read-only `hasFreeCapacity` predicate.
*Tests:* occupancy never exceeds capacity, asserted over a long run.

**Step 5 — Arrivals and deferred work.**
`jobs.ts`: definition table, `arrive()` with **no RNG draw**, `pending` decremented at claim (§6.4), never cleared at rollover.
*Tests:* `pending` is identical after N ticks regardless of how N is split across `tick()` calls; **`pending` is never negative at any tick, across 7,200 ticks and all three settings** (this is the regression test for the phantom-work defect, §4A.2); N workers can never claim one order; arrival consumes no RNG, so `rngCursor` stays at 7 for an entire run.

**Step 6 — Selection and reason strings.**
The §6.4 algorithm, calling only `personnel.ts` writers.
*Tests:* invariant 3 over 3,000 ticks — no person holds two active jobs; every `task_started` has a non-empty `reason`; two identical runs produce identical logs; **every roster row's reason is a string a player could read aloud** (asserted against a fixed vocabulary, so a rewrite of the wording breaks the test rather than silently degrading the gate).

**Step 7 — Progress and completion.**
*Tests:* a task advances exactly 1 progress tick per tick of work; completion decrements `pending` exactly once; invariant 4 — no job progresses without a valid worker; the existing *"a command is applied exactly once"* test still passes.

**Step 8 — Intent resolution and the one command.**
`priority.ts`; change `Command` from `never` to a union with `set_priority`; real handler in `applyCommands`; invalid values still emit `command_rejected`.
*Tests:* intent set headlessly produces behaviour identical to intent set through the command path (C1 §10 — the test that proves intent is not a UI concept); `balanced` picks the deeper queue.

**Step 9 — Controller command path.**
`Controller` currently has **no way to enqueue a command** — verified gap. Add one that appends to `state.pendingCommands` and returns the new state.
*Tests:* a priority change issued at tick N takes effect at tick N+1, never mid-tick (A4 §10); the two Stage 1 timing regression tests (audit D1) still pass — **do not remove them**.

**Step 10 — Headless runner extension.**
`tools/headless.ts` gains the roster and per-job pending counts in its summary and `--json` output. This is the architecture smoke test (D9) and it must keep working forever.
*Acceptance:* `npm run headless -- --ticks 1440 --seed 42 --json` shows a 7-person roster; two invocations are byte-identical.

**Step 11 — Determinism and invariant suite.**
The full §8.1 table, plus the §8.3 fixture gate.
*Risk:* a red suite is a stop, not something to route around.

**Step 12 — Roster UI.**
Extend `Snapshot` with a derived roster (id, name, current task, reason, progress) and per-facility occupancy/pending. Add the roster panel and the three-way priority control. **Derive for display, never write state; issue commands, never mutate.**
*Tests:* **none in CI** — `src/ui/App.tsx` is imported by no test. This is a manual/browser gate, honestly labelled.

**Step 13 — Full verification and docs.**
`npm run verify`. Update `AGENTS.md` (including the 88→95 drift), `CHANGELOG.md`, and `ROADMAP.md` stage status.

**Dependency order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13. Steps 4 and 5 may swap. Step 11 depends on all behaviour steps.

---

## 8. Testing and acceptance gates

### 8.1 Automated suite

| Group | Test | Invariant |
|---|---|---|
| Determinism | Same seed + same `set_priority` tick → `statesEqual` over 7,200 ticks | 14 |
| Determinism | Two seeds → **different roster names, identical allocations and identical completions** — the seed affects names only at Stage 2 (§5.2). If job allocations differ, something is consuming RNG and must be explained | 11 |
| Replay | 3,600-tick state → JSON round-trip → continued ticks equal the uninterrupted run | 15 |
| Replay | `npm run headless -- --ticks 5000 --seed 42` twice → byte-identical | 14 |
| Determinism | Selection allocates **no** RNG; arrivals allocate **no** RNG. `rngCursor` is 7 after `createRun` and stays 7 for a whole run | 11 |
| Selection | No person holds two active jobs over 3,000 ticks | 3 |
| Selection | Every `task_started` carries a non-empty player-readable `reason` | gate item 1 |
| Selection | Allocation is stable across runs — lowest ID first, never random | 14 |
| Accounting | **`pending` is never negative at any tick**, across 7,200 ticks × 3 settings — regression test for the phantom-work defect (§4A.2) | 1 |
| Accounting | **N workers never claim one order**: total claims ≤ total arrivals, per job, per run | 1 |
| Accounting | `pending + inProgress == arrivals − completions`, checked every tick | 1 |
| Hysteresis | No change of task without an explicit event; `currentTask` is set once and cleared once | 9 |
| Capacity | Facility occupancy never exceeds `capacity`, over 7,200 ticks | — |
| Priority | `set_priority` changes end-of-day `pending` for at least one job | gate item 3 |
| Priority | Headless intent ≡ command-path intent | C1 §10 |
| Commands | A command applies exactly once, never twice; invalid values rejected loudly | A4 |
| Events | `causalReferencesAreValid` over a multi-day log; ids sequential and unique | 6 |
| Events | `work_order_queued` fires only on 0 → 1 transitions; total events over 7,200 ticks stays **under 3,000** (§8.3 ASSERT 7) | 6 |
| Architecture | `src/sim` free of React, DOM, `node:`, `Date.now`, `Math.random` | D9 |
| Architecture | Only `rng.ts` assigns `rngCursor` | 11 |
| Architecture | Only `personnel.ts` assigns person fields | 18 |
| Ownership | No module writes a field it does not own | 18 |

**Tests that must be updated, not deleted `[V]`:**
- `tick.test.ts` *"a fresh run is Day 1, Night, with an empty log"* asserts `rngCursor === 0`. It becomes **7** once names are drawn. Rewrite the assertion and the comment to say *why*.
- `tick.test.ts` *"only tick, log and nextEventId change during an ordinary tick"* — extend for the new arrays.
- `tick.test.ts` *"the rng cursor stays at zero no matter how long the run"* — this test's premise is gone at Stage 2. **Replace** it with the cursor discipline tests above, and record the replacement in `CHANGELOG.md`.
- `tick.test.ts` *"a run of zero ticks changes nothing"* — still valid; keep it.

### 8.2 Manual phone gate — Day 4–5

Cannot be automated. `ROADMAP.md` §Gate evidence, 3 of 4 required.

**Before watching, write one prediction in a sentence.** A prediction made after the fact is not evidence — this discipline is the point of Q25.

1. **Explain without reading source.** Look at a person mid-job. Can you say why they chose it from the roster row alone? If you must open `jobs.ts`, rewrite the reason string, not the code.
2. **Noticed something before the report told you.** Did the workshop going quiet while the meal queue climbed catch your eye unprompted?
3. **A decision visibly changed what happened.** Flip priority at the start of a day. By Day 5 is the difference visible **without comparing numbers side by side**? If you need a spreadsheet, the UI has failed even if the simulation is right.
4. **Continued past novelty.** You watched Days 4 and 5. Were you still looking?

**Pass rule:** 3 of 4. **Record the answers in `CHANGELOG.md`, including the noes** — a recorded no tells Stage 3 what to fix.
**If it fails:** fix or simplify *this* stage — fewer people, shorter jobs, a plainer roster — and re-run. Do not add a subsystem, and do not advance.

### 8.3 The fixture gate — causal, per-seed, non-dominance `[P]`

The direct implementation of `ROADMAP.md`'s two conditions, and the **automated prerequisite** for the manual gate.

**Why this gate was rewritten — stated accurately, because the first draft of this explanation was itself wrong.** An earlier draft of this section claimed its weak assertion 1 (*"every setting produces at least one differing measure"*) *"would have passed on the base that was 93.5% idle."* Measured, that is **not what happened**: at the inert rates all three settings produced byte-identical output (§4A.1), so the old assertion would have *failed* — it would have caught the inertness, but only by accident, through a proxy measure (mean workers) rather than through the thing that actually matters.

The real weaknesses were these, and the gate below fixes each:

| Old weakness | Why it was weak | Fix |
|---|---|---|
| Assertion 1 proxied via *"at least one differing measure"* | A measure can differ for reasons unrelated to priority — arrival noise, or a coincidence. It could not say *why* | ASSERT 6 asserts the **reason histogram** shifts, which only happens if the scan order changed behaviour |
| Assertions measured **capacity-side** quantities (mean workers) | Workers are plentiful; mean workers can move while throughput does not | ASSERT 1/2 assert on **end-of-run backlog**, which is what the player sees |
| No absolute thresholds | A uniformly degenerate build can pass by being uniformly different | ASSERT 1/3 use fixed numeric floors derived from §4A.3 |

**Design rules for this gate:**

- **Assert on causally attributable quantities, not on "the numbers differ".** A difference caused by jitter is noise. Every assertion below is about a backlog that can only arise from the priority scan order.
- **Per seed, no averaging.** Averages let one good seed mask five inert ones.
- **No randomness is involved at all** (§5.2), so the gate is exact and reproducible; `seeds` vary roster names only. Running it across seeds is therefore a *robustness* check on the harness, and the numbers below are expected to be identical across them.
- **Absolute thresholds, not relative ones**, so a uniformly-degenerate build cannot pass by being uniformly different.

```
Seeds:      20260101, 1, 4242, 777, 31337, 99, 123456   (7, non-adjacent)
Horizon:    5 in-game days = 7,200 ticks
Settings:   balanced, maintenance-first, meals-first — each applied at tick 1
            via a set_priority command, so the command path is exercised too
Per run record:
    completed.maintenance, completed.meals
    pending.maintenance, pending.meals              (end of run)
    maintenanceWorkersByReason, mealsWorkersByReason  (histogram of reason strings)
    claimsIssued, ordersArrived, ordersCompleted

ASSERT 1 — the control is live, on backlog:
  pending.meals under maintenance-first  >= 40
  pending.maintenance under meals-first  >= 15
  (measured: 119 and 40)   → if either fails, priority is not reallocating: STOP

ASSERT 2 — the effect is directional, i.e. caused by priority:
  pending.maintenance under maintenance-first  <  pending.maintenance under meals-first
  pending.meals       under meals-first        <  pending.meals       under maintenance-first
  (measured: 0 < 40 and 0 < 119)

ASSERT 3 — neither extreme starves the other job to zero:
  completed.meals       under maintenance-first  >= 200   (measured 777)
  completed.maintenance under meals-first        >= 100   (measured 257)

ASSERT 4 — non-dominance (ROADMAP condition 2), stated exactly:
  maintenance-first must be WORSE on meals than meals-first is, AND
  meals-first must be WORSE on maintenance than maintenance-first is.
  Neither setting may be >= the other on both axes.
  (measured: meal backlog 119 vs 0; maintenance backlog 0 vs 40)

ASSERT 5 — balanced sits between the extremes on both axes:
  pending.maintenance:  meals-first >= balanced >= maintenance-first
  pending.meals:        maintenance-first >= balanced >= meals-first

ASSERT 6 — the reason strings are causally attributable, not incidental:
  Partition every claim by the ladder rule that fired. Assert:
    (a) duty-rule claim counts are equal within 5% across all three settings
        (measured 639 / 639 / 638) — specialists are priority-independent, per B3 §3
    (b) EVERY non-duty claim carries a reason string naming the active setting
        (measured: 442 claims under maintenance-first, 501 under balanced,
         522 under meals-first — 100% carry their own setting's label)
    (c) the non-duty counts differ across settings
  → THIS is what distinguishes "priority changed behaviour" from
    "somebody happened to finish a job at a different moment".
  If the reason histogram does not move, ASSERT 1 passing would be a coincidence.

ASSERT 7 — economy is honest:
  pending never negative at any tick; claims <= arrivals;
  total events over 7,200 ticks < 3,000.
  Measured [M]: task_started + task_completed + transition-gated
  work_order_queued = 2,293 (balanced) / 2,461 (maintenance-first) /
  2,783 (meals-first). Ungated it would be 3,348-3,506, since the base
  queues 1,200 orders over 5 days (240/day).
  Build Mode must MEASURE the actual figure and record it in CHANGELOG.md —
  STAGE1_EVIDENCE_AUDIT.md already lists large-log behaviour as unverified.

ASSERT 8 — the structural precondition holds (replaces the old jitter-independence
            assertion; see §11A B2 for why that one was removed):
  Assert the arithmetic from §4A.3 over the actual constants in code:
    (a) demand.maintenance < maintenance service ceiling
        60/day  <  4 slots x (1440/90) = 64      -> serviceable when prioritised
    (b) demand.meals       < meals service ceiling
        180/day <  4 slots x (1440/30) = 192     -> serviceable when prioritised
    (c) total demand worker-ticks > total available
        (60x90 + 180x30) = 10,800  >  7 x 1440 = 10,080   -> 107%, overcommitted
  (a)+(b) mean neither job can be starved permanently by its own ceiling;
  (c) is what makes priority an allocation choice rather than a foregone one.
  If any of the three fails, the trade-off is gone and ASSERT 1-5 will drift.
  This asserts on constants only — it adds no jitter, no test-only behaviour,
  and consumes no RNG.
```

**Measured reference values (`[M]`, §4A.3) — Build Mode's implementation must reproduce these:**

| Setting | maint done | meals done | maint backlog | meal backlog |
|---|---|---|---|---|
| balanced | 267 | 866 | 30 | 30 |
| maintenance-first | 297 | 777 | 0 | 119 |
| meals-first | 257 | 896 | 40 | 0 |

If the real implementation lands far from these, **the plan's balance is wrong and must be re-derived — do not simply lower the thresholds until the suite goes green.** Loosening a threshold to make a build pass is the failure mode this project already documents (*"a gate written only as a feeling is a gate that can be lied to"*).

**What this test still cannot do:** it proves the control is not inert and that the effect is causally attributable. It cannot prove the difference is *interesting*. That is the manual gate's job (§8.2), and conflating the two is precisely how a gate gets faked.

---

## 9. Deferred scope and preserved future milestones

### 9.1 What waits, and why

| Deferred | Stage | Reason |
|---|---|---|
| Needs, hunger, fatigue, hydration | 3 | D13; phase 4 |
| Readiness as a derived summary | 3 | invariant 12 — nothing may read it but the UI |
| Schedules and rest | 3 | B5 §11 |
| Save/load UI | 3 | serialization constraint already enforced |
| Named-option decisions, interrupts | 4 | D2, D16 |
| Full intent set (priorities, reserves, policies) | 4 | C1 §11 — one priority at Stage 2 |
| End-of-day report, event timeline, copy-run-as-JSON | 4 | `ROADMAP.md` §Stage 4 |
| Relationships | 4 | Chain E |
| Anomalies | 5 | D3 |
| Preparation and commitments | 5 | `ROADMAP.md` §Stage 5 |
| **Items, condition, wear, durability, loadouts, weapons** | **7** | **D21 — guaranteed** |
| Storage, resources, repair queue | 7 | invariants 1, 2, 13, 17 |
| Facility condition | 7 | D2 §11 |
| Roles/specialty **rates** and reliability | 6 | B2 §11 |
| Production | 8 | `ROADMAP.md` §Stage 8 |
| Vehicles | 9 | parked |
| External operations | 10 | parked |

### 9.2 D21 is preserved and must not be weakened

`LOCKED_DECISIONS.md` D21, quoted in part: *"a minimum equipment and loadout experience is a guaranteed milestone. Stage 7 happens. Its scope remains negotiable… the stage does not."* And: *"scope is negotiable, identity is not."*

**This plan does not touch, move, weaken, or make conditional Stage 7.** No item, weapon, condition, durability, slot, container, or loadout concept is implemented early, and no Stage 2 decision creates a dependency that would delay it. The only Stage 2 decision with downstream shape is Decision A1 (facility capacity 4), and capacity is **not** the quantity `D2 §11` ties condition to.

The cheapest insurance against accidental drift is structural: `jobs[].pending` (Jobs-owned) is exactly where a Stage 7 **repair queue** attaches without re-plumbing, and `ROADMAP.md` §Stage 7 already states Stage 7 ships its own minimal repair queue precisely so a guaranteed stage cannot depend on an optional one. That relationship is preserved.

---

## 10. Acceptance criteria per feature

| Feature | Acceptance criterion |
|---|---|
| Personnel | 7 people exist from `createRun`; names stable per seed, different across seeds; `history` capped |
| Facilities | `capacity` is 4 each; occupancy derived, never stored; never exceeded over 7,200 ticks |
| Arrivals | Maintenance queues an order every 24 ticks, meals every 8 ticks; `pending` never decreases except on claim; survives the day boundary untouched; no RNG consumed |
| Selection | Every free person ends the tick either on a job with a `reason`, or in Standby |
| Progress | Exactly +1 progress per tick of work; completion fires once and decrements nothing (`pending` was spent at claim, §6.5) |
| Hysteresis | `currentTask` is assigned once and cleared once; no mid-task switch is possible |
| Priority | All three settings reachable; each produces the §4A.3 backlog divergence (meal backlog ≥ 119 under maintenance-first, maintenance backlog ≥ 40 under meals-first); invalid values rejected loudly |
| Commands | `set_priority` applies exactly once, at tick N+1; the queue is emptied |
| Events | Every event has a unique sequential id; `causalReferencesAreValid` passes over 7,200 ticks |
| Determinism | Identical seed + identical commands → identical state, over 7,200 ticks |
| Headless | `tools/headless.ts` still runs with no browser; two invocations byte-identical |
| UI | Roster shows name, task, **reason**, progress; occupancy and pending visible; priority control issues a command |
| Architecture | `src/sim` imports no React, DOM, `node:`, `Date.now`, `performance.now`, or `Math.random` |

---

## 11. Risks and compatibility concerns

| # | Risk | Caught by |
|---|---|---|
| R1 | Weakening or deleting `architecture.test.ts` to make Step 1 "pass" | Step 1 is a standalone commit, reviewed in isolation |
| R2 | `draftOf` not copying the new arrays, silently mutating caller state | The existing *"tick does not mutate the state it was given"* test — it fails loudly |
| R3 | Random tie-breaking sneaking into selection via `rand()` | The existing `Math.random` architecture test, plus a new assertion that selection draws nothing |
| R4 | `statesEqual` via `JSON.stringify` dropping `undefined` fields and calling unequal states equal | Prefer explicit field comparison in new determinism tests; document the trap |
| R5 | Regressing the Stage 1 timing defect (audit **D1**) while touching the controller | The two existing regression tests — do not remove them |
| R6 | The §8.3 fixture gate failing after tuning, and pressure to "just pick numbers that pass" | The gate is the objective function, with measured reference values; every tuning change goes in `CHANGELOG.md` |
| **R11** | **The base is 99.7% saturated and backlog grows without bound** (§4A.3). Nothing breaks at Stage 2, but this is permanent overcommitment | Deliberate: it is the pressure Stage 3's consequence ladder makes meaningful. Do **not** add a Stage 2 relief valve (penalty, decay, deadline) — that would be a Stage 3 mechanic smuggled in to hide a balance problem |
| **R12** | **A gate that passes for the wrong reason.** The previous form asserted on proxy quantities (mean workers, "some measure differs") that can move without priority being the cause | §8.3 now asserts on end-of-run backlog with absolute floors (ASSERT 1–3), and on the **reason histogram** (ASSERT 6), which only moves if the scan order changed behaviour |
| **R13** | **Phantom work** if `pending` is decremented on completion (§4A.2) | ASSERT 7 plus the `pending >= 0` and `claims <= arrivals` tests in §8.1 |
| **R14** **Log volume** at ~240 orders/day against an already-unverified large-log behaviour | `work_order_queued` gated to 0→1 transitions (§6.6); ASSERT 7 bounds total events |
| R15 | Seed no longer affects outcomes, only names (§5.2), which may look like a D10 regression | Stated explicitly in §5.2. Not a defect; outcome variety belongs to Stage 3/5 where a document assigns it |
| R7 | Fixture capacity change being read as a silent roadmap edit | Decision A1 is written into `ROADMAP.md` with its reasoning in Step 2 |
| R8 | Reason strings drifting into developer shorthand (`"sel job #3"`) | The fixed-vocabulary assertion in Step 6 |
| R9 | Scope creep back toward needs/facility condition | §9.1 is a checklist; any addition must first be argued in `ROADMAP.md` |
| R10 | Building for five days of interest and finding none | That is what the gate is for. `ROADMAP.md`: the fix is to cut scope, not add systems |

---

## 11A. Self-audit log `[V]`

Recorded so a reviewer does not have to trust that the current document is internally consistent. All findings below were found by re-reading the plan against itself and against the authoritative sources, **after** the revisions were written and reported as complete.

### rev 3 — audit of rev 2 (11 defects)

| # | Where | Defect | Severity | Status |
|---|---|---|---|---|
| A1 | §4A.3, §8.3, §0, §14 | **Reference table wrong on two of three rows.** `balanced` (228/684) and `meals-first` (240/864) had been transcribed from a 5-seed *averaged, jittered* run, then cited as no-jitter figures. Actual: 267/866 and 257/896. A reviewer would have flagged the mismatch against ASSERT 3 | **High** — reference values Build Mode must reproduce | Fixed, re-measured |
| A2 | §4.3 | Said `pending` is decremented **"on completion"**, contradicting the corrected §6.4/§6.5. Would have reintroduced the phantom-work defect | **High** | Fixed, error noted in place |
| A3 | — | **Work arrivals were an undocumented invention, declared nowhere.** No document specifies a demand source; without one the control is inert, so the plan depends on it — silently | **High** — largest undocumented assumption in the document | Fixed: new §4.10 Decision J |
| A4 | §4.6 table | Listed seeded arrival jitter as **"Adopt"** after §5.2 had measured it and removed it | High — direct self-contradiction | Fixed |
| A5 | §3 table | Same stale jitter verdict: *"Adopt Step 5"* | Medium | Fixed |
| A6 | §8.1 | Asserted *"Two seeds → different rosters and **different job allocations**"*, contradicting §5.2's seed-independence. Would have failed on a correct implementation | **High** — false acceptance criterion | Fixed |
| A7 | §8.3, R12 | Claimed the old weak gate *"would have passed on the 93.5%-idle base"*. **Measured, that is false** — the old gate would have *failed*, catching inertness by accident. The stated justification for rewriting it was wrong | Medium — a false claim about the review's own reasoning | Fixed, corrected honestly |
| A8 | §8.3 ASSERT 6 | Said *"a majority of generalist claims"*. Measured, duty claims are 638–639 and intent claims 442–522, so intent claims are **not** a majority of all claims. The assertion as written was unmeetable | Medium | Rewritten to a 3-part test against measured values |
| A9 | §8.1, §8.3 ASSERT 7 | Referred to *"a stated bound"* on event count that **was never stated anywhere** | Medium — dangling requirement | Fixed |
| A10 | §3, §7 Step 11 | Stale cross-references: *"§4.2"*, *"§8.4"* ×2, *"§6.3"* | Low | Fixed |
| A11 | §13.1 | Pre-flight listed only the capacity decision; the arrival-interval decision — the more consequential one — was absent | Medium | Fixed |

### rev 4 — targeted consistency pass (4 further defects)

| # | Where | Defect | Severity | Status |
|---|---|---|---|---|
| B1 | §13.3 | **Definition of done still cited the superseded figures** `228/684 … 240/864`, four sections after §4A.3 was corrected. Build Mode's final checklist would have failed against a correct implementation | **High** | Fixed |
| B2 | §8.3 ASSERT 8 | **Required forcing `arrivalJitterTicks > 0`** while §5.2 and §6.2 had *removed* jitter. Satisfying it would require test-only behaviour that misrepresents the real simulation, or reintroducing the RNG draw the plan deliberately deleted. **Removed**, and replaced with a stronger equivalent that tests the same property honestly | **High** — direct contradiction of a settled decision | Fixed; see below |
| B3 | §4A.3, ASSERT 3 | Two residual **`240`s** — a completed-maintenance figure that should have been **257** after A1 was fixed | Medium | Fixed |
| B4 | §6.6, R11, §4A.3 | **Two stale secondary figures.** Utilisation was written as *"~97%"*; re-measured **99.7%**. Event volume was written as *"~1,200 per day, ~6,000 over the gate"*; measured **1,200 arrivals total over the gate**, giving ~3,500 events ungated and ~2,800 gated | Medium | Fixed, re-measured |

**Why ASSERT 8 was replaced rather than repaired.** Its intent — *the trade-off is structural, not an artefact of arrival noise* — is worth keeping. But every way of testing it required re-enabling jitter, which would mean either shipping a knob the design deliberately has no use for, or letting a test mutate simulation behaviour in a way the real game never does. The replacement asserts the **arithmetic that makes the trade-off structural** — each job's demand sits below its own facility's service ceiling, while the pair together exceeds the workforce (§4A.3). That is the actual precondition, it is checked against the real constants in code, and it consumes no RNG and invents no behaviour.

### Claims discipline

Every figure in this plan carries one of three labels, and they are not interchangeable:

- **`[V]`** — verified by command against the **real repository** (`git`, `npm test`, `npm run verify`, `npm run headless`). See §1.
- **`[M]`** — measured by a **standalone model** of these rules, run outside the repository. §4A and the reference tables.
- **`[P]`** — newly recommended here; not yet built.

**No Stage 2 behaviour in this document has been verified against the implementation, because no Stage 2 implementation exists.** The reference figures are what Build Mode must *reproduce*; if it does not, the balance is wrong and must be re-derived rather than the thresholds loosened. `STAGE1_EVIDENCE_AUDIT.md` records the precedent: *"a green suite and a green CI do not establish that Stage 1 is correct… this audit found one real defect that 89 passing tests did not catch."*

**Not defects, deliberately unchanged:** facility capacity 2→4 (§4.1, authorised and reasoned), the withdrawn 33% claim (kept visible with a strikethrough so the error is auditable), the 107% structural deficit (R11, deliberate and flagged), the seven-person fixture, arrival intervals 24/8, pending-on-claim accounting, the no-jitter design, and every entry in §9.1.

---

## 12. Blockers, gates, and unresolved decisions

### 12.1 Mandatory gate that must precede implementation

**The Stage 1 phone manual gate has never been performed.** `docs/reviews/STAGE1_EVIDENCE_AUDIT.md` records it in §9 and again in its "still outstanding" list, and concludes the honest summary is *"verified in Node, not verified."* `AGENTS.md` names it as the next action.

**Is it required to block Stage 2?** The authoritative documents do not state an explicit dependency, and I will not invent one. But the reasoning is unavoidable: Stage 2's gate is judged *by watching the app on the phone*, and the one thing Stage 1 was verified for is that the app works at all. Stage 2 would layer a roster UI and a priority control onto an interface that has never been opened in a browser.

**Recommendation, stated as a recommendation:** perform it as Step 0, before any Stage 2 code. It takes minutes. If it is skipped, every Stage 2 gate result inherits an unverified foundation.

**Also still outstanding, and honestly so:** `NOTIFY_INTERVAL_MS` render cadence at 16×, and behaviour with a large log — both recorded as unobservable without a browser. Neither blocks Stage 2.

### 12.2 Decisions needed before Step 3

| # | Decision | Recommendation |
|---|---|---|
| **A1** | Adopt the 4/4 facility capacity (§4.1) over the documented 2/2? | **Adopt.** The documented fixture makes the control provably inert. `ROADMAP.md` authorises adjusting it. |
| **D-1** | Standby as fallback, not a queue (§4.4) | **Adopt** — the fallback reading is the only one that does not invent work. |
| **D-2** | Arrival intervals | **Maintenance every 24 ticks, meals every 8 ticks, jitter 0.** Derived from the capacity ceilings in §4A.3 — each set just under the service capacity of its own facility, giving a deliberate 107% total workload. Measured in §4A.3. **These are the two numbers that must change if a reviewer prefers a different demand model (§4.10) — nothing else in the plan depends on them.** |
| **D-3** | Reason-string wording (Q29 is **OPEN**) | Ship one variant; try the other in a second session. Q29 says show both in one session. |
| **D-4** | Personnel growth | **Not a Stage 2 decision.** `D22` fixes 6–8 for Stage 2 and makes growth a Stage 5+ trigger. |

### 12.3 Assumptions, stated so they can be rejected

- The 7-person fixture is created in `createRun(seed)` rather than at tick 1, so a run is complete the moment it is made.
- **Work arrives on a fixed cadence because no document specifies that work arrives at all** (§4.10). This is the plan's largest undocumented assumption and the first thing a reviewer should challenge.
- Completion tier `notable` for a finished job, `routine` for everything else — `ARCHITECTURE.md` §6.1 requires the rule be explicit rather than ad hoc.
- Job *definitions* live in `jobs.ts` as a table, not in state, because at Stage 2 nothing about them is mutable. Stage 7 may move them into state when prerequisites become item-dependent.
- `history` on each person is a capped list of `{tick, jobId, outcome}` — `SYSTEM_DEPENDENCIES.md` §3 assigns `persons[].history` to Personnel at Stage 2 and B1 §11 says depth grows at 4 and 6, so a shallow record is documented rather than invented.

### 12.4 Open questions this stage does not answer

`OPEN_QUESTIONS.md` Q29 (is the reason string enough?) and Q30 (does hysteresis work?) are **decided by observation at this stage, not in advance**. Q24, Q26, Q27 and the rest are later-stage questions and are untouched.

---

## 13. Verification checklist and Build Mode handoff

### 13.1 Pre-flight

```
[ ] Stage 1 phone manual gate performed and recorded in AGENTS.md      (Step 0)
[ ] A1 capacity decision made and recorded                              (§4.1)
[ ] D-2 arrival intervals accepted, or replaced with an alternative    (§12.2)
[ ] §4.10 read and challenged — arrivals are our invention, not documented
[ ] git status clean; HEAD recorded
[ ] npm run verify green before the first change
```

### 13.2 Per-step loop

```
1. One step. One commit. No unrelated changes.
2. npm run verify after every step — typecheck, tests, build, headless.
   All four must pass. A red suite is a stop, not something to route around.
3. Never edit src/sim to import React, the DOM, or a clock.
   Never add Math.random. Never store a derived value.
   If a change seems to need one of these, the design is wrong — fix the design.
4. Edit docs/, then: bash tools/build-master.sh
   PROJECT_MASTER.md is generated. Never hand-edit it.
5. Mirror for phone reading: scripts/sync-docs.sh
   The mirror is a copy — never edit it, never commit it.
6. Update AGENTS.md in the same session as any decision or stage change.
   Also fix the 88 -> 95 test drift while you are there.
7. Do not implement anything in §9.
```

### 13.3 Definition of done for Stage 2

```
[ ] Every acceptance criterion in §10 met
[ ] §8.1 automated suite green; §8.3 fixture gate passing on all 7 seeds,
    reproducing the §4A.3 reference figures
    (balanced 267/866 · maintenance-first 297/777 · meals-first 257/896)
[ ] pending never negative; claims never exceed arrivals
[ ] rngCursor is 7 after createRun and never grows during a run
[ ] npm run verify exits 0
[ ] tools/headless.ts still runs with no browser, twice byte-identical
[ ] §8.2 manual gate performed on the phone; answers recorded in CHANGELOG.md
[ ] AGENTS.md, CHANGELOG.md, ROADMAP.md updated
[ ] PROJECT_MASTER.md rebuilt from source
[ ] D21 Stage 7 untouched and still recorded as guaranteed
```

### 13.4 Command to begin

```bash
cd ~/military-base-sim-dev
git log --oneline -1 && git status --porcelain   # expect: 88dbe92 and empty
npm run verify                                    # expect: green, 95/95
npm run dev                                       # Step 0 — the Stage 1 phone gate
```

Then begin at **Step 1** of §7.

---

## 14. Final recommendation

**Proceed.** Stage 2 fits the existing architecture with no structural rework. The pure-simulation rule, the event log, the command queue, the seeded RNG, the controller and the headless runner are all built and all already shaped for this stage. The tick body simply gains three phases.

**One decision is needed before Step 3, and it is a real one.** The documented reference fixture makes the priority control **provably inert** — duties outrank intent in the selection ladder, and 2 maintenance-capable people exactly fill workshop-2 while 2 supply-capable exactly fill kitchen-2, so intent is never consulted at all. The alternative proposed by one submitted plan (5/1/1 at capacity 2/2) does not fix it: tracing it shows identical slot occupancy under both priority orders, so it yields a control that changes *who* works but never *how much gets done*, which does not satisfy `ROADMAP.md`'s "visibly starve meal preparation".

**The adopted fix changes two numbers** — facility capacity 2 → 4 and arrival interval 600/100 → 24/8 — and preserves the documented personnel mix, job list, durations, and Balanced baseline. Measured over 7 seeds: `maintenance-first` ends 5 days with **119 unstarted meal orders**, `meals-first` ends with a **40-order maintenance backlog**, each worse on a different job, neither starving the other to zero. `ROADMAP.md` authorises adjusting the fixture when its own stated conditions are not met, and `Step 2` writes both changes and their reasoning into the roadmap rather than leaving them in code.

**One assumption is ours, not the documents', and a reviewer should challenge it first.** `ROADMAP.md` gives Stage 2 jobs with *"eligibility, duration, prerequisites, outputs"* — **it never says where work comes from.** Without a demand source there is nothing for priority to allocate, so the plan supplies a fixed arrival cadence (§4.10). It is the weakest such claim available — no jitter, no new state, no new system — and it is isolated behind two constants so it can be swapped and the gate re-run.

**This document has been wrong twice, and both times are recorded rather than quietly patched.** The first revision left the base 93.5% idle with all three priority settings producing identical output, and claimed a "33% throughput difference" derived from capacity that demand never used. Rev 2 corrected both. **A self-audit of rev 2 then found eleven further defects, including two wrong rows in the very table rev 2 introduced** — see §11A for the full list. The lesson, which is the one worth carrying into Stage 3: *a document that has been through two corrections is not thereby correct.* The numbers here are a model of the rules, not the rules running; Build Mode's first job is to reproduce them.

**One gate should precede implementation:** the Stage 1 phone manual gate, never performed per the project's own evidence audit. No authoritative document states it blocks Stage 2 and I am not inventing a blocker — but Stage 2's gate is judged by watching the app, on an interface that has never been opened in a browser.

Everything else in this document is either verified from the repository, traced by arithmetic, or explicitly flagged as a recommendation awaiting sign-off.