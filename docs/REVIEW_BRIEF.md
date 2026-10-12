# Military Base Simulator — Review Brief

**A complete, self-contained brief for another AI assistant to review.**

You are being asked to think hard about this game design and answer the
questions in **Part 9**. Everything you need is in this one file — you do not
need access to the project, its other documents, or any prior conversation.

You may also be asked to help *build* it. Parts 1–8 give you everything needed
to start Stage 1 correctly.

---

## Part 0 — How to read this

This document is written to be model-agnostic. It assumes no particular tool,
no particular workflow, and no knowledge of who worked on this before.

The design is settled. **Do not re-litigate the settled decisions** unless you
can show a specific failure mode and state what the change costs. Disagreeing is
welcome — silently rewriting the scope is not.

---

## Part 1 — What this game is

A living military base simulation. Personnel act autonomously, interconnected
systems create persistent consequences, and the player commands **by
exception** — setting policy, inspecting, and intervening only when a decision
matters.

The player never micromanages. They observe, understand why things happen, and
make a small number of meaningful choices.

**The one question the whole prototype exists to answer:**

> Is it enjoyable to watch a small autonomous base operate, understand why things
> happen, and occasionally change a policy?

**Tone:** calm, systemic, observational — with genuine stakes. Think Dwarf
Fortress or Kingdom Come in spirit, but far smaller in scope.

**Explicitly not:** a clicker, a micromanager, an optimisation puzzle, a combat
game, or an infinite sandbox.

---

## Part 2 — Where the project stands

| | |
|---|---|
| **Phase** | Planning complete, implementation not started |
| **Code written** | None |
| **Git** | Local commits only, nothing pushed |
| **Next action** | Stage 1 — a simulation that ticks |

**What has happened so far:**

1. An original planning pack was produced (vision, core loop, prototype spec,
   foundation decisions, stages, open questions). It was explicitly scoped as
   planning-only.
2. That pack was **audited** and found to be good in quality but incomplete in
   coverage: it described a *simulation* rather than a *game* — no stakes, no
   goal, no failure, and player agency reduced to sliders.
3. Twenty design decisions were put to the developer with recommendations. They
   approved nearly all, and additionally requested that hydration, morale,
   injuries, a factory/production layer, engines, vehicles, relationships,
   achievements, and secrets all be **designed in advance**.
4. Those were accepted and fully documented, then **sequenced** rather than
   built first, for reasons in Part 7.
5. No code has been written.

---

## Part 3 — Settled decisions

**Locked. Do not re-open without strong reason.**

| # | Decision | Rationale |
|---|---|---|
| 1 | **Soft failure spine.** A "readiness" value drifts down when people are hungry, tired, or idle; up when fed, rested, working. At zero, people **quit**. | Gives the sim stakes for ~30 lines of code. A sim where nothing is lost is a screensaver. |
| 2 | **Named-option decisions.** A few times a day, a concrete situation with 2–3 specific options and a visible cost to each. Queued in the report; rarely interrupting. | The difference between a sim and a game. Sliders give weak agency because their effects are unpredictable. |
| 3 | **Rule-generated anomalies.** Normal days are made interesting by small system-generated irregularities — never scripted story beats. | A normal day is 95% of what the player sees. |
| 4 | **Pacing: ~3 real minutes per in-game day.** 1 tick = 1 in-game minute; 1440 ticks/day; 8 ticks/sec at 1×. Speeds: pause / 1× / 4× / 16×. | Deliberately easy to change — one constant. To be validated by playing. |
| 5 | **Abstract time display.** "Day 3 — Afternoon". No live clock. | A fast-ticking clock foregrounds a number the player cannot affect. |
| 6 | **Hysteresis on task selection.** Workers finish or explicitly abandon a task; abandoning forfeits some progress. | Prevents dithering. Must exist from day one; retrofitting means rewriting every job rule. |
| 7 | **Time-based pressure**, drifting toward people-based. External pressure (raids) deferred. | Cheapest pressure that creates consequence. External pressure is the most expensive to build and the most likely to derail the project. |
| 8 | **Stack: TypeScript + Vite + React.** | The developer already runs this exact stack successfully in another project. |
| 9 | **Simulation is a pure module.** No UI imports, no DOM, runnable headless. | The most important architectural rule. Makes the game testable, reproducible, saveable, debuggable. |
| 10 | **Seeded randomness from tick zero.** One RNG function, no `Math.random()` in simulation, UI never draws from the sim stream. | Cannot be retrofitted cheaply. Enables exact reproduction of any run. |
| 11 | **Panels only.** No grid, no map, no spatial navigation. | Can be added later if it earns its place. |
| 12 | **Phone-first.** Vite dev server in Termux, played in the phone browser. | Target device constraint that keeps panels honest. |
| 13 | **Needs ladder.** Hunger + fatigue first; then hydration, then morale, then injuries — one at a time. | Each added need multiplies tuning interactions. |
| 14 | **Scope is sequenced, not banned.** Combat, vehicles, factions, hiring, pathfinding, animation are all parked with defined unlock points. | Full design is documented now; implementation order protects the core. |
| 15 | **Save/load early, via constraint.** Entire state must be plain JSON-serializable from the start; the save UI waits for Stage 3. | Gives cross-session playtesting on a phone without compromising the architecture. |
| 16 | **Interrupts are rare.** Queued decisions are the norm; true pauses budgeted to roughly one per in-game day. | Respects the developer's dislike of interruption while preserving agency. |
| 17 | **God view, occasional interference.** No avatar; meaningful rare intervention points. | Pure observation is a screensaver. |
| 18 | **No deadline.** Passion project. Ordering enforced by gates, not deadlines. | Without a deadline the risk is drift, not rushing. |

---

## Part 4 — Architecture

- **Three layers**, dependencies pointing downward only: **UI → Controller →
  Simulation**.
- **One authoritative state object**, plain JSON only — no classes, functions,
  `Map`, `Set`, or `Date`. This constraint is what makes saves cheap.
- **Fixed deterministic tick order:** clock → queued decisions → needs →
  facilities/equipment → job selection → job progress → resource changes →
  readiness → emit events → check for new decisions.
- **Events:** every meaningful state change appends an event with subject IDs
  and cause event IDs. **Reports read the log and never recompute** — this makes
  "the report is accurate" true by construction rather than by discipline.
- **Decisions** are data, not UI. Each has options, cause event IDs, and a
  `blocking` flag (true only for rare interrupts). A headless script can answer
  them programmatically, which is how decision balance gets tuned without a
  human.
- **Headless runner** (`tools/headless.ts`) executes N ticks with no UI. It is
  the enforcement mechanism for the pure-simulation rule and must keep working.
- **Testing:** invariant tests (no negative resources, no stuck loops), golden
  runs on a fixed seed, headless smoke test.
- **Layout:**
  ```
  src/sim/        PURE simulation. No UI, no DOM. The only place rules live.
  src/ui/         React components. No rules.
  src/controller/ clock, speed, command dispatch
  tools/          headless.ts
  ```

**The rule that governs everything:** if a React component contains a rule
about how the world works, that is a bug.

---

## Part 5 — Roadmap

Each stage has a **gate** — an observation or a feeling, not a feature list. You
may not advance until the gate is genuinely met.

| Stage | Content | Gate |
|---|---|---|
| 0 | Planning documents | ✅ Complete |
| 1 | Tick loop, seeded RNG, clock, minimal UI, headless runner. **No people, jobs, or needs.** | The numbers move and you understand them |
| 2 | 6–8 people, 3 jobs, autonomous selection with visible reasons | **Watching them work is interesting** |
| 3 | Hunger + fatigue, supply interaction, readiness spine, save/load | **Something can be lost, and you felt it** |
| 4 | Named-option decisions, report, timeline, debug view, minimal relationships | You made a choice and understood its effect |
| 5 | Anomalies, run history, secrets, achievements | **You want to play day 5** |
| 6 | Exactly one expansion layer, chosen by evidence | Chosen by what Stage 5 revealed |
| 7 | Production layer: engines, fuel, workshop, supply chain | The bottleneck is people, not throughput |
| 8 | External layer: vehicles, then operations | Parked |

**Needs ladder** runs alongside, in order: hunger + fatigue (Stage 3) →
hydration → morale → injuries. Each gated on the previous being *felt*, not
merely present.

---

## Part 6 — The long-term design, in brief

Everything below is fully designed on paper and deliberately not built yet.

**Needs.** Hunger and fatigue first. Hydration adds a supply line rather than a
number. Morale is derived from observable state (food security, rest, workload,
injuries, recent events) so it is always explainable — never a standalone mood
value. Injuries are individual, persistent, and caused by the player's own
choices rather than random punishment, which is what makes them dramatic rather
than unfair.

**Production layer.** Engines consume fuel and wear out. A workshop consumes raw
materials. Repairs versus manufacture is a real tradeoff. Deliveries arrive on a
schedule that is imperfect — late, partial, occasionally wrong — generated by
rules, not scripted. Storage capacity forces decisions about what to keep. The
design intent: the base becomes a small production system whose bottlenecks are
*people*, not machines. That is the game's identity — a factory game where the
factory workers are characters. **The trap:** the moment players start solving
it as a throughput puzzle rather than a management story, the game has changed
genre.

**Vehicles.** Consume fuel, need maintenance, need a driver, and go where you
send them. The natural bridge to the external layer, because a vehicle can leave
and not come back.

**Relationships.** People who repeatedly work together accumulate a small
opinion of each other. Deliberately simple: a value per pair, plus a threshold
that surfaces one line in the report. No dialogue trees. This is a *reporting*
layer first — it makes the event log read as human rather than mechanical.

**Continuity after loss.** A run leaves a permanent record: who served how long,
what happened, how it ended. Plus secrets (rare, rule-generated, high narrative
weight) and achievements (long-horizon, persisting across runs). These make a
collapsed base still worth something, and make the game replayable.

**External layer** (raids, enemy AI, operations, faction warfare) is parked
indefinitely. Its purpose: make accumulated state matter. A raid is only
interesting if there is something to lose.

---

## Part 7 — Why the ambitious systems are not built first

The developer asked for the factory layer, engines, vehicles, morale, injuries,
relationships, achievements and secrets to be built upfront. All are designed.
They are sequenced rather than built first, for one reason:

> In a simulation, the interesting systems cannot be designed until the boring
> ones are proven interesting. Nobody has yet confirmed that watching six people
> eat, rest, and work is entertaining. The factory layer would be designed
> around an unverified assumption and would very likely be rebuilt once the base
> simulation revealed its actual feel.

The compromise accepted: **the architecture is fully designed now and built to
from the first commit** — the pure-simulation rule, seeded RNG, JSON state, and
event log are not throwaways. Only the *gameplay systems* follow the gates.

This is a sequencing judgement, not a rejection of the request.

---

## Part 8 — Known risks

1. **Watching may not be fun without pressure** — fatal if unaddressed.
   Mitigated by the readiness spine and named-option decisions.
2. **The player may have nothing meaningful to do** — fatal if unaddressed.
   Mitigated by queued decisions.
3. **Drift is the most likely failure mode.** No deadline means months can go
   into systems that were never played. The gates are the defense.
4. **The production layer could swallow the game's identity**, turning a people
   simulator into a throughput puzzle. The clearest risk in the long-term plan.
5. **Morale is easy to implement badly** — should be derived from observable
   state, never a standalone value.
6. **Too many needs dilute each other** — hence the ladder.
7. **Deciding fun by assumption.** The gates are the only defense, and they are
   easy to lie to yourself about.

---

## Part 9 — Questions we want answered

Answer as many as you can, starting from Q1. If you disagree with a locked
decision, say what the change costs.

Format your reply as:

```
### Q<n>. <question, abbreviated>
**Short answer:** ...
**Detail:** reasoning, tradeoffs, what you would do differently.
**What we would change:**
**What we would keep:**
**Confidence:** high / medium / speculative
```

---

### Q1. The pacing number is a guess. What is it likely wrong about?

Locked at: 1 tick = 1 in-game minute, 1440 ticks/day, 8 ticks/sec at 1× → an
in-game day is ~3 real minutes. Speeds: pause / 1× / 4× / 16×. Chosen without
evidence; nobody has played it.

- What is the likely failure mode — too fast, too slow, or right length but
  wrong rhythm?
- Should needs change on a timescale of hours or something faster, given a
  3-minute day?
- Is "same speed all day" right, or should speed vary by time of day?
- What would you expect to be the most *tedious* number on screen?

Why it matters: if pacing is wrong, every later judgement about whether the
game is interesting is measured against a broken instrument.

---

### Q2. Does the readiness spine create stakes, or just noise?

A single value drifting down when people are hungry/tired/idle, up when
fed/rested/working. At zero, people quit.

- Does one aggregate number create drama, or is it another bar to watch?
- How often should it move before it stops being meaningful?
- Is quitting the right consequence, or too blunt? What else could a person do
  when morale collapses that is worse than leaving?
- Could this produce a death spiral where one quit makes the next more likely —
  and is that interesting or just a collapse?

---

### Q3. What is the strongest argument against this entire design?

Not the weakest. The **strongest**.

- What is the most likely reason this game ends up boring despite everything
  being designed correctly?
- Which single feature, implemented well, would still leave the game hollow?
- What game is this one mistake away from turning into, and how would we notice
  too late?

This project has been audited repeatedly by friendly readers. A hostile review is
worth more now than another affirming one.

---

### Q4. Is "watch a small autonomous base" a real genre with known design laws?

The appeal is watching understandable systems interact, in the spirit of Dwarf
Fortress, but much smaller.

- What separates sims people love from sims people abandon, in design terms
  rather than feature terms?
- Is there prior art we should study that we have not mentioned?
- What is the single most common mistake in this genre that we are currently
  walking into?

---

### Q5. Anomalies, without content

We want normal days interesting via small rule-generated irregularities — a tool
runs hot, a delivery is late, two people need the same thing. Never scripted.

- What makes an anomaly *readable* without a narrative voice?
- Individually authored (fixed pool chosen by sim state) or genuinely emergent?
- How do we generate interesting anomalies without a content designer?
- Risk: this becomes noise the player learns to ignore. How to avoid that?

---

### Q6. Decisions without dialogue

Player decisions are 2–3 concrete named options with visible costs, shown as text
in a report.

- How do we write options that feel like genuine tradeoffs rather than
  obviously-correct answers?
- How much should the game explain its reasoning — fully transparent, or partly
  opaque?
- Is text-only enough, or will it need supporting visuals to land emotionally?

---

### Q7. Relationships, kept cheap

Pairwise opinions surfacing as one-line report entries. No dialogue trees.

- Is that enough to create attachment, or does it read as decorative?
- What is the cheapest way to make a *specific named person* matter to a player
  who does not control them?
- Any failure modes to avoid?

---

### Q8. Morale, the need most likely to be built badly

Planned after hydration. Intent: derive from observable state (food security,
rest, workload, injuries) so it is always explainable; never a standalone mood.

- Right call, or is a partly-opaque morale more interesting?
- What is the common way morale systems fail?

---

### Q9. The pure-simulation rule — is it the right architecture?

Constraint: `src/sim` has no UI imports, is a pure function of state, runnable
headless, all randomness from one seeded stream, all state plain JSON.

- What does this rule cost in normal development? What breaks first?
- Is immutable state with events the right model, or would a mutable simulation
  with undo be more practical?
- Any concrete failure mode to design against now?

---

### Q10. Reporting architecture

Every meaningful change appends an event with cause IDs. Reports read the log and
never recompute.

- Does storing causality as event IDs scale, or become unreadable?
- How should a report be structured? What makes a good end-of-day summary for a
  game about eight people?
- What is the right amount of detail? Too little is opaque, too much is a wall.

---

### Q11. Determinism, honestly

We want reproducible runs so bugs can be diagnosed and replays compared.

- What do we give up by being fully deterministic? Any design options that
  depend on genuine unpredictability?
- Is a seed-based golden-run test suite worth building, or does it become a
  maintenance burden that gets abandoned?

---

### Q12. Phone-first UI

Target device is a phone browser. Panels only, no map.

- What is the information architecture for a many-panel game on a small screen?
- What belongs on the always-visible screen versus behind a tap?
- Is there a reason to allow desktop later, or should it be phone-only by design?

---

### Q13. What are we obviously missing?

Not "add more features" — features are not what this project needs.

- What question about the player's experience have we never asked?
- What system would deepen this game that we have not considered at all?
- What is a feature we would add if we were certain it was cheap?

---

### Q14. Challenge the gates

Our gates are feelings, not features: "watching them work is interesting",
"something can be lost and you felt it", "you want to play day 5".

- Are those the right gates? Any too vague to ever be honestly answered?
- Which gate is most likely to be faked by the developer?
- Is there a stage we skipped that should exist before Stage 2?

---

### Q15. What should we deliberately never build?

- What feature would be tempting, look impressive, and quietly damage the game?
- What would we regret in two years?
- If you were advising us to protect the original vision, what would you tell us
  to refuse?

---

### Q16–Q20. Your own questions

If you see a risk, a contradiction, or an unasked question, add it here.
Continue numbering from Q16.

---

## Part 10 — Environment

- Development on an **Android phone in Termux**. A desktop is currently
  unavailable.
- Played in the **phone browser** via a Vite dev server.
- Node and git installed. Git is local only — nothing pushed.
- **Code must stay in Termux home**, not shared storage: shared storage is a
  FUSE mount where `node_modules` is slow and file watching breaks.
- Documentation is mirrored to shared storage for reading on the phone. The
  mirror is a copy — edit the source, then sync.
- The developer is a **beginner/intermediate developer**. Explain unfamiliar
  tooling rather than assuming it.

---

## Part 11 — If you are helping build rather than review

- **Start at Stage 1**, exactly as specified in Part 5. It is small and
  deliberately so.
- **Respect the pure-simulation rule** in Part 4 without exception.
- **Critique whether a gate is genuinely met** rather than assuming it is. The
  greatest risk is advancing past a stage that is not yet fun.
- **Flag any suggestion that reintroduces parked features early.**
- **Propose improvements with written rationale.** Put speculative ideas in a
  clearly labelled parking lot rather than the active design.
- **Be direct.** A confident disagreement with a stated cost is far more useful
  than a polite non-answer. Nothing here is sacred — but nothing changes on a
  hunch either.

---

## Part 12 — One-paragraph summary

A slow, methodical, unglamorous build: a military base simulation where
autonomous people create understandable consequences, watched from above and
shaped by occasional meaningful choices. Planning is complete and the
architecture is settled. Implementation begins with a deliberately trivial
simulation that ticks, existing to prove one hypothesis — that watching a small
autonomous base is interesting — before any ambitious system is built on top of
it. The rule that governs everything: the simulation must never depend on the
UI.