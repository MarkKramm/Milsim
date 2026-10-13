<!-- SYNCSTAMP -->
<!-- v3321150 | 456 lines | updated 2026-10-13 13:49 -->

# Military Base Simulator — Project Checkpoint

**Everything about this project in one file.** Self-contained: no other document
needs reading, no prior conversation assumed.

> **The design blueprint is complete.** This document is the concise checkpoint.
> Depth lives in `GAME_DESIGN_BLUEPRINT.md` (every system specified) and
> `SYSTEM_DEPENDENCIES.md` (who owns what, and why the tick order is what it is).
>
> **Stage 1 is built. See `CHANGELOG.md`. The next action is its manual gate on
> the phone, then Stage 2.**

This project has been externally reviewed **four times**. All four reviews'
findings, what was accepted and what was declined, are in **Part 10** — including
**eleven genuine contradictions** the reviewers found, **eight of which this
assistant had introduced itself** while fixing earlier advice.

The third and fourth reviews each verified their catches against the documents
before acting on them, and all were real. The dependency model was rebuilt, Chain A
was split into two gates, the tick order was made phase-monotonic, and the project's
defining feature was made guaranteed rather than droppable.

---

## Part 1 — What this game is

A living military base simulation. Personnel act autonomously, interconnected
systems create persistent consequences, and the player commands **by
exception** — setting policy, inspecting, and intervening only when a decision
matters.

The player never micromanages. They observe, understand why things happen, and
make a small number of meaningful choices.

**Tone:** calm, systemic, observational, with genuine stakes. Dwarf Fortress or
RimWorld in spirit, far smaller in scope.

**Not:** a clicker, a micromanager, an optimisation puzzle, a combat game, or an
infinite sandbox.

The developer's original interest was a base where personnel and equipment are
**deeply inspectable** — soldiers, weapons, gear, vehicles. That is honoured,
and it is now **guaranteed rather than conditional** (D21): a game that quietly
becomes a generic colony sim has lost the thing worth years of work. Stage 6
now chooses what is added *beside* equipment, not whether equipment exists.

### The design test for the whole project

> **Can you notice a developing problem, make a meaningful intervention, and
> later recognise the consequences of that decision?**

Every stage is judged against a version of this question sized to what that
stage can actually build.

---

## Part 2 — History

### 2.1 Original planning pack

A set of planning documents produced before this phase — vision, core loop,
prototype spec, foundation decisions, stages, open questions. Explicitly
planning-only. Preserved in full in `_archive/ORIGINAL_PLANNING_PACK.md`.

Good discipline, honestly executed. But incomplete in coverage: **it described a
simulation rather than a game** — no stakes, no goal, no failure, and player
agency reduced to sliders.

### 2.2 First audit

Found those gaps and proposed fixes: a readiness spine for stakes, named-option
decisions for agency, and rule-generated anomalies for normal days.

### 2.3 Decision round

Twenty decisions put to the developer with marked recommendations. **Nearly all
approved, several by "up to you."** The developer also asked for hydration,
morale, injuries, a production layer, engines, vehicles, relationships,
achievements and secrets to be **designed in advance** — and for the project to
be documented well enough that another agent could continue it.

Accepted: all systems designed on paper, plus a checkpoint file and a working
agreement.

Declined with reasons: building them first. In a simulation, the interesting
systems cannot be designed until the boring ones are proven interesting.

**A later nuance, now explicit:** the request was partly about *architecture*.
That part was agreed to fully — the pure simulation module, seeded RNG, JSON
state and event log are not throwaways and are built to from the first commit.

### 2.4 A correction to the record

Documents began calling decisions "locked." The first external review correctly
objected: the developer had approved most **by trusting a recommendation, not by
examining each one**. The terminology was changed to **settled**, with an
explicit note that any can be revisited. Preserved through both reviews.

### 2.5 Environment problems solved

- Files were extracted into Termux's private directory, which Android's scoped
  storage hides from all other apps. Moved to shared storage for reading.
- A permanent split adopted: **docs mirrored to shared storage** for phone
  reading, **code in Termux home** where `node_modules` is fast and file
  watching works.
- Git initialised locally, then made a **private remote** backup at
  `github.com/MarkKramm/Milsim`.

### 2.6 Review 1

Confirmed the architecture, challenged the gates, and found **two genuine
errors in the plan**: readiness penalised legitimate rest, and readiness was a
magic meter rather than a derived summary. Both fixed. It also argued that
"informed" is not "responsible" — the deepest risk in the design.

### 2.7 Review 2

Found **three contradictions**, two of them introduced while applying Review 1's
advice. Requested a complete System Atlas with a dependency map. Produced —
see Part 9.

---

## Part 3 — Current status

| | |
|---|---|
| **Phase** | **Stage 1 built and verified** — a simulation that ticks |
| **Code** | `src/sim` (pure), `src/controller`, `src/ui`, `tools/headless.ts`, 88 tests passing |
| **Git** | Private remote at `github.com/MarkKramm/Milsim`; `docs` and `ci` workflows green |
| **External reviews** | Four, all acted upon |
| **Open questions** | **21** (Q16–Q37), each with a named stage that answers it |
| **Next action** | Stage 1 manual gate on the phone, then Stage 2 (people and jobs) |
| **Blocked on** | Nothing |

---

## Part 4 — Settled decisions

Called **settled**, not locked: approved on trust, revisitable, recorded so that
changes are deliberate.

1. **Stakes — readiness.** Readiness is a **derived summary that no system may
   read**. The underlying conditions — fatigue, hunger, injury, sustained
   neglect — drive behaviour. Consequences are graduated: warning → reduced
   effectiveness → declines demanding work → refuses optional assignments →
   *then* leaves. **Legitimate rest is not idleness.**
2. **Agency — named-option decisions.** A few times a day, a concrete situation
   with 2–3 options, each protecting a different priority with a credible cost.
   Queued in the report; rarely interrupting.
3. **Intent is a design concept, not a UI control.** First-class simulation data.
   An intent whose effect cannot be observed is a dead control.
4. **Normal days — hybrid anomalies.** Authored rules, sim-gated eligibility,
   seeded selection, recorded consequences. Must inform or change something.
5. **Pacing — ~3 real minutes per in-game day.** 1 tick = 1 in-game minute,
   1440 ticks/day, 8 ticks/sec at 1×. **Render rate decoupled from tick rate.**
6. **Abstract time display.** "Day 3 — Afternoon". No clock.
7. **Hysteresis.** Finish or explicitly abandon; abandoning forfeits progress.
8. **Pressure — time-based first**, drifting to people-based. Combat deferred.
9. **Stack — TypeScript + Vite + React**, phone browser. Already familiar.
10. **Save/load early, via constraint.** All state plain JSON-serializable from
    commit one; the UI waits for Stage 3.
11. **Panels only.** No grid or map.
12. **No deadline.** Gates, not dates.

---

## Part 5 — Architecture

**The rule that governs everything:** the simulation contains no UI code. If a
React component contains a rule about how the world works, that is a bug.
Enforced by a headless runner that must keep working forever.

Three layers, dependencies downward only: **UI → Controller → Simulation.**

- **State** — one authoritative object, plain JSON only.
- **Tick order** — fixed, documented, and *tested for bias*, not assumed
  correct. Two contested orderings are written out with their rationale.
- **Randomness** — one seeded stream, one function. The UI never draws from it.
- **Events** — every change appended with cause IDs; three significance tiers.
  **Reports read the log and never recompute.**
- **Testing** — invariant tests lead; golden runs are small and few.

Full detail: `ARCHITECTURE.md`, `SYSTEM_DEPENDENCIES.md`.

**Three concepts, kept separate** *(corrected after the third review, which found
the previous version stated two opposite rules three lines apart):*

- **Ownership** — exactly one writer per field. The real protection against cycles.
- **Phase** — *when* a system runs within a tick. Numbers are execution order.
- **Service** — cross-cutting machinery (Time, RNG, Events, Commands) with no phase,
  because a service cannot be both first and last.

A system in phase N may read any field owned by a system in phase ≤ N. One rule,
no exceptions. Systems never write another's field — they send a **request**, and
the owner may refuse and record why.

---

## Part 6 — Roadmap

Gates must test only what a stage can actually answer.

**Stage 7 is guaranteed** (D21). Stages 8–10 are conditional.

| Stage | Content | Gate |
|---|---|---|
| 0 | Blueprint *(complete)* | — |
| 1 | Tick loop, seeded RNG, events, headless runner. **No people.** | Numbers move and you understand them *(technical only)* |
| 2 | 6–8 people, 3 jobs, autonomous selection with reasons, **one priority** | **Watching them work is interesting**, and the priority visibly changed something |
| 3 | Hunger, fatigue, resources, readiness summary, schedules, save/load | **Something can be lost, and you felt it** |
| 4 | Named-option decisions, full intent, reports, timeline, relationships | **You made a choice and understood its effect** |
| 5 | Anomalies, **commitments**, run history, **Chain A1** | **You want to play day 5** |
| 6 | Evidence review — *a decision, not a build* | Chooses one expansion **besides** guaranteed equipment |
| 7 | Equipment and logistics **(guaranteed — D21)** | The base is a world of **specific things**, and a loadout is inspectable |
| 8 | Production, workshop, engines *(conditional)* — **Chain A2** | The bottleneck is **people**, not throughput |
| 9 | Vehicles *(conditional)* | A dispatched vehicle can leave and not return |
| 10 | Operations, threats *(parked — may never exist)* | An external threat is meaningful rather than arbitrary |

**Every gameplay gate (2–5) requires 3 of 4 observable evidence items:**

1. You can explain what happened **without reading the source code**.
2. You noticed something **before** the report told you.
3. A decision **visibly changed** what happened next.
4. You **continued past novelty** wearing off.

**Stage 2 is the easiest to fake** — six people working is cute, and cuteness
feels like fun. Item 4 is the honest test.

---

## Part 7 — Long-term design

Fully specified in `GAME_DESIGN_BLUEPRINT.md`: **24 systems**, each with eleven
sections — purpose, state, rules, dependencies, autonomy, player agency,
consequences, events, interface, tests, and stage. Every one has all eleven.

**Needs ladder.** Hunger and fatigue first; then hydration, morale, injuries —
one at a time. Morale is derived and must contribute something the underlying
needs do not; if it does not, **cut it**.

**Items — Stage 7, and guaranteed (D21).** Individual condition, wear,
reliability, assignment, inspection. **Work leaves persistent results:** a repair
changes *that* item.

**Structural contract** *(added after review 3).* The interest is *inspection* —
soldiers, helmets, clothing, pockets, durability, armour, weapons, loadouts — and
a flat item list with a condition bar would satisfy the roadmap while missing all
of it. So the guarantee is tied to a model, not to the word "equipment":

- **Soldier** — identity, skills, needs, activity, *carried equipment*, *which
  slots are filled, empty or blocked*, and **derived** effective capability.
- **Item** — stable `id`, type, owner, physical location, condition, reliability,
  **repair history** (a visible scar, not a bare number), required slot,
  compatibility, consumable state.
- **Slots and containers are one mechanism at different depths.** A soldier has
  slots (primary weapon, sidearm, helmet, body armour, boots); clothing and
  webbing are containers holding pockets or magazines, which are themselves
  slots. Everything is an item; some items hold other items. This resolves the
  "is a pocket a slot or an item?" ambiguity that would otherwise force three
  special cases in Stage 7.
- **Loadouts are derived, never stored.** The interface must show which slots are
  filled, and which are empty, incompatible, broken, or held by someone else.
- **Removal is not symmetric with addition.** Losing a capability must never be
  silent.
- **Vehicles** (Stage 9, may never ship) — crew are seats, cargo is mobile and
  lost with the vehicle, mounted equipment is not carried equipment, and damage
  changes what it can physically do. A vehicle is not a fuel bar with an
  inventory attached.

Full model: `GAME_DESIGN_BLUEPRINT.md`, "The equipment structural contract". It
deliberately specifies **no weapon catalogue** — that is content, tuned once the
systems exist.

**Production — Stage 8.** Engines, fuel, manufacturing, repair-versus-produce.
Intent: a production system whose **bottleneck is people**. The trap: the moment
players solve it as a throughput puzzle, the game has changed genre.

**Long-term purpose — provisional (Q16).** Maintain and improve the base;
prepare for commitments; fulfil them; absorb consequences; accumulate history.
No campaign structure, no win condition, no external enemy.

**Combat — OPEN, not provisional.** It may never ship. If it does, it must be
additive and optional.

---

## Part 8 — The six chains

The design's substance. Each is a testable scenario. Detail in
`SYSTEM_DEPENDENCIES.md` §7.

| Chain | Shape |
|---|---|
| **A1** — resource contention *(Stage 5 gate)* | work order due → worker contended → deferred → meal late → hunger rises → player traces it |
| **A2** — equipment chain *(Stage 8 gate)* | A1, plus: item degrades → repair queue → repair beats meals → meal missed |
| **B** — the specialist problem | one absence reshapes the whole day |
| **C** — the reserve decision | spending now versus saving for later |
| **D** — the departure | neglect compounds until someone leaves |
| **E** — relationship consequence | who works together changes how fast |

**Chain A was split after the third review.** The original chain required items
(Stage 7) and production (Stage 8), so demanding it by Stage 5 asked for a
gate the roadmap could not pass. **A1** is now the Stage 5 reference scenario and
**A2** the Stage 8 demonstration.

The asymmetry matters: if A1 works and A2 does not, the game is still viable —
a base simulation with real contention. The reverse is not acceptable.

---

## Part 9 — Where the design lives

| Document | Contents |
|---|---|
| `GAME_DESIGN_BLUEPRINT.md` | **The System Atlas** — 24 systems, all 11 sections, plus the equipment structural contract |
| `SYSTEM_DEPENDENCIES.md` | Field-level ownership, phases, services, 6 chains, 19 invariants |
| `ARCHITECTURE.md` | Technical foundation |
| `LOCKED_DECISIONS.md` | The 12 decisions, with rationale and corrections |
| `ROADMAP.md` | Stages, gates, questions passed forward |
| `OPEN_QUESTIONS.md` | 21 questions, each with status and the stage that decides it |
| `REVIEW_REPLIES.md` | All four external reviews in full |
| `_archive/` | The superseded originals and the first audit, preserved for audit |
| `_reference/` | `PROJECT_SUMMARY.md`, `WORKING_AGREEMENT.md` |

---

## Part 10 — All four external reviews

### 10.1 Review 1

Confirmed the architecture. Challenged the gates. Found **two genuine errors**:
readiness penalised legitimate rest, and readiness was a magic meter.

**Accepted:** readiness became derived; rest separated from idleness; decisions
became graduated; intent became first-class data; anomalies became hybrid;
events gained significance tiers; render rate decoupled from tick rate; tick
order marked as needing bias tests; invariants lead the suite; **and the gates
were rewritten to require observable evidence**, since feelings-based gates can
be lied to.

It also made the observation this project now treats as its deepest risk:
**being informed is not being responsible.**

### 10.2 Review 2 — three contradictions, two self-inflicted

| Contradiction | Resolution |
|---|---|
| Readiness "never an input" *and* drove consequences — impossible as written | Split: conditions rule, readiness explains. No system may read it; now invariant #12. |
| Stage 2's gate demanded evidence a Stage 4 system produced | Stage 2 gains one priority; the gate asks what it can answer |
| Stage 6 chose by evidence; Stage 7 assumed the choice | Stage 6 is explicitly a decision; Stages 8–10 marked conditional |

Also correct: commitments belonged in the roadmap (now Stage 5, ahead of
achievements); several systems had no stage (now assigned); gates were applied
uniformly (now per-stage).

**Its main contribution:** the system dependency map — ownership rules, tier
ordering, tick-order justifications, invariants, and circular-dependency traps.

**One disagreement recorded:** it treated combat as a likely eventual stage.
This project treats it as **open** — a game whose threat is external cannot
justify its own simulation if the simulation is not already worth watching.

### 10.3 Review 3 — three contradictions, all self-inflicted

Every catch verified against the documents before acting. All real.

| Contradiction | Resolution |
|---|---|
| "Tier" meant dependency direction *and* execution order at once, so the document stated two opposite rules three lines apart | Split into **ownership**, **phase** and **service**. Phase numbers were also wrong — they did not match the order they described. |
| Chain A demanded end-to-end demonstration by Stage 5, but it needed items (Stage 7) and production (Stage 8) | Split into **A1** (Stage 5, resource contention) and **A2** (Stage 8, equipment) |
| Item condition both degraded with use and changed only through repair | Items owns wear; applied during use. **Invariant 16** |
| Four ownership ambiguities | Field-level ownership table plus the **request** pattern |
| Equipment might never ship | **D21** — equipment is guaranteed; only its scope is negotiable |
| Stage 1 and 2 left every implementation detail to be invented during coding — how the same decision gets made two incompatible ways | The **Stage 1 contract** and the **Stage 2 reference scenario** |

### 10.4 Review 4 — three contradictions, all self-inflicted

| Contradiction | Resolution |
|---|---|
| "Check for new decisions" was phase 5 but scheduled after phase 9 | Decisions given their own **phase 10**, at the end. All steps are now phase-monotonic |
| The blueprint still described the pre-review ownership model | D1/D2/D4 rewritten: Storage owns holdings, Resources owns no mutable field, Facilities alone writes facility state |
| The item-wear *test* still contradicted the rule | Invariant 16 now names the permitted operations |

**The pattern it exposed, which now governs how corrections are made:** fixing one
document without checking the others that describe the same rule does not remove a
contradiction — it *relocates* it. The third pass corrected one file and left the
blueprint describing the old model, which is worse than the original error because
now two authoritative-looking sources disagree.

**Also added:** the Stage 7 build list that made D21's guarantee funded rather than
asserted; **Chain F** as its gate; decision timing settled (a decision raised in tick
*N* is answered in tick *N+1*, or replay stops being deterministic); the interrupt
budget made **shared** rather than per-system; **D22** recording why the base is 6–8.

### 10.5 What the reviews did not change

The architecture, the stack, the pure-simulation rule, seeded determinism, gate
discipline, and the sequencing discipline. **No review touched them** — which is the
outcome a correct architecture produces under review.

---

## Part 11 — Risks

1. **Watching may not be fun without pressure** — fatal if unaddressed.
2. **Informed is not responsible** — the deepest risk. Showing a report does not
   create ownership.
3. **Drift** — no deadline means months can go into systems never played.
   Gates are the defense, and gates that can be lied to are no defense.
4. **The production layer could swallow the game's identity**, turning a people
   simulator into a throughput puzzle.
5. **Readiness may add nothing** and be cuttable — which is deliberate.
6. **Morale is easy to build badly** — redundant or unexplainable.
7. **Too many needs dilute each other.**
8. **Deciding fun by assumption.**

---

## Part 12 — Environment

- Android phone, Termux. Desktop currently unavailable.
- Played in the phone browser via a Vite dev server.
- **Code stays in Termux home** — shared storage is a FUSE mount where
  `node_modules` is slow and file watching breaks.
- Docs are mirrored to shared storage for phone reading. **The mirror is a
  copy — never edit it.**
- Git is backed up to a **private** remote at `github.com/MarkKramm/Milsim`, with a
  docs-consistency workflow on every push.
- The developer is a **beginner/intermediate developer**. Explain unfamiliar
  tooling rather than assuming it.

---

## Part 13 — How to help

**Reviewing:** answer the questions in `OPEN_QUESTIONS.md`. Be direct — a
confident disagreement with a stated cost beats a polite non-answer.

**Building:** start at Stage 1 exactly as specified. It is small and
deliberately so. Respect the pure-simulation rule without exception. Flag any
suggestion that reintroduces parked features early.

**Two things worth knowing:**

- The developer's biggest documented fear is building a technically impressive
  simulator that is boring. Every judgement should serve that concern.
- Plans have so far been approved by trust rather than item-by-item. **No plan
  has been stress-tested by the person it is for.** If you notice something they
  would have missed, say so plainly rather than deferring to the existing design.

**And one boundary:** the blueprint is finished. Further planning passes should be
refused unless they arrive with a specified completion criterion. Otherwise they
are deferral wearing a productivity costume.