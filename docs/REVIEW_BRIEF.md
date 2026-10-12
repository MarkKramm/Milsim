# Military Base Simulator — Complete Project Brief

**Everything about this project in one file.**

This is the single file to send another AI assistant. It is self-contained: no
other document needs to be read, and no prior conversation is assumed.

It has been reviewed externally once already. That review's findings, what we
accepted, and what we declined are recorded in **Part 12** — including the
points where the reviewer was right and the earlier version of this plan was
wrong.

---

## Contents

| Part | Subject |
|---|---|
| 1 | What this game is |
| 2 | Full history — everything that has happened |
| 3 | Current status |
| 4 | Design pillars and the core loop |
| 5 | The 20 original decisions and what was decided |
| 6 | Architecture |
| 7 | Roadmap with evidence-based gates |
| 8 | Long-term design |
| 9 | Why the ambitious systems are not built yet |
| 10 | Risks |
| 11 | **Open questions we want answered** |
| 12 | External review: what was accepted and what was declined |
| 13 | Environment and repo |
| 14 | How to help |

---

## Part 1 — What this game is

A living military base simulation. Personnel act autonomously, interconnected
systems create persistent consequences, and the player commands **by
exception** — setting policy, inspecting, and intervening only when a decision
matters.

The player never micromanages. They observe, understand why things happen, and
make a small number of meaningful choices.

**Tone:** calm, systemic, observational — with genuine stakes. Think Dwarf
Fortress or RimWorld in spirit, but far smaller in scope.

**Explicitly not:** a clicker, a micromanager, an optimisation puzzle, a combat
game, or an infinite sandbox.

The developer's original interest was in a base where personnel and equipment are
**deeply inspectable** — soldiers, weapons, gear condition, vehicles. That
interest is honoured in the long-term design, but deliberately late.

---

## Part 2 — Full history

Everything that has happened, in order. This part exists because the previous
version of this brief compressed history into a few bullets and reviewers
correctly reported that it gave them no sense of what had actually taken place.

### 2.1 The original planning pack

Before this planning phase, a set of planning documents was produced by an
earlier assistant. It was explicitly scoped as planning-only, with no code. It
contained: a master prompt, game vision, core loop, prototype spec, foundation
decisions, implementation stages, and open questions.

That pack's full text is preserved in `docs/ORIGINAL_PLANNING_PACK.md`.

**Its stated scope boundary was strict.** It instructed itself not to write
code, run builds, design weapon catalogues, design campaigns or raids in
detail, or force a framework choice. It followed that boundary, and its
discipline was genuinely good.

**What it got right:** the vision, the autonomy-first principle, the idea that
reports must summarise recorded events rather than invent causes, and the
insistence on protecting scope.

### 2.2 The audit

That pack was then audited. The finding: **it described a simulation rather than
a game.**

Specifically, it had, by design:

- **No stakes.** Nothing bad could happen permanently. If a soldier starved,
  nothing was lost — hunger was a number that wiggles.
- **No goal.** No reason to want Tuesday instead of Monday.
- **No failure.** No way to lose.

A simulation where nothing can be lost is a screensaver you are permitted to
press stop on.

Two further gaps were identified:

- **Player agency reduced to sliders.** The stated player actions were setting
  priorities and allocating resources. Sliders are the weakest form of agency
  in a simulation game, because the player cannot predict the effect and
  therefore never feels responsible for the outcome.
- **The "boring day" question was asked and never answered.** The original pack
  listed "what makes a normal day interesting when nothing dramatic happens?" as
  an open question — which is 95% of what the player would ever see.

The pack was judged good in quality and incomplete in coverage. It was **not**
sent back for a rewrite.

### 2.3 The decision round

Twenty design decisions were put to the developer with a marked recommendation
for each, on the assumption that approval-by-recommendation was acceptable and
that anything disagreed with would be flagged.

The developer approved nearly every recommendation, and in several places said
"up to you."

They also **asked for more**: hydration, morale, injuries, a factory/production
layer, engines, vehicles, relationships, achievements, secrets, a larger
roadmap, and a stronger architectural foundation — and explicitly asked not to
build Stage 1 and 2 as throwaway minimums, but to establish something strong
immediately.

They also asked for the project to be documented well enough that **another
agent could continue it** if interrupted. That request produced the checkpoint
file and the working agreement.

### 2.4 The response to that request

Accepted in full, with one documented exception.

**Agreed:** all the requested systems were designed on paper — needs ladder,
injuries, production chains, engines, fuel, vehicles, relationships, secrets,
achievements — plus a complete architecture and a full roadmap, all written
before any code.

**Declined, with reasons in Part 9:** building those systems *first*. The
reasoning is that in a simulation, the interesting systems cannot be designed
until the boring ones are proven interesting, and nobody has yet confirmed that
watching six people eat, rest, and work is entertaining.

**A nuance discovered later:** the developer's request was partly about the
*architecture*, not the gameplay. That part was agreed to fully — the pure
simulation module, seeded RNG, JSON state, and event log are not throwaways and
are built to from the first commit. Only the gameplay systems follow the gates.

### 2.5 A correction to the record

During the decision round, the documents began calling decisions "locked."

An external review later challenged this, correctly: the developer approved most
of them **by trusting the recommendation wholesale, not by examining each one
individually.** Calling them locked overstated the level of genuine agreement.

The terminology was changed to **settled**, with an explicit note that any of
them can be revisited at any time. See Part 5.

### 2.6 Tooling and environment problems solved

- The project was originally extracted into Termux's private directory, which
  Android's scoped storage hides from every other app — so no editor could open
  the files. Moved to shared storage for reading.
- A permanent split was then adopted: **documentation mirrored to shared
  storage** for phone reading, **code kept in Termux home** where `node_modules`
  is fast and file watching works. Shared storage is a FUSE mount where a dev
  server behaves badly.
- A git repository was initialised locally. Nothing is pushed anywhere.

### 2.7 The first external review

The consolidated brief was sent to another AI assistant, which returned a
long, largely favourable review. It answered all twenty questions, challenged
twelve decisions, and identified several genuine design errors.

**It was right about several things**, including two errors in the earlier plan.
Those corrections are now part of the design and are recorded in Part 12.

It recommended **not starting Stage 1** until the original documents were
audited and four design questions were settled. That recommendation was
declined, for reasons also in Part 12.

---

## Part 3 — Current status

| | |
|---|---|
| **Phase** | Planning complete, implementation not started |
| **Code written** | None. Only empty directories and a `.gitignore` |
| **Git** | Local commits only. Nothing pushed |
| **External reviews** | One received and acted upon |
| **Next action** | Stage 1 — a simulation that ticks |
| **Blocked on** | Nothing |

---

## Part 4 — Design pillars and the core loop

### Pillars

1. **Autonomy first** — personnel have useful default behaviour and operate
   without constant orders.
2. **Readable simulation** — the player can discover what each person is doing,
   what they need, and why a task was delayed or failed.
3. **Depth through interaction** — a few connected systems beat many
   disconnected features.
4. **Persistent world** — people, equipment, and stockpiles retain state.
5. **Stories from simulation** — reports summarise events that actually
   happened; they never invent causes the simulation did not track.
6. **Expandable content** — later systems extend established rules.

### The loop

1. **Observe** — personnel, queues, needs, supplies, problems.
2. **Set policy** — a small number of priorities or assignments.
3. **Simulate** — personnel act on needs, duties, resources, conditions.
4. **Resolve interactions** — jobs consume and produce; shortages propagate.
5. **Decide** — resolve one queued situation with named options.
6. **Explain** — the timeline and report show what happened and why.
7. **Adjust** — change policy, observe the next period.

The chain must arise from implemented rules, never from a scripted story.

**Example chain:** a worker is assigned to maintenance → that occupies them →
a delivery is late → food production drops → a meal slot is missed → someone's
schedule shifts → the report records the actual chain and the state changes.

---

## Part 5 — Decisions

### 5.1 What "settled" means

These decisions reflect a real recommendation that was accepted in good faith.
They have **not** all been individually examined and confirmed. Any can be
revisited, and changing one now is far cheaper than after it is built.

### 5.2 The twelve operative decisions

1. **Stakes — readiness spine.** Readiness is a **derived summary**, recomputed
   each tick from observable state and never an input to any other system. It
   only summarises and reports, and always displays why it moved.
   Consequences are **graduated**: warning → reduced effectiveness → declines
   demanding work → refuses optional assignments → *then* leaves.
   **Legitimate rest is not idleness** — readiness does not fall while someone
   is recovering from work.
2. **Agency — named-option decisions.** A few times a day, a concrete situation
   with 2–3 named options. Each option protects a different priority, and each
   has a credible benefit and a credible cost. They queue in the report and
   rarely interrupt.
3. **Player intent is a design concept, not a UI control.** Intent is
   first-class simulation data. The interface is only one way to set it. An
   intent whose effect cannot be observed is a dead control.
4. **Normal days — hybrid anomalies.** Authored anomaly *rules*, gated by
   simulation eligibility, selected by seeded RNG, with consequences recorded.
   An anomaly must change a decision, reveal a risk, create a story, or inform —
   never merely make the log look busy.
5. **Pacing — ~3 real minutes per in-game day.** 1 tick = 1 in-game minute;
   1440 ticks/day; 8 ticks/sec at 1×. Speeds: pause / 1× / 4× / 16×.
   **Simulation rate is decoupled from render rate** — eight ticks per second
   does not mean eight UI repaints per second.
6. **Abstract time display.** "Day 3 — Afternoon". No live clock.
7. **No dithering — hysteresis.** Workers finish or explicitly abandon a task;
   abandoning forfeits progress.
8. **Pressure — time-based first,** drifting toward people-based. Raids and war
   deferred.
9. **Stack — TypeScript + Vite + React,** played in a phone browser. The
   developer already runs this exact stack.
10. **Save/load early, via constraint.** The entire state must be plain
    JSON-serializable from the start; the save UI waits for Stage 3.
11. **Layout — panels only.** No grid, no map, no spatial navigation.
12. **No deadline.** Ordering enforced by gates, not dates.

### 5.3 Scope is sequenced, not banned

| Feature | Status | Unlocks after |
|---|---|---|
| Combat, raids, enemy AI | parked | core loop proven fun |
| Vehicles, fuel | parked | factory layer works |
| Weapon customization | parked | equipment condition exists |
| Faction warfare, campaigns | parked | first base is enjoyable |
| Pathfinding | parked | grid is proven necessary |
| Animation, 3D | parked | text UI fails to convey state |
| Recruitment, hiring, skill trees | parked | people decline or leave |
| Detailed equipment inspection | parked | underlying data matters |

---

## Part 6 — Architecture

### 6.1 The rule that governs everything

> **The simulation contains no UI code.** `src/sim/**` must not import React or
> the DOM. If a React component contains a rule about how the world works, that
> is a bug.

Enforced by a headless runner that executes N ticks with no browser. It must
keep working forever. If it ever has to be stubbed to make a feature work, the
architecture has broken — fix that first.

### 6.2 Layering

```
UI (React)          reads state, sends commands. No rules, no randomness.
Controller          owns the clock, speed, pause, command dispatch
Simulation (pure)   state → state + events. Deterministic given a seed.
```

Dependencies point downward only.

### 6.3 State

One authoritative object. **Plain JSON only** — no classes, functions, `Map`,
`Set`, or `Date`. This constraint is what makes saves cheap.

### 6.4 Tick order

Fixed and deterministic:

1. Advance clock
2. Apply queued player decisions
3. Apply player intent to priority resolution
4. Update needs
5. Update facilities and equipment
6. Run job selection (with hysteresis)
7. Advance in-progress job progress
8. Apply resource consumption and production
9. Recompute readiness as a derived summary
10. Emit events for anything notable
11. Check for new decisions or interrupts

**The order itself introduces biases and must be tested, not assumed.** Two
cases to cover from day one: resource consumption vs. delivery arrival, and
need updates vs. job selection.

### 6.5 Randomness

One seeded stream, one function. Never `Math.random()` in simulation. The UI
never draws from the simulation stream — rendering must not shift the random
sequence or replay breaks. The seed is displayed so runs can be reproduced.

### 6.6 Events, tiers, and reports

Every meaningful change appends an event with subject IDs and cause event IDs.
**Reports read the log and never recompute**, which makes "the report is
accurate" true by construction.

Every event carries a significance tier:

| Tier | Example | In the report? |
|---|---|---|
| `routine` | "hunger rose by 0.2" | Never shown |
| `notable` | "Bakary completed the repair" | Summarised |
| `critical` | "Amina collapsed during the repair" | Prominent, with causes |

The rule: *a person becoming slightly more tired is not a report entry; a person
becoming too exhausted to finish a critical repair is.*

Reports work in three layers — **current state**, **notable events**, and
**causal explanation** — and only the third is expensive, built for `notable`
and `critical` events only.

**Do not build an event-sourcing framework.** A typed append-only list with
causal references is enough. Needing a framework is a signal the design has
outgrown its own log.

### 6.7 Decisions as data

A pending decision has options, cause event IDs, and a `blocking` flag (true
only for rare interrupts). A headless script can answer them programmatically —
which is how decision balance gets tuned without a human in the loop.

### 6.8 Testing, in priority order

1. **Invariant tests — the primary suite.** No negative resources, no infinite
   loops, nobody starves while food is in storage, readiness never falls during
   legitimate rest, nobody holds two jobs at once. These survive balance changes.
2. **Headless smoke test.**
3. **Tick-order bias tests** for the two named cases.
4. **Golden runs — deliberately small.** A few seeds producing a short digest, not
   a full transcript. Large golden files break on every inconsequential change and
   get abandoned.

Invariant tests first, golden runs second. Exact-output testing is a maintenance
trap in a game whose balance is expected to change constantly.

---

## Part 7 — Roadmap

Each stage has a **gate** and now requires **observable evidence** to pass. You
cannot pass a gate by completing the feature list.

For each gameplay stage, you must be able to say yes to **at least three** of
these four:

1. You can explain what happened **without reading the source code.**
2. You noticed something **before** the report told you.
3. A decision **visibly changed** what happened next.
4. You **continued past novelty** wearing off.

| Stage | Content | Gate | Evidence |
|---|---|---|---|
| 0 | Planning documents | ✅ Complete | — |
| 1 | Tick loop, seeded RNG, clock, minimal UI, headless runner. **No people, jobs, or needs.** | Numbers move and you understand them | **Technical only** |
| 2 | 6–8 people, 3 jobs, autonomous selection with visible reasons | **Watching them work is interesting** | 3 of 4 |
| 3 | Hunger + fatigue, supply interaction, readiness spine, save/load | **Something can be lost, and you felt it** | 3 of 4 |
| 4 | Named-option decisions, report, timeline, debug view, relationships | You made a choice and understood its effect | 3 of 4 |
| 5 | Anomalies, run history, secrets, achievements | **You want to play day 5** | 3 of 4 |
| 6 | Exactly one expansion layer, chosen by evidence | Chosen by what Stage 5 revealed | — |
| 7 | Production layer: engines, fuel, workshop, supply chain | The bottleneck is people, not throughput | — |
| 8 | External layer: vehicles, operations | Parked | — |

**Stage 2 is the easiest gate to fake** — six people working is cute, and
cuteness feels like fun. The honest test is evidence item 4.

**Stage 1 has a technical gate only.** A clock and changing numbers cannot prove
that watching personnel is fun, because there are no personnel. That is
deliberate, not a gap.

---

## Part 8 — Long-term design

Fully designed, deliberately not built.

**Needs ladder.** Hunger and fatigue first. Hydration adds a supply line rather
than a number. Morale is derived from observable state so it is always
explainable — and must contribute something hunger and fatigue do not already
represent. Injuries are individual, persistent, and caused by the player's own
choices rather than random punishment.

**Production layer.** Engines consume fuel and wear out. A workshop consumes raw
materials. Repair versus manufacture is a real tradeoff. Deliveries arrive on an
imperfect schedule — late, partial, occasionally wrong — generated by rules.
Storage capacity forces decisions. **Work leaves persistent results:** a
completed repair changes the actual condition of a specific item.

The design intent: a small production system whose bottlenecks are *people*.
The trap: the moment players solve it as a throughput puzzle, the game has
changed genre.

**Vehicles.** Consume fuel, need maintenance, need a driver, and can leave and
not come back. The natural bridge to the external layer.

**Relationships.** A value per pair, surfacing one line in the report. No
dialogue trees. **Must have at least one observable consequence** — two people
who repeatedly work together cooperate better, or coordinate worse — or the
feature is decorative.

**Making a named person matter.** A record of what they contributed, what
problems they faced, who they work with, and what the base would lose without
them. No portraits, no personality simulation, no dialogue.

**Continuity after loss.** Permanent run history, secrets, achievements — so a
collapsed base is still worth something and the game is replayable.

**Commitments and preparation.** Something to prepare *for*, without constant
emergencies. A candidate answer to the long-term-purpose question.

**External layer.** Parked indefinitely. Its purpose: make accumulated state
matter.

---

## Part 9 — Why the ambitious systems are not built yet

The developer asked for the factory layer, engines, vehicles, morale, injuries,
relationships, achievements and secrets to be built upfront. All are designed.
They are sequenced rather than built first, for one reason:

> In a simulation, the interesting systems cannot be designed until the boring
> ones are proven interesting. Nobody has yet confirmed that watching six people
> eat, rest, and work is entertaining. The factory layer would be designed
> around an unverified assumption and would very likely be rebuilt once the base
> simulation revealed its actual feel.

**The compromise accepted:** the architecture is fully designed now and built to
from the first commit. The pure simulation rule, seeded RNG, JSON state, event
tiers, and intent layer are not throwaways. Only the *gameplay systems* follow
the gates.

**A secondary reason:** Stage 1 is a clock and some numbers. It cannot be
invalidated by a design change later, so there is nothing to gain by waiting.

---

## Part 10 — Risks

1. **Watching may not be fun without pressure** — fatal if unaddressed.
2. **The player may be informed but not responsible.** Showing someone a report
   does not make them feel ownership. This was identified externally and is
   arguably the deepest risk in the design.
3. **Drift is the most likely failure mode.** No deadline means months can go
   into systems that were never played. Gates are the defense — and gates
   written as feelings are easy to fake, which is why they now require evidence.
4. **The production layer could swallow the game's identity**, turning a people
   simulator into a throughput puzzle.
5. **Morale is easy to build badly** — either redundant with existing needs, or
   an unexplainable mood bar.
6. **Readiness may add nothing** if it merely restates hunger and fatigue.
7. **Too many needs dilute each other.**
8. **Deciding fun by assumption.**

---

## Part 11 — Open questions

Ten questions, ranked. Answer as many as you can, starting from Q16.

### Q16. What is the long-term purpose? — *the most important open question*

Nothing defines what a successful run looks like. Without it, Day 5 is only
worth reaching because it exists.

Candidates: keep an outpost operational through a hard period; restore a
neglected base; prepare for an assignment; fulfil recurring commitments; build
and improve; deliberately unstructured emergent survival.

**We are deliberately not answering this yet** — the right answer depends on how
the base simulation actually feels, which nobody knows. Due before Stage 5.

### Q17. How does the player express intent?

Partially answered: intent is first-class data. Still open — which intent types
first (priority, reserve, policy)? How many before the player stops reading
them? Can intents contradict, and how is that resolved?

### Q18. What happens when the player faces an unfixable problem?

A good simulation sometimes forces an unwinnable position. Without warning,
response, or room to recover, that feels unfair rather than demanding.

The player should understand what went wrong, what capability remains, which
options reduce damage, and which consequences are already unavoidable. Not every
bad outcome must be preventable — the test is whether the player can **learn**.

How much warning is too much? A game that always warns has no tension.

### Q19. How does the game avoid repeating itself?

Ten state-dependent events may beat a hundred unrelated ones. What is the honest
maximum run length before repetition becomes painful?

### Q20. What should we refuse to build, ever?

Nominated traps: stats that never change a decision; micromanaging routines;
disasters with no traceable cause; production chains that make people
interchangeable; endless content compensating for a weak core; polish before the
simulation is engaging.

And one genuine temptation here: **detailed equipment inspection.** That was the
developer's original interest, and a screen showing every weapon component is not
automatically fun. Equipment detail should matter because it affects
reliability, logistics, or a specific person's story.

### Q21. Is readiness adding anything, or just duplicating hunger and fatigue?

Now that it is a derived summary, the sharper question applies. If it is computed
from hunger, fatigue, and workload, what does it tell the player that those
three do not? If the honest answer is "not much", it should be cut.

### Q22. How should rest be distinguished from idleness?

Accepted as a correction, but the mechanism is open: does current activity
determine it? Is there a cost to resting when the base needs you? Can the player
farm good outcomes by deliberate rest — and is that interesting?

### Q23. What makes someone leave, versus merely unhappy?

The consequence ladder replaced instant quitting. Open: what severity is right
for sustained neglect? Is anyone ever unrecoverably lost, or can the base always
rebuild its staff? Should a departure be permanent?

### Q24. How many distinct intents before the player stops reading them?

The intent layer risks recreating the slider problem in a new place. Is there a
natural ceiling? Should some intents have defaults? How do we surface "your
intent is being ignored" without punishing normal play?

### Q25. What is the first prototype's single most important question?

We have always asked *"is watching an autonomous base interesting?"* External
review proposed a sharper version:

> Can the player anticipate a problem, make a meaningful intervention, and later
> recognise the consequences of that intervention?

Is that the better question for Stage 2? Is it answerable at Stage 2's scale,
or does it need the decision system from Stage 4? If only answerable at Stage 4,
should Stages 2 and 3 merge?

**Add your own questions as Q26+** if you see something we have missed.

---

## Part 12 — The external review

One review has been received. Full record in `docs/REVIEW_REPLIES.md`.

**Its verdict:** *"The foundation is strong. The game design is not fully
proven."*

### 12.1 What it got right that we had not

Two of its observations improved the plan more than anything we had produced:

1. **Our gates were the weakest part of our own plan.** We wrote them in the
   language of feelings and never asked how they could be lied to. Now every
   gameplay gate requires four observable evidence items, of which three must
   hold.

2. **"Informed" is not "responsible."** The original plan assumed showing
   someone a report would make them feel ownership. It does not.

### 12.2 Errors of ours it caught

| Error | Correction |
|---|---|
| Readiness penalised **all** idleness, including necessary rest | Legitimate rest is explicitly separated from unproductive idleness |
| Readiness was a **magic meter** drifting on its own | Recomputed each tick from observable state; never an input; always shows its contributors |
| Zero readiness meant an **immediate irreversible departure** | Graduated ladder: warning → reduced effectiveness → declines demanding work → refuses assignments → *then* leaves |
| Player intent existed **only as UI sliders** | Intent is now first-class simulation data with its own section in the architecture |
| Anomalies were "generated, not scripted" with no control strategy | Hybrid: authored rules, sim-gated eligibility, seeded selection, recorded consequences |
| Events were "meaningful changes" with no significance model | Three tiers, assigned by explicit rule |
| Testing led with golden runs | Invariant tests lead; golden runs small and few |
| Render rate implicitly matched tick rate | Decoupled; the UI coalesces ticks |
| Tick order treated as obviously correct | Explicitly a source of bias, with named tests |
| Decisions were called "locked" though approved by trust | Renamed "settled," with an explicit revisitable note |

### 12.3 What it proposed that we accepted but have not scheduled

Five mechanics, recorded for later evaluation. None blocks any stage:

1. **Bottlenecks that create stories** — a shortage affects *specific* people and
   jobs, not a total. One missing part delays a repair; the delay forces a
   choice. Deep without adding combat, maps, or graphics.
2. **Personnel identity and history** — so attachment forms without control.
3. **Work leaving persistent results** — a repair changes a real item's condition.
   This is what makes the production layer honest rather than decorative.
4. **Commitments and preparation** — now a candidate answer to Q16.
5. **A useful inspection interface** — deferred, but aligned with the
   developer's original interest. Build after the underlying data matters.

Its own preference was to explore 1–3 before committing to 4–5. We agree.

### 12.4 What it recommended that we declined

| Recommendation | Our response |
|---|---|
| **Don't start Stage 1 yet; audit the original documents first.** | **Declined.** A document audit before implementation is exactly the drift the gates prevent. Stage 1 has no people, no decisions, no mechanics — a clock and some numbers. It cannot be invalidated by a later design change. The original documents are preserved in full for any reviewer who wants them. |
| **Settle four design questions before Stage 1.** | **Declined as a blocker.** All four are recorded (Q16–Q19). None affects Stage 1, which has no personnel to fail, no decisions to make, and no morale. They are Stage 3 and Stage 5 questions. |
| **"Locked" should be treated as an unverified claim.** | **Accepted.** See §2.5 and §5.1. |

### 12.5 Our reasoning, stated plainly

The review's conclusion was: *"Don't start Stage 1 just yet… let's make sure
we're building your dream game."*

Our answer: the goal is right and the timing is wrong. **The dream game is not
specified anywhere — it does not exist yet.** No amount of document review will
produce it. It exists only once someone has watched a base run and decided
whether it moved them. Stage 1 is the cheapest possible step toward that, and
delaying it is the one action guaranteed to delay learning.

---

## Part 13 — Environment and repository

- Development on an **Android phone in Termux**. A desktop is currently
  unavailable.
- Played in the **phone browser** via a Vite dev server.
- Node and git installed. Git is local only — **nothing pushed, no backup
  off-device.**
- **Code must stay in Termux home**, not shared storage: shared storage is a
  FUSE mount where `node_modules` is slow and file watching breaks.
- Documentation is mirrored to shared storage for phone reading. The mirror is a
  copy — edit the source, then sync.
- The developer is a **beginner/intermediate developer**. Explain unfamiliar
  tooling rather than assuming it.

---

## Part 14 — How to help

**If reviewing the design:** answer Part 11. Be direct — a confident
disagreement with a stated cost is far more useful than a polite non-answer.
Nothing here is sacred, but nothing changes on a hunch either.

**If building:** start at Stage 1 exactly as specified in Part 7. It is small and
deliberately so. Respect the pure-simulation rule without exception. Flag any
suggestion that reintroduces parked features early. Propose improvements with
written rationale, and put speculative ideas in a clearly labelled parking lot.

**Two things worth knowing:**

- The developer's biggest documented fear is building a technically impressive
  simulator that is boring to play. Every judgement should serve that concern.
- The developer has previously been handed plans and approved them on trust
  rather than item by item. That is fine, but it means **no plan has yet been
  genuinely stress-tested by the person it is for.** If you see something they
  would not have noticed, say so plainly rather than deferring to the existing
  design.