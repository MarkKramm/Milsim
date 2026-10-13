# Military Base Simulator — Project Checkpoint

**Everything about this project in one file.** Self-contained: no other document
needs reading, no prior conversation assumed.

> **The design blueprint is complete.** This document is the concise checkpoint.
> Depth lives in `GAME_DESIGN_BLUEPRINT.md` (every system specified) and
> `SYSTEM_DEPENDENCIES.md` (who owns what, and why the tick order is what it is).
>
> **The next action is Stage 1. No further planning pass is scheduled.**

This project has been externally reviewed **twice**. Both reviews' findings,
what was accepted and what was declined, are in **Part 10** — including three
genuine contradictions the reviewers found in the plan, two of which this
assistant had introduced while fixing an earlier review's advice.

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
**deeply inspectable** — soldiers, weapons, gear, vehicles. That is honoured:
Stage 7 exists specifically for it, and it is the leading candidate at the
Stage 6 evidence review.

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
- Git initialised locally. Nothing pushed — **no off-device backup exists**.

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
| **Phase** | Blueprint complete. Implementation not started |
| **Code** | None. Empty directories and a `.gitignore` |
| **Git** | Local commits only. Nothing pushed |
| **External reviews** | Two, both acted upon |
| **Open questions** | **19** (Q16–Q35), each with a named stage that answers it |
| **Next action** | Stage 1 — a simulation that ticks |
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

---

## Part 6 — Roadmap

Gates must test only what a stage can actually answer. Stages 6–10 are
conditional.

| Stage | Content | Gate |
|---|---|---|
| 0 | Blueprint *(complete)* | — |
| 1 | Tick loop, seeded RNG, events, headless runner. **No people.** | Numbers move and you understand them *(technical only)* |
| 2 | 6–8 people, 3 jobs, autonomous selection with reasons, **one priority** | **Watching them work is interesting**, and the priority visibly changed something |
| 3 | Hunger, fatigue, resources, readiness summary, schedules, save/load | **Something can be lost, and you felt it** |
| 4 | Named-option decisions, full intent, reports, timeline, relationships | **You made a choice and understood its effect** |
| 5 | Anomalies, **commitments**, run history | **You want to play day 5** |
| 6 | Evidence review — *a decision, not a build* | Chooses exactly one expansion |
| 7 | Equipment and logistics *(conditional — leading candidate)* | The base is a world of **specific things**, not totals |
| 8 | Production, workshop, engines *(conditional)* | The bottleneck is **people**, not throughput |
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

**Items — Stage 7, the leading candidate.** Individual condition, wear,
reliability, assignment, inspection. **Work leaves persistent results:** a repair
changes *that* item. This is the developer's original interest, and it has a
defined place.

**Production — Stage 8.** Engines, fuel, manufacturing, repair-versus-produce.
Intent: a production system whose **bottleneck is people**. The trap: the moment
players solve it as a throughput puzzle, the game has changed genre.

**Long-term purpose — provisional (Q16).** Maintain and improve the base;
prepare for commitments; fulfil them; absorb consequences; accumulate history.
No campaign structure, no win condition, no external enemy.

**Combat — OPEN, not provisional.** It may never ship. If it does, it must be
additive and optional.

---

## Part 8 — The five chains

The design's substance. Each is a testable scenario. Detail in
`SYSTEM_DEPENDENCIES.md` §5.

| Chain | Shape |
|---|---|
| **A** — maintenance conflict | item degrades → worker contended → repair delayed → supply drops → meal missed |
| **B** — the specialist problem | one absence reshapes the whole day |
| **C** — the reserve decision | spending now versus saving for later |
| **D** — the departure | neglect compounds until someone leaves |
| **E** — relationship consequence | who works together changes how fast |

**Chain A is the reference chain.** If it cannot be demonstrated end-to-end by
Stage 5, the game is not the game this project describes.

---

## Part 9 — Where the design lives

| Document | Contents |
|---|---|
| `GAME_DESIGN_BLUEPRINT.md` | **The System Atlas** — every system, 11 sections each |
| `SYSTEM_DEPENDENCIES.md` | Ownership, tiers, tick order, 5 chains, 15 invariants |
| `ARCHITECTURE.md` | Technical foundation |
| `LOCKED_DECISIONS.md` | The 12 decisions, with rationale and corrections |
| `ROADMAP.md` | Stages, gates, questions passed forward |
| `OPEN_QUESTIONS.md` | 19 questions, each with status and the stage that decides it |
| `REVIEW_REPLIES.md` | Both external reviews in full |
| `_archive/` | The superseded originals and the first audit, preserved for audit |
| `_reference/` | `PROJECT_SUMMARY.md`, `WORKING_AGREEMENT.md` |

---

## Part 10 — Both external reviews

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
| Stage 6 chose by evidence; Stage 7 assumed the choice | Stage 6 is explicitly a decision; Stages 7–10 marked conditional |

Also correct: commitments belonged in the roadmap (now Stage 5, ahead of
achievements); several systems had no stage (now assigned); gates were applied
uniformly (now per-stage).

**Its main contribution:** the system dependency map — ownership rules, tier
ordering, tick-order justifications, 15 invariants, and circular-dependency traps.

**One disagreement recorded:** it treated combat as a likely eventual stage.
This project treats it as **open** — a game whose threat is external cannot
justify its own simulation if the simulation is not already worth watching.

### 10.3 What the reviews did not change

The architecture, the stack, the pure-simulation rule, seeded determinism, gate
discipline, and the sequencing discipline. **Nothing in either review touched
them** — which is the outcome a correct architecture produces under review.

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
- Git is local only. **There is no off-device backup.**
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