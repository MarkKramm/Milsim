# Status & Handoff Brief

**Purpose:** a complete, self-contained snapshot of this project for another
AI assistant to read. Written to be model-agnostic — it assumes no particular
tool, no particular workflow, and no prior conversation.

Paste the contents of this file, or point the other assistant at the `docs/`
folder.

---

## 1. What has happened so far

1. A **planning pack** was produced in an earlier session: vision, core loop,
   prototype spec, foundation decisions, implementation stages, and open
   questions. It was explicitly scoped as planning-only, with no code.
2. That pack was **audited** and found to be good in quality but incomplete in
   coverage. It described a *simulation* rather than a *game* — no stakes, no
   goal, no failure, and player agency reduced to sliders.
3. **20 design decisions** were put to the player with recommendations. The
   player approved nearly all recommendations, and requested several features be
   planned in advance (hydration, morale, injuries, factory/production layer,
   engines, vehicles, relationships, achievements, secrets) plus a full roadmap
   and a stronger architectural foundation.
4. Those requests were **accepted and documented** — planned and sequenced
   rather than built immediately, for reasons given in §6.
5. **No code has been written.** The project is at the end of the planning
   phase.

---

## 2. The game

A living military base simulation. Personnel act autonomously; interconnected
systems create persistent consequences; the player commands by exception,
setting policy and intervening only when it matters.

The player never micromanages. They observe, understand why things happen, and
make a small number of meaningful choices.

**The one question the prototype exists to answer:**

> Is it enjoyable to watch a small autonomous base operate, understand why things
> happen, and occasionally change a policy?

**Tone:** calm, systemic, observational — with genuine stakes. Not a clicker,
not a micromanager, not an optimisation puzzle, and not a combat game.

---

## 3. Settled design decisions

These are locked. Do not re-open them without strong reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | **Soft failure spine.** A "readiness" value drifts down when people are hungry, tired, or idle; up when fed, rested, working. At zero, people quit. | Gives the sim stakes for ~30 lines of code. A sim where nothing is lost is a screensaver. |
| 2 | **Named-option decisions.** A few times a day, a concrete situation with 2–3 specific options and a visible cost. Queued in the report; rarely interrupting. | The difference between a sim and a game. Sliders give weak agency because their effects are unpredictable. |
| 3 | **Rule-generated anomalies.** Normal days are made interesting by small system-generated irregularities, never scripted story beats. | A normal day is 95% of what the player sees. |
| 4 | **Pacing: ~3 real minutes per in-game day.** 1 tick = 1 in-game minute; 1440 ticks/day; 8 ticks/sec at 1×. Speeds: pause / 1× / 4× / 16×. | Deliberately easy to change — one constant. To be validated by playing. |
| 5 | **Abstract time display.** "Day 3 — Afternoon". No live clock. | A fast-ticking clock foregrounds a number the player cannot affect. |
| 6 | **Hysteresis on task selection.** Workers finish or explicitly abandon a task; abandoning forfeits some progress. | Prevents dithering. Must exist from day one; retrofitting it means rewriting every job rule. |
| 7 | **Time-based pressure**, drifting toward people-based. External pressure (raids) deferred. | Cheapest pressure that creates consequence. External pressure is the most expensive to build and the most likely to derail the project. |
| 8 | **Stack: TypeScript + Vite + React.** | The developer already runs this exact stack successfully in another project. |
| 9 | **Simulation is a pure module.** No UI imports, no DOM, runnable headless. | The single most important architectural rule. Makes the game testable, reproducible, saveable, and debuggable. |
| 10 | **Seeded randomness from tick zero.** One RNG function, no `Math.random()` in simulation, UI never draws from the sim stream. | Cannot be retrofitted cheaply. Enables exact reproduction of any run. |
| 11 | **Panels only.** No grid, no map, no spatial navigation. | Can be added later if it earns its place. |
| 12 | **Phone-first.** Vite dev server in Termux, played in the phone browser. | Target device constraint that keeps panels honest. |
| 13 | **Needs ladder.** Hunger + fatigue first; then hydration, then morale, then injuries — one at a time. | Each added need multiplies tuning interactions. |
| 14 | **Scope is sequenced, not banned.** Combat, vehicles, factions, pathfinding, etc. are all parked with defined unlock points. | Full design is documented now; implementation order protects the core. |
| 15 | **Save/load early, via constraint.** The entire simulation state must be plain JSON-serializable from the start; the save/load UI waits for Stage 3. | Gives the developer cross-session playtesting on a phone without compromising the architecture. |
| 16 | **Interrupts are rare.** Queued decisions are the norm; true pauses budgeted to roughly one per in-game day. | Respects the developer's dislike of interruption while preserving agency. |
| 17 | **God view, occasional interference.** No avatar; meaningful rare intervention points. | Pure observation is a screensaver. |
| 18 | **No deadline.** Passion project. Ordering enforced by gates, not deadlines. | Without a deadline the risk is drift, not rushing. |

---

## 4. Architecture summary

- Three layers, dependencies pointing downward only: **UI → Controller →
  Simulation**.
- One authoritative state object; plain JSON only (no classes, functions, Map,
  Set, or Date).
- Fixed, deterministic tick order: clock → queued decisions → needs →
  facilities/equipment → job selection → job progress → resource changes →
  readiness → events → new decisions.
- Every meaningful change appends an **event** with subject IDs and cause event
  IDs. Reports read the log and never recompute — this makes "the report is
  accurate" true by construction.
- A **headless runner** (`tools/headless.ts`) executes N ticks with no UI. It is
  the enforcement mechanism for the pure-simulation rule and must keep working.
- Testing: invariant tests, golden runs on a fixed seed, headless smoke test.

---

## 5. Roadmap — build order

Each stage has a **gate**, which is an observation or a feeling, not a feature
list. You may not advance until the gate is genuinely met.

| Stage | Content | Gate |
|---|---|---|
| 0 | Planning documents | ✅ Complete |
| 1 | Tick loop, seeded RNG, clock, minimal UI, headless runner | The numbers move and you understand them |
| 2 | 6–8 people, 3 jobs, autonomous selection with visible reasons | **Watching them work is interesting** |
| 3 | Hunger + fatigue, supply interaction, readiness spine, save/load | **Something can be lost, and you felt it** |
| 4 | Named-option decisions, report, timeline, debug view, minimal relationships | You made a choice and understood its effect |
| 5 | Anomalies, run history, secrets, achievements | **You want to play day 5** |
| 6 | Exactly one expansion layer, chosen by evidence | Chosen by what Stage 5 revealed |
| 7 | Production layer: engines, fuel, workshop, supply chain | The bottleneck is people, not throughput |
| 8 | External layer: vehicles, then operations | Parked |

---

## 6. What is fully designed but deliberately not built yet

The developer asked for the factory/production layer, engines, vehicles,
relationships, achievements, secrets, hydration, morale, and injuries to be
designed and planned in advance. **All of them are.** See `LONG_TERM_DESIGN.md`.

They are sequenced rather than built first, for one substantive reason:

> In a simulation, the interesting systems cannot be designed until the boring
> ones are proven interesting. Nobody has yet confirmed that watching six people
> eat, rest, and work is entertaining. The factory layer would be designed
> around an unverified assumption, and would very likely be rebuilt once the
> base simulation revealed its actual feel.

This is a sequencing judgement, not a rejection of the request. The full design
exists on paper precisely so nothing is lost.

**A related tension the developer raised:** they asked not to build Stage 1 and
2 as throwaway minimums, and instead to establish a strong foundation
immediately. The compromise accepted: the *architecture* is fully designed now
(`ARCHITECTURE.md`), and the simulation layer is built to that architecture from
the first commit — but the *gameplay systems* follow the gates.

---

## 7. Known risks

1. **Watching may not be fun without pressure** — fatal if unaddressed. Mitigated
   by the readiness spine and named-option decisions.
2. **The player may have nothing meaningful to do** — fatal if unaddressed.
   Mitigated by queued decisions.
3. **Drift is the most likely failure mode** — no deadline means months can go
   into systems that were never played. Gates are the defense.
4. **The production layer could swallow the game's identity**, turning a people
   simulator into a throughput puzzle. The clearest risk in the long-term plan.
5. **Morale is easy to implement badly** — it should be derived from observable
   state, never a standalone mood value.
6. **Too many needs dilute each other** — hence the ladder.

---

## 8. Environment and constraints

- Development happens on an **Android phone** in **Termux**. A desktop is
  currently unavailable.
- The game is played in the **phone browser** via a Vite dev server.
- **Code must live in Termux home**, not shared storage. Shared storage
  (`/storage/emulated/0`) is a FUSE mount where `node_modules` is very slow and
  file-watching breaks.
- Documentation is mirrored to shared storage so it can be read in any editor
  app on the phone.
- The developer is a **beginner/intermediate developer**. Unfamiliar tooling
  should be explained rather than assumed.

---

## 9. What would be most useful from another assistant

**Read `QUESTIONS_FOR_REVIEW.md` first.** It contains 20 open questions this
project wants answered, ranked by importance, including an explicit invitation
to argue against the design (Q3).

- **Build Stage 1 exactly as specified.** It is small and deliberately so.
- **Critique whether a gate is genuinely met** rather than assuming it. The
  greatest risk to this project is advancing past a stage that is not yet fun.
- **Flag scope creep** if later suggestions reintroduce combat, vehicles, or a
  factory layer before their gates.
- **Propose improvements as written rationale**, not silent changes. This project's
  planning documents are the source of truth and are meant to evolve
  deliberately.
- **Add new ideas to a clearly labelled parking lot** rather than into the
  active design.
- **Be direct.** A confident disagreement with a stated cost is far more useful
  than a polite non-answer. Nothing here is sacred — but nothing changes on a
  hunch either.

---

## 10. Documents to read

| File | Purpose |
|---|---|
| `PROJECT_SUMMARY.md` | One-page orientation |
| `GAME_VISION.md` | Vision and design pillars |
| `CORE_LOOP.md` | The repeating loop |
| `LOCKED_DECISIONS.md` | All 18 settled decisions with rationale |
| `LONG_TERM_DESIGN.md` | The full game, designed |
| `ARCHITECTURE.md` | Technical foundation |
| `ROADMAP.md` | Build order and gates |
| `AUDIT_AND_RECOMMENDATIONS.md` | Critical review of the original plan |
| `PROTOTYPE_SPEC.md` | Prototype scope and acceptance criteria |
| `DECISIONS_TO_APPROVE.md` | Decision questions with recommendations |
| `DECISIONS_ANSWERED.md` | The developer's actual answers |

---

## 11. One-paragraph summary

This is a slow, methodical, unglamorous build: a military base simulation where
autonomous people create understandable consequences, watched from above and
shaped by occasional meaningful choices. The planning is complete and the
architecture is settled. Implementation begins with a deliberately trivial
simulation that ticks, exists to prove one hypothesis — that watching a small
autonomous base is interesting — before any ambitious system is built on top of
it. The single rule that governs everything: the simulation must never depend on
the UI.