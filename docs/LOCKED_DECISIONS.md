# Settled Decisions

Source: `DECISIONS_ANSWERED.md` (your answers), audit recommendations, and
`REVIEW_REPLIES.md` (external review).

## About the word "settled"

An earlier version of this document said **locked**. That was changed after an
external review made a fair point: *the developer approved most of these by
trusting the recommendation wholesale, not by examining each one individually.*

So the honest position is:

- These decisions reflect a real recommendation, accepted in good faith.
- They have **not** all been individually examined and confirmed.
- **Any of them can be revisited at any time**, and changing one now is far
  cheaper than changing one after it is built.

Nothing here is sacred. What is sacred is only that changes are made
deliberately and written down.

---

## D1 — Stakes: Readiness spine, *revised* after external review

Confirmed in principle. Unit readiness reflects how well the base is being run,
and at low levels people eventually leave.

**Two corrections, both accepted from external review:**

**1. Readiness is derived, not a magic meter.** It is recomputed each tick from
observable underlying state and is **never an input to any other system**. It
only summarises and reports. The player must always be able to see why it
moved — "readiness fell because meals were missed and rest was repeatedly
interrupted" — and be able to trace that to the supply shortage or the work
schedule that caused it.

If readiness merely duplicates hunger and fatigue, it adds complexity without
adding meaning, and should be cut.

**2. Legitimate rest is not idleness.** This was a genuine design bug. The
original rule counted *all* idleness as a negative. A soldier resting after a
demanding shift is doing exactly what the base needs. Readiness must not fall
during legitimate recovery — only *unproductive* idleness counts against the
base.

**3. Readiness summarises; it does not rule.** *(Corrected after the second
external review, which caught a contradiction in the previous version of this
document.)*

The previous wording said readiness "is never an input to any other system"
while also describing a progression of consequences driven by readiness. Those
cannot both be true. The resolution:

> **Readiness is an explanatory summary only.** It is never read by any other
> system and never causes anything.
>
> **Behavioural consequences are driven by the underlying conditions** that
> readiness happens to summarise — fatigue, hunger, injury, workload, sustained
> neglect.

A person declines a demanding task because their **fatigue is high**, not
because readiness is low. Readiness is the panel that lets the player see that
several conditions are stacking up. The number explains; the conditions rule.

This matters practically: if readiness were causal, tuning it would require
re-tuning every system that read it. As a pure summary, it can be removed at any
time without touching the world.

**The consequence ladder, and what actually triggers each step:**

| Step | Trigger (the real cause) | Readiness's role |
|---|---|---|
| 1. Warning flag | sustained high fatigue or missed meals | shows *why* |
| 2. Reduced effectiveness | fatigue above a work threshold | shows *why* |
| 3. Declines demanding work | fatigue or injury above a hard threshold | shows *why* |
| 4. Refuses optional assignments | prolonged neglect — repeated refusals, no rest | shows *why* |
| 5. Leaves | sustained neglect over many in-game days | shows *why* |

Every threshold is a tunable constant on the underlying condition, not on the
summary.

Injuries remain a later layer (`_archive/LONG_TERM_DESIGN.md` §3).

---

## D2 — Player agency: Named-option decisions **+ a separate intent layer**

Confirmed. A few times per day the simulation produces a concrete situation
with 2–3 named, specific options and a visible cost to each. These **queue** in
the report rather than interrupting — you decide in batches.

This is the single decision that turns the simulation into a game.

**Addition accepted from external review — options must be genuine tradeoffs.**
Each option has to protect a different priority. A decision whose correct answer
is obvious teaches the player nothing and wastes an interruption. Both options
should have a credible benefit and a credible cost; the player should understand
the immediate tradeoff clearly while remaining uncertain about outcomes that
depend on later events.

Each option explains: what happens, why it matters now, what it costs
immediately, and what risk it leaves unresolved.

**Addition — player intent is a design concept, not a UI control.** External
review identified a real gap: our plan described the player's actions only as
sliders, which meant *intent existed nowhere except in the interface.* That
leaks the design back into the UI.

Player intent is now a first-class simulation input — priorities, reserves, and
policies stored in state as data (see `ARCHITECTURE.md` §4.2). The interface is
only one way to set it. Headless tests set intent directly; a future preset
system would set it without any UI.

And: **an intent whose effect cannot be observed is a dead control.**

---

## D3 — Normal days: Rule-generated anomalies + player-set goals

Confirmed. Anomalies are generated by the simulation rules, never scripted
story beats. Player-set goals are tracked by the report.

**Revision accepted from external review — a hybrid anomaly model.** Pure
emergence is hard to control; pure scripting is fake. The adopted approach:

1. **Authored anomaly *rules*** — define recognizable situations and their
   possible consequences. Rules, not stories.
2. **Simulation-gated eligibility** — a rule may only fire when the current
   state supports it.
3. **Seeded selection** — the deterministic RNG picks among eligible outcomes.
4. **Causal follow-through** — what the anomaly changed, and what happened
   because of it, is recorded.

**An anomaly must earn its place.** It should change a decision, reveal a risk,
create a story, or provide useful information. If it only makes the log look
busy, it is noise and should be removed. Governing rule: *importance and
frequency*, not variety.

**A late delivery is not interesting by itself.** It becomes interesting when
the player understands which supply it affects, who needs it, and what other
options remain.

Relationships are **deferred to the long-term design**, not dropped.

---

## D4 — Pacing: 3 real minutes per in-game day

**Locked numbers:**

| Property | Value |
|---|---|
| 1 tick | 1 in-game minute |
| 1 in-game day | 1440 ticks |
| 1× speed | 8 ticks/second |
| **Day length at 1×** | **~3 minutes** |
| Speed settings | pause, 1×, 4×, 16× |
| Day length at 16× | ~11 seconds (skip-to-report) |

These live in a single config constant. **You are invited to change this after
playing it** — that is what the test is for. If 3 minutes feels wrong, tell me
and we change one number.

---

## D5 — No live clock

Confirmed. Display `Day 3 — Afternoon`. Abstract time only.

---

## D6 — No dithering: Hysteresis

Confirmed. A worker must finish or explicitly abandon a task before choosing a
new one. Abandoning forfeits a portion of accumulated progress. This goes into
the spec on day one because retrofitting it means editing every job rule.

---

## D7 — Pressure: Time-based, drifting toward people-based

Confirmed. Shortages, late deliveries, degrading equipment, idle personnel.
People pressure (leave requests, quit threats, clashes) enters once the soft
failure spine exists.

**External pressure (raids, enemy AI, war layer) remains out of scope** — it is
parked in `_archive/LONG_TERM_DESIGN.md`, not deleted. My reasoning for deferring it
stands: it is the most expensive way to create pressure and the most likely to
kill the project before the core is fun.

---

## D8 — Stack: TypeScript + Vite + React

Confirmed, and yes — it is the best available option *for you specifically*.
The deciding factor is not that it's theoretically superior, it's that you
already run this exact stack successfully in `~/special-day-build`. Zero new
tooling, zero new concepts, and the muscle memory transfers.

Nothing else would be better unless your PC had been available, in which case
the same answer would still apply for different reasons.

---

## D9 — Architecture rule: simulation is a pure module

Confirmed. **Non-negotiable, no exceptions.**

> The simulation has no React imports. It takes a state, returns a new state,
> and appends to an event log. It must be runnable in a plain Node script with
> no browser. If a React component contains a rule about how the world works,
> that is a bug.

This is the rule that lets the project survive to its later stages.

---

## D10 — Seeded randomness from tick zero

Confirmed. One `state.seed`; every random draw goes through one function; no
`Math.random()` anywhere in the simulation. Rendering must never consume
simulation randomness.

Cannot be retrofitted cheaply. Locked now, permanently.

---

## D11 — Layout: Panels only

Confirmed. Roster, job board, resource counts, event log, decision queue. No
grid, no map, no spatial navigation required. Can be added later if it earns
its place.

---

## D12 — Platform: phone browser now, desktop later

Confirmed. Vite dev server in Termux, opened in the phone browser. Phone-first
UI design is treated as a feature, not a constraint — it keeps panels honest.

Your PC is currently unavailable; this decision costs nothing because it was
the right call anyway.

---

## D13 — Needs: two now, expanded later

**Locked for the prototype: hunger and fatigue only.**

Planned later, in order: **hydration → morale → injuries**. Your preference for
all three is recorded and scheduled — see `_archive/LONG_TERM_DESIGN.md` §2.

The order is deliberate. Each need multiplies the number of interactions to
tune. Adding three at once means you cannot tell which one caused a problem.

---

## D14 — Exclusions: relaxed, but *sequenced*, not removed

You asked for a bigger roadmap and for everything planned in advance. Agreed —
so the exclusions below are now **sequencing constraints, not permanent
refusals**. Nothing here is forbidden forever; each item has a stage where it
becomes allowed, and it unlocks only when the previous stage is proven fun.

| Feature | Status | Unlocks after |
|---|---|---|
| Combat, raids, enemy AI | parked | core loop proven fun |
| Vehicles, fuel | parked | factory layer works |
| Weapon customization | parked | equipment condition exists |
| Faction warfare, campaigns | parked | first base is enjoyable |
| Pathfinding | parked | grid is proven necessary |
| Animation, 3D | parked | text UI has failed to convey state |
| Recruitment, hiring, skill trees | parked | people quit / get injured |
| Save/load | see D15 | state model stabilizes |

See `ROADMAP.md` for the full order and the gates in between.

---

## D15 — Save/load: yes, early

Changed from my recommendation. Your reasoning is correct: you want to
playtest across sessions on a phone, and re-running from a seed every time is
friction that will stop you testing.

**Locked compromise:**

- Build a **state snapshot** system early — but the *only* requirement is that
  the entire simulation state is a plain JSON-serializable object.
- That constraint is what makes saves trivial. If it holds, save/load is ~50
  lines.
- If the constraint ever gets violated, saves become expensive. So the
  constraint is enforced, and full save/load UI waits for Stage 3.

Net result: you get your saves, and the architecture stays clean.

---

## D16 — Interrupts: rare, only for genuinely major moments

Confirmed with your clarification. Two distinct channels:

1. **Queued decisions** (D2) — the common case. Accumulate in the report.
2. **True interrupts** — reserved for rare, high-stakes moments only (e.g. a
   readiness crisis, an injury, a fire). The world pauses, you act, it resumes.

Budget: **no more than ~1 true interrupt per in-game day.** If you are getting
more, the design is wrong.

---

## D17 — What loses you: nothing happening, and losing everyone

Your answer, and it is the correct diagnosis — those are exactly the two failure
modes of an unpressured sim.

- **Nothing happening** → anomalies (D3) and queued decisions (D2) address it.
- **Losing everyone** → soft failure spine (D1) gives it teeth.
- **"A loss can still be okay"** → agreed and supported by a **continuation
  system**: permanent history, achievements, secrets, rare events. See
  `_archive/LONG_TERM_DESIGN.md` §6. A base that collapses should still leave something
  behind you want to keep.

---

## D18 — God view, with occasional interference

Confirmed, and your reasoning is sound: pure observation is a screensaver.

**The refined position:** god view stays the default (no avatar, no walking
around), but the player has *real* interference points. What makes this work
is that interference must be **meaningful and rare** rather than constant —
which is exactly what D2's queued decisions provide.

Long-term: named individuals become the emotional anchor even though you never
control them directly. You do not "play as" anyone; you care about specific
people because the simulation tracks them specifically.

---

## D19 — No deadline, passion project

Confirmed. No schedule pressure.

**Consequence I want to be honest about:** without a deadline, the most likely
failure mode is not rushing — it is the opposite. Passion projects die from
*drift*, where you spend months designing systems that were never played. The
roadmap therefore uses **gates** (a specific thing you must feel before the next
stage unlocks) rather than time estimates. The gate is the thing that keeps a
slow project honest.

---

## D20 — Requested: a larger foundation, upfront

You asked me to design the factory/engine layer and a stronger architecture now
rather than shipping a throwaway Stage 1.

**Partially agreed, and here's the honest split:**

- **Documentation now:** yes, fully. `_archive/LONG_TERM_DESIGN.md` and
  `ARCHITECTURE.md` describe the whole game, including factories, engines,
  vehicles and progression, so any future agent can continue this work without
  re-deriving it.
- **Implementation now:** no. Not because the plan is wrong, but because a
  factory simulation built before anyone has watched a person get hungry and
  understand why will be the wrong factory simulation. The rules you'd write
  would change once you learn what the base actually feels like.

This is not gatekeeping and it is not me being cautious for its own sake. The
concrete reason: **in a sim, you cannot design the interesting systems until
the boring ones are proven interesting.** I do not know yet whether people
enjoy watching six people eat and sleep. If they do not, the factory layer is
moot — and if they do, you will want the factory to serve that experience, which
I cannot currently predict.

The roadmap gives every planned system a real design and a real place. Nothing is
missing. The order just protects the order.

---

## D21 — Equipment and loadouts are guaranteed, not conditional

*Added after the third external review.*

Equipment condition was originally one of four candidates at Stage 6's evidence
review. That looked like scope discipline. It was also a slow extinction.

Every stage after 6 is conditional. If Stage 6 picked logistics instead, Stage 7
would become "whatever else the evidence supports" — and the equipment work, the
reason this project is a *military* base sim rather than a generic colony sim,
would have no stage at all. A gate that can indefinitely postpone the defining
feature is not a gate.

**Decision: a minimum equipment and loadout experience is a guaranteed milestone.**
Stage 7 happens. Its *scope* remains negotiable — how many item types, how deep
the repair model, whether armour values matter — but the stage does not.

This does not commit to building it now, and it does not weaken Stage 6. Stage 6
still chooses one additional expansion; it simply no longer chooses whether
equipment exists.

**The structural contract** — soldier, item, slot, loadout, and how vehicles
relate to all of it — is fixed in `GAME_DESIGN_BLUEPRINT.md`, "The equipment
structural contract". The developer's interest is *inspection*: soldiers,
helmets, clothing, pockets, durability, armour, weapons, loadouts. A flat item
list with a condition bar would satisfy the old wording of Stage 7 while missing
all of it, so the guarantee is tied to that contract rather than to the word
"equipment".

**The rule this follows:** scope is negotiable, identity is not. If the evidence
says equipment matters less than expected, build less of it — but the base must
end up a world of specific, inspectable things rather than totals.

---

## Summary of what changed from the original planning pack

| Area | Original plan | Now |
|---|---|---|
| Stakes | none | soft failure spine + injuries (later) |
| Player action | sliders | named-option decisions |
| Boring days | unaddressed | rule-generated anomalies |
| Needs | hunger, fatigue | → hydration, morale, injuries |
| Interrupts | none | queued decisions + rare interrupts |
| Save/load | deferred | state-snapshot constraint now, saves at Stage 3 |
| Scope | small prototype | full long-term design documented and sequenced |
| Pacing | undecided | 3 min/day, pause/1×/4×/16× |
| Stack | undecided | TS + Vite + React |