# Roadmap

Build order for the whole game. **No deadlines** (D19) — ordering is enforced by
**gates** instead.

## How to read this

A stage is **done** when its exit gate is met. The gate is a *feeling or an
observation*, not a feature list. You cannot pass a gate by writing more code.

If a gate fails, the response is to **fix or simplify that stage** — not to
build the next one. Most passion projects fail by advancing past a stage that
wasn't actually fun yet.

| | Stage | Gate to pass | Evidence required |
|---|---|---|---|
| 0 | Foundation *(complete)* | *(documents)* | — |
| 1 | State advances | The numbers move and you understand them | **Technical only** |
| 2 | Autonomous jobs and first intent | **Watching them work is interesting**, and one priority visibly changed what happened | 3 of 4 |
| 3 | Needs and consequence | **Something can be lost, and you felt it** | 3 of 4 |
| 4 | Decisions and reports | **You made a choice and understood its effect** | 3 of 4 |
| 5 | Reasons to continue | **You want to play day 5** | 3 of 4 |
| 6 | Evidence review | *a decision, not a build* | — |
| 7 | Equipment and logistics **(guaranteed)** | The base is a world of **specific things**, not totals | — |
| 8 | Production and workshop | The bottleneck is **people**, not throughput | — |
| 9 | Vehicles | A dispatched vehicle can leave and not return | — |
| 10 | External operations *(parked)* | An external threat is meaningful rather than arbitrary | — |

**Stage 7 is guaranteed.** Equipment and loadouts are a settled milestone (D21),
not a candidate — the project must not quietly become a generic colony sim.

**Stages 8–10 are candidates, not commitments.** They depend on evidence from
Stage 5 and may be reordered, merged, or dropped.

### Gates must test what the stage can actually answer

An earlier version of this roadmap applied one set of criteria to every stage,
which produced a contradiction: Stage 2's gate demanded evidence that a decision
changed the outcome, but the decision system did not arrive until Stage 4. A gate
asking for something the stage cannot produce is not a gate — it is a delay.

So each stage below states **the question it can answer at its own scale**, and
the gameplay gates (2–5) use the four evidence items in §Gate evidence.

### Gate evidence — added after external review

**The criticism that prompted this section:** the original gates were written as
feelings, and a developer can convince themselves a feature is fun simply
because it took effort to build it. A gate written only as a feeling is a gate
that can be lied to.

So each gameplay gate now requires **observable evidence**. You do not pass a
gate by finishing the feature list.

For the current stage, you must be able to say yes to **at least three** of these
four:

1. **You can explain what happened without reading the source code.** If you
   have to open the code to know why something occurred, the simulation is not
   yet legible — and legibility is most of what makes this genre work.
2. **You noticed something before the report told you.** The player noticed on
   their own. If everything interesting arrives only in the daily summary, the
   game is a log reader.
3. **A decision visibly changed what happened next.** Not "the number went up"
   but "this person was somewhere else because of what I chose."
4. **You continued past the point where novelty wore off.** The strongest and
   hardest item. Play until it stops being new, and check whether you were
   still looking.

**Which gate is easiest to fake:** Stage 2. Six people working is cute, and
cuteness feels like fun. The honest test is item 4 — play a fourth and fifth
day without novelty, and notice whether you are still watching.

**Note on Stage 1:** a clock and changing numbers can prove the simulation
*works*, but cannot prove that watching personnel is fun, because there are no
personnel yet. Stage 1 has a technical gate only. The first genuine gameplay
gate is Stage 2. This is deliberate and is not a gap.

---

## Stage 0 — Foundation (complete)

- Vision, core loop, prototype spec.
- Audit and recommendations.
- 20 design decisions answered and locked.
- Long-term design, architecture, and this roadmap written up.

**Gate:** the whole game can be described without ambiguity. ✅
**Exit:** start Stage 1.

---

## Stage 1 — State advances

**Build:**
- Project scaffold: Vite + TS + React, running in the Termux browser.
- `src/sim` with state shape, tick loop, and seeded RNG.
- Fixed tick order.
- `tools/headless.ts` — run N ticks with no UI. **The architecture smoke test.**
- Minimal UI: one panel showing live numbers.
- Pause, 1×, 4×, 16×.

**No people, no jobs, no needs yet.** Just a clock and numbers.

**Gate:** you watch the clock advance and the numbers move, and you
understand them. Nothing more.

*Technical gate only — see §Gate evidence. Stage 1 cannot test gameplay
because it contains no people.*

**Why so empty:** it validates the time model (D4) in one evening. If 3 minutes
per day feels wrong, you find out now, not after a month of building.

### The Stage 1 contract

*Added after the third external review, which correctly observed that "build a
clock and some numbers" leaves every implementation detail to be invented during
implementation — which is how the same decision gets made two incompatible ways
in two files.*

Questions that must be answered before the first commit, with their answers:

| Question | Decision |
|---|---|
| Initial tick | **0.** The run begins at the start of Day 1. |
| Displayed day | **`floor(tick / 1440) + 1`.** Tick 0 shows "Day 1". There is no Day 0 — a run has no day before it begins. |
| First displayed period | **Night.** A day starts at 00:00, which is night. |
| Period boundaries | Night 0–5, Morning 6–11, Afternoon 12–17, Evening 18–23, by minute-of-day. Abstract only — never a clock. |
| Day rollover event | Emitted **immediately after the clock advances**, before commands are applied: if the new `tick > 0 && tick % 1440 === 0`, append a tier `routine` event, data `{ day }`. Tick 0 does **not** emit one — it is the start of Day 1, not the completion of a day. |
| Values shown in the UI | Day + period, tick, seed, `rngCursor`, elapsed in-game minutes, events appended this tick, log length. All read-only. |
| What makes them move | Tick advances → day/period derive. Cursor advances only via `rand()`. Stage 1 emits no randomness by design, so the cursor should stay at 0 — **that is the correct behaviour, not a bug.** |
| RNG algorithm | **Mulberry32**, 32-bit, seeded from `seed`. Chosen for being 5 lines, well-distributed, and trivially portable — the property that matters, since replay compatibility is permanent. |
| Seed representation | A 32-bit unsigned integer. Displayed as decimal. Default `20260101` (readable, and not a magic constant anyone will confuse for a real date). |
| Where commands live | `state.pendingCommands[]` **only**, and nowhere else. `enqueue(state, cmd)` appends by returning a new state; `tick(state)` takes **no** commands parameter and drains the queue at tick step 2. Corrected after a Stage 1 plan review: an earlier version had commands arriving as a parameter *and* living in the queue, which would have applied them twice. The queue is persisted with state, so a saved run resumes with unissued orders intact. |
| Event log | Single copy in `state.log`; `tick()` returns the new state, not a separate array. See `ARCHITECTURE.md` §4.0. |
| Background throttling | Browsers freeze `setInterval` in background tabs, so the simulation is driven by **accumulated wall-clock time**, never by counting callbacks. The rule: **never discard accumulated time.** A per-frame cap on how many ticks execute limits a burst without losing the backlog — the remainder stays queued and drains on later frames. Clamping the measured elapsed time, by contrast, *is* loss and is forbidden. Auto-pausing on `visibilitychange` is an optional UI affordance, not a correctness requirement. |
| Pause and backlog | **Pause runs zero ticks and freezes the accumulator.** Three quantities are distinct and must not be confused: **elapsed while running** accrues normally; **elapsed while paused** is discarded and never becomes debt; **backlog already owed** is retained across the pause, neither discarded nor doubled. On resume the frame baseline is reset, so the pause gap is never replayed, and any retained backlog drains at the per-frame cap rather than firing at once. *(Clarified after a second plan review, which correctly identified that "never discard accumulated time" and "retain the accumulator while paused" read as compatible when they are not — a pause that kept accruing would turn ten paused minutes into a ten-minute instant jump on resume.)* |

**The throttling decision matters more than it looks.** A naive
`setInterval` loop produces *fewer* ticks after a background suspension, and a
naive fix (`catch up` in a loop) can produce a burst that stalls the phone. The
rule is: the controller accumulates real elapsed time and advances the
simulation by whole ticks, capped at a bounded catch-up per frame.

---

## Stage 2 — Autonomous jobs and first intent

**Build:**
- 6–8 personnel with IDs, names, and duties.
- 3 jobs with eligibility, duration, prerequisites, outputs.
- Autonomous task selection: needs → duties → availability → **player intent**.
- Hysteresis (D6): finish or abandon, abandoning costs progress.
- Deterministic tie-breaking.
- **One simple player intent:** a priority order between two competing kinds of
  work. That is the entire command surface at this stage.
- UI: roster showing each person's current task **and the reason they chose
  it**.

**Gate:** **watching them work is interesting, and one priority setting visibly
changed what happened.**

**Why the intent is here and not Stage 4** *(corrected after the second external
review, which caught a real contradiction):* the previous gate for this stage
demanded evidence that "a decision visibly changed what happened next", but the
named-option decision system did not arrive until Stage 4. The gate asked for
something the stage could not produce.

The fix keeps the test and makes it answerable. A single priority setting is
enough to ask the real question at Stage 2's scale: **does expressing intent
change autonomous behaviour in a way the player can observe?** Named-option
decisions remain a Stage 4 concern, and Stage 4's gate tests the harder version
of the same question.

**This is the first genuine gameplay gate, and the easiest one to fake.** Six
people working is cute, and cuteness feels like fun. The honest test is evidence
item 4 — play a fourth and fifth day without novelty, and notice whether you are
still watching.

### The Stage 2 reference scenario

*Added after the third external review. A feature list does not guarantee the
experiment happens: if the starting conditions never create a conflict, the
priority control looks useless even when correctly implemented. Conversely, if
one priority always wins, no real trade-off was tested. This is the fixture that
makes the gate meaningful.*

Fixed starting conditions — deliberately small and reproducible:

| Element | Setup | Why |
|---|---|---|
| Personnel | 7: 3 generalists, 2 maintenance-capable, 2 supply-capable | Small enough to read on a phone |
| Jobs | **Maintenance**, **Meal preparation**, **Standby** | Two competing kinds of work, plus a fallback |
| Facilities | 1 workshop (capacity 2), 1 kitchen (capacity 2) | Capacity is what creates contention |
| Initial priority | **Balanced** | The neutral baseline both other settings must beat |
| Duration | Maintenance 90 min, meal 30 min | Long enough to see a job span multiple ticks of visible state |

**The conflict must be real.** With 7 people and 2+2 capacity there is *never*
labour shortage — so the test needs demand above capacity, not below it. Two
conditions must hold:

1. **Both priority settings change observable behaviour.** Setting
   "Maintenance first" must visibly starve meal preparation on at least one
   in-game day, and "Meals first" must visibly defer maintenance.
2. **Neither setting is strictly dominant.** If one order wins every day, the
   fixture is broken and must be adjusted before the gate is attempted.

**What the interface must show:** for each person, the job they chose *and the
reason*. A person who picks maintenance while meals go unattended is the whole
point of the test — the player can only judge autonomy if they can see the
reasoning, not just the outcome.

**Questions passed forward:**
- Is the "reason they chose it" explanation enough to make behaviour legible?
- Does one priority setting feel meaningful, or obviously insufficient?
- Does hysteresis work, or do people still dither?

This is the first real test of the game's core hypothesis. If it fails here,
nothing later will rescue the project, so it is worth playing honestly.

---

## Stage 3 — Needs and consequence

**Build:**
- Hunger and fatigue (hydration and morale come later).
- Food consumption and one maintenance-supply interaction.
- **Readiness** as a derived explanatory summary (D1) — never causal.
- The graduated consequence ladder, triggered by underlying conditions.
- Resource contention changing outcomes.
- Save/load — cheap now, because of the serialization constraint (D15).
- Player-set goals tracked by the report.

**Gate:** **something can be lost, and you felt it lose it.** Losing a person
should sting.

**Also tested here:** whether the player could *recover* from an early mistake.
Not every failure must be prevented, but a player who makes a bad call and
cannot undo it will conclude the game is arbitrary. This is external review
question Q18, and it is first answerable at this stage.

**Explicitly provisional:** the severity and permanence of loss. Whether a
departure is final, whether the base can always rebuild staff, and how much
warning precedes it are all **open**, to be decided by watching several runs
(`OPEN_QUESTIONS.md` Q23). The ladder exists; the top of it is not yet set.

**Questions passed forward:**
- Does readiness add information beyond hunger and fatigue, or should it be
  cut? (Q21)
- Was any loss avoidable, or did it feel arbitrary? (Q18)

---

## Stage 4 — Decisions and reports

**Build:**
- Named-option decisions (D2), queued in the report.
- **Intent expanded** from one priority setting into a small set: priorities,
  reserves, and policies.
- Rare blocking interrupts (D16), ~1 per in-game day maximum.
- Event timeline and end-of-day report, reading the log without recomputing.
- Debug view + "copy run as JSON".
- Relationships, minimal: pair values surfacing as report lines.

**Gate:** **you made a choice and understood its effect.** You can point at the
report and say why things happened.

This stage tests the *harder* version of the question Stage 2 asked. Stage 2
asked whether a priority changes behaviour; Stage 4 asks whether a meaningful
tradeoff, chosen under uncertainty, produces consequences you can trace.

**Questions passed forward:**
- How many distinct intents can exist before the player stops reading them? (Q24)
- Do relationships produce any observable effect, or are they decorative?

---

## Stage 5 — Reasons to continue

**Build:**
- Several consecutive days played through.
- Anomalies generating normal-day interest (D3).
- **Preparation and commitments** — something to prepare *for*. *(Moved ahead of
  achievements per external review: this is what gives the player a reason to
  care about Day 5, whereas achievements merely reward it afterwards.)*
- Permanent run history.

**Gate:** **you want to play day 5.** The real test of a sim.
Requires 3 of the 4 evidence items.

**Demonstrate Chain A1** (`SYSTEM_DEPENDENCIES.md` §7) — resource contention
producing a consequence the player can trace. *An earlier version of this
roadmap required the full equipment-based Chain A here, which was impossible:
items are Stage 7 and production is Stage 8. A gate the plan cannot pass is not
a gate, so the chain was split into A1 (here) and A2 (Stage 8).*

**Do not pass this stage by adding features.** If day 5 is boring, the fix is
usually to remove systems, not add them.

**Deferred past this stage:** secrets and achievements. They reward a good
experience rather than creating one. If this gate passes without them they remain
worth building; if it barely passes, they will not save it. *(Labelled Stage 5+
in the blueprint's system map — the two documents previously disagreed on whether
this was Stage 5 or "after 5".)*

**Do not pass this stage by adding features.** If day 5 is boring, the fix is
usually to remove systems, not add them.

**Deferred past this stage:** secrets and achievements. They reward a good
experience rather than creating one. If this gate passes without them they remain
worth building; if it barely passes, they will not save it.

**Questions passed forward:**
- Does preparing for a commitment create interest without requiring constant
  emergencies? (Q18)
- How long before repetition becomes painful? (Q19)
- What is the long-term purpose, now that the base simulation has been felt? (Q16)

---

## Stage 6 — Evidence review, then one expansion

**This stage is a decision, not a build.**

**Equipment is guaranteed and is not among the candidates.** It was previously
one of four options, which meant the project's defining feature — inspecting
soldiers, their gear and their individual loadouts — could be postponed
indefinitely by evidence review. Third external review flagged this as the
largest vision risk, and it is correct: a game that quietly becomes a generic
colony simulator has lost the thing worth years of work. Equipment is now a firm
milestone with a defined model (`GAME_DESIGN_BLUEPRINT.md` §A), and Stage 6
decides what is added *beside* it.

What remains genuinely open is **which single additional expansion** earns its
place. Candidates and their triggering evidence:

| Candidate | Choose it if Stage 5 showed the player cared about... |
|---|---|
| Training / skills | people improving at what they do |
| Deeper deliveries and logistics | supplies and shortages |
| First operation | wanting to act on the outside world |
| Relationships and friction | who works with whom mattering day to day |

**Leading candidate: training / skills.** It reuses the personnel data Stage 2
already creates and makes the difference between a mechanic and an electrician
observable, which is the same appeal as equipment condition — specific people
rather than totals.

Adding all of them is how this project dies.

**What Stage 6 does not decide:** whether equipment ships. It is settled
(`LOCKED_DECISIONS.md` D21).

---

## Stage 7 — Equipment and logistics

*(Guaranteed — D21. This stage is not conditional, though its scope is.)*

Individual items with condition, wear, and reliability. Maintenance needs,
parts, storage limits, imperfect deliveries, and repairs that change the actual
condition of a specific item.

**Build list** *(added after the audit, and after the fourth external review,
both of which found that D21 made this stage a promise while the roadmap carried
no way to keep it. A guaranteed stage with no build list is a hope.)*

- **Identity.** Every soldier and every item has a stable ID that outlives its
  condition. A badly damaged rifle is still *that* rifle.
- **Items.** `id`, `type`, `location`, `condition`, `assignment`, `repairHistory[]`.
  A visible scar, not a bare number.
- **Slots.** At minimum: primary weapon, sidearm, helmet, body armour, boots.
  Empty, occupied, broken, incompatible and unavailable must be
  *distinguishable* — a slot that cannot be empty communicates nothing.
- **Compatibility.** An item cannot silently belong to two soldiers or occupy an
  incompatible slot. Attempting it is refused, with a reason.
- **Containers.** A minimal version: clothing or webbing that holds items. Not
  every pocket — the mechanism, proved once.
- **Condition and wear.** Use damages a *specific* item. Only the Items system
  writes `condition`, via an explicit operation (invariant 16).
- **A minimal repair queue, included here.** Stage 8 is conditional, so this
  stage may not depend on it. Stage 7 ships its own small repair queue; Stage 8
  later absorbs it. **This is the dependency that had to be closed** — a
  guaranteed stage cannot require an optional one.
- **Observable capability.** A missing, incompatible or broken item must change
  something the soldier can actually *do*. A displayed statistic is not a
  capability.
- **Derived loadouts.** Never stored — resolved from assignment and slots.
- **Removal is not symmetric with addition.** Taking an item away must be an
  event, never a silent subtraction.

**Chain F — the inspection scenario** *(new, and the gate for this stage)*

```
A weapon is issued to Bakary and he carries it (Items)
  → his loadout shows the primary-weapon slot filled (Items)
    → he is assigned work needing that weapon (Jobs)
      → the weapon is used and its condition drops (Items applies wear)
        → he can now be inspected, with a repair history entry (Items + UI)
          → a repair changes that same item, and the player sees it (Items)
```

**Gate:** the base reads as a world of **specific, individual things**, not a set
of resource totals. A repair changed *that* item, and the player can see it.

Also required: a soldier's loadout is inspectable — which slots are filled,
which items are missing or broken, and what they can or cannot do because of it.
A simple item list satisfies the first sentence and fails this one.

**Watch for the trap:** the moment players start solving production as a
throughput puzzle instead of a management story, the game's identity has slipped.
Pull back.

---

## Stage 8 — Production, workshop, engines

*(Conditional. May merge with Stage 7 — repairs need persistent items, and those
need resources to exist.)*

Manufacturing, repair-versus-production trade-offs, engines, fuel, and resource
chains.

**Demonstrate Chain A2** (`SYSTEM_DEPENDENCIES.md` §7) — the full equipment
chain, with the worn item inspectable before and after the repair.

**Gate:** the bottleneck is **people**, not throughput.

---

## Stage 9 — Vehicles

*(Conditional.)* Vehicles with fuel, maintenance, storage, crew, and equipment.

**Gate:** **a dispatched vehicle can leave and not return.** Someone you have
been watching for five days is now somewhere you cannot see or command, acting
on judgement you did not write, and you cannot pause to ask why.

*Added by the completeness audit. The summary table had promised this gate for
several revisions while the section itself defined none — a stage that cannot be
completed or deliberately abandoned can only be quietly abandoned, which is the
exact failure the gate discipline exists to prevent.*

**Also required:** that the crew's qualifications matter (a vehicle its crew
cannot operate does not depart), and that cargo is genuinely gone when the
vehicle is. A vehicle that is a fuel bar with an inventory attached fails this
gate even if it dispatches successfully.

**Watch for the trap:** vehicles are the most likely system in the project to
turn the game into a logistics spreadsheet. If the player is optimising routes
rather than watching people, pull back — this is the one stage where the risk of
the genre changing is highest.

---

## Stage 10 — External operations and threats

*(Parked indefinitely.)* Missions, distant locations, raids, defensive
preparation, combat resolution.

**Gate:** the base has enough accumulated state that an external threat is
meaningful rather than arbitrary.

---

### On stage numbering

Stages 6–10 are **candidates, not commitments**. Each depends on evidence from
Stage 5 and may be reordered, merged, or dropped. Equipment (7) and production
(8) in particular may need to develop together, because a repair needs a
persistent item and that item needs resources to exist.

The sequence exists so the destination stays visible — not to imply that all ten
will happen in order.

---

## Second act — needs ladder

Runs alongside the stages above, in this order, one at a time:

1. Hunger, fatigue *(Stage 3)*
2. Hydration
3. Morale — computed from observable state, never a mood ring
4. Injuries — individual, persistent, caused by the player's own choices

Each is gated on the previous one being *felt* rather than merely present.

---

## Cross-cutting concerns

Maintained continuously, not as stages:

- **Headless runner** must keep working. If it breaks to make a feature work,
  the architecture is broken — fix it first.
- **Invariant tests** after every stage (no negative resources, no stuck loops).
- **Golden runs** on a fixed seed to catch unintended changes.
- **Sync docs** to shared storage whenever they change.

---

## Anti-goals

Explicitly not milestones, at any stage:

- Number of features implemented.
- Lines of code.
- Amount of documentation.
- A big system built "while we were in there".

---

## The honest summary

Stages 1 and 2 look too small to be worth building. That is correct. They are
two evenings of work whose entire purpose is to answer one question — *is
watching six people do simple jobs interesting?* — before any of the ambitious
systems get built on top of an answer nobody has yet found out.

**The blueprint is finished. This document is not an invitation to keep
planning.** Every remaining uncertainty is listed in `OPEN_QUESTIONS.md` with the
stage at which it becomes answerable, and none of them blocks Stage 1.

If the impulse is to design another system before playing, note what that
impulse usually means: the system being designed is more interesting than the
thing currently being built. That is the feeling to distrust.