# Game Design Blueprint

**The complete specification of every major intended system, including systems
that will not be implemented for years.**

This exists so that another developer — or the same developer in two years —
can implement any part of this game without rediscovering the design.

## What this document is and is not

**It is:** a map. Every system's purpose, state, rules, dependencies, and
intended stage.

**It is not:** a content catalogue. There are no weapon statistics here, no
probability tables, no named characters. Those are *content*, and content cannot
be designed until the *rules* governing it are proven. This document specifies
the rules and leaves the numbers tunable.

**A system described here is not thereby approved for building.** Every stage
from 6 onward is conditional on evidence. This document keeps the destination
visible without obligating anyone to walk the whole route.

## The specification template

Every system below is documented with the same eleven sections:

1. Purpose — the player experience it creates
2. State — what it owns, persistent vs. derived
3. Rules — tick behaviour
4. Dependencies — what it reads, what it writes
5. Autonomy — what happens without the player
6. Player agency — what the player can influence
7. Consequences — success, delay, failure, neglect, recovery
8. Events — what is recorded and explained
9. Interface — how the player inspects it
10. Tests — invariants and scenarios
11. Stage — when it becomes eligible, and what must exist first

## Status labels

| Label | Meaning |
|---|---|
| **SETTLED** | Direction is clear. Revisiting requires a reason. |
| **PROVISIONAL** | Preferred design exists; testing may change it. |
| **OPEN** | Alternatives remain. How we will decide is recorded. |

---

# Group A — The foundation

---

## A1. Clock and time

**Status:** SETTLED · **Stage 1**

**1. Purpose.** Gives every other system a common reference so that "what
happened before what" is always answerable.

**2. State.** `tick: number` — 1 tick = 1 in-game minute. `day` is derived
(`floor(tick / 1440)`); never stored separately.

**3. Rules.** Advances by exactly 1 per tick. `1440` ticks = 1 in-game day. Time
of day is derived for display as abstract periods (Night, Morning, Afternoon,
Evening) — **never a ticking clock**.

**4. Dependencies.** Reads nothing. Writes only `tick`. Phase 0.

**5. Autonomy.** The entire system runs itself. The player controls *rate*, not
time.

**6. Player agency.** Pause, 1×, 4×, 16×. At 1× a day is ~3 real minutes.

**7. Consequences.** None by itself. It is the frame everything else hangs on.

**8. Events.** Day boundaries are notable events.

**9. Interface.** "Day 3 — Afternoon". No clock, no seconds.

**10. Tests.** Tick advances by exactly 1. `day` derives correctly across
boundaries (1439→1440, 2879→2880). 1440 ticks at 8/sec ≈ 180 seconds.

**11. Stage.** 1. Everything depends on it.

---

## A2. Randomness and determinism

**Status:** SETTLED · **Stage 1**

**1. Purpose.** Makes every run reproducible, so a bug can be replayed and
diagnosed instead of described vaguely.

**2. State.** `seed: number`, `rngCursor: number`.

**3. Rules.** All randomness goes through one function, `rand(state)`, which
advances `rngCursor`. `Math.random()` inside the simulation is a bug. The UI
never draws from this stream — rendering must not shift the sequence, or replay
breaks.

**4. Dependencies.** Reads and writes only its own fields. Phase 0.

**5. Autonomy.** Total.

**6. Player agency.** The seed is displayed so a run can be shared or replayed.

**7. Consequences.** None directly. It is the reason debugging is possible.

**8. Events.** The opening seed is recorded in run history.

**9. Interface.** Seed shown in a corner; editable when starting a run.

**10. Tests.** Same seed + same commands → identical event log. `rngCursor`
advances *only* inside `rand()`. UI re-render does not change the next draw.

**11. Stage.** 1. Retrofitting this later is prohibitively expensive.

---

## A3. Events and causality

**Status:** SETTLED · **Stage 1**

**1. Purpose.** The reason the game can explain itself. This is the system's
entire job, and it is the most important one in the project.

**2. State.** `log: Event[]`, appended only. Never mutated, never truncated
except by an explicit cap that preserves `critical` events.

**3. Rules.** Every meaningful state change appends an event with subject IDs
and cause event IDs. Reports **read the log and never recompute** — this makes
"the report is accurate" true by construction rather than by discipline.

**4. Dependencies.** Written by every system. Owns only the log.

**5. Autonomy.** Total.

**6. Player agency.** The player reads the timeline and copies runs as JSON.

**7. Consequences.** None. It has no effect on the world — deliberately. It is
read-only infrastructure.

**8. Events.** It is the event system.

**9. Interface.** Timeline view, end-of-day report, debug view with raw data.

**10. Tests.** Every event's cause IDs exist and reference earlier ticks. Same
seed → identical log. Events are never mutated after append.

**11. Stage.** 1 (log), 3 (tiers), 4 (reports). *Tier* here means significance, not execution order — see `SYSTEM_DEPENDENCIES.md` §1.

---

## A4. Command ordering

**Status:** SETTLED · **Stage 1**

**1. Purpose.** Guarantees that player commands land at a deterministic moment.

**2. State.** No state of its own.

**3. Rules.** Commands issued at any point are queued and applied at step 2 of
the next tick, before any system reacts. This means a command issued during tick
N always takes effect at tick N+1 — never mid-tick, never twice, never lost.

**4. Dependencies.** Reads nothing. Applied before all systems.

**5. Autonomy.** Total.

**6. Player agency.** This *is* the player's influence mechanism.

**7. Consequences.** Invalid commands must be rejected with a reason, not
silently dropped. A command targeting a nonexistent job must fail loudly in
tests.

**8. Events.** Command application is recorded when it changes something.

**9. Interface.** Controls issue commands; they never mutate state directly.

**10. Tests.** A command applied twice applies once. A command issued mid-tick
takes effect at exactly the next tick. Invalid commands are rejected.

**11. Stage.** 1.

---

# Group B — Personnel and autonomy

---

## B1. Personnel identity and history

**Status:** SETTLED (identity) · PROVISIONAL (history depth) · **Stage 2**

**1. Purpose.** Makes people legible as individuals rather than as labour units.
The player should care about *Bakary* without ever controlling him.

**2. State.** Persistent: `id`, `name`, `role`, `specialty`, `hireDay`,
`personalitySeed`. Derived: `currentTask`, `taskStartedTick`, `history` summary.
**All must survive JSON round-trip.**

**3. Rules.** Each person has exactly one stable ID and one role. Names are
fixed at creation from the seeded RNG — never randomly generated outside it, or
replay breaks.

**4. Dependencies.** Owns personnel data. Reads Needs, Jobs, Intent, Items.
Writes Jobs (claims a task) and Needs (does work, accrues fatigue).

**5. Autonomy.** People accept, defer, refuse, and abandon work entirely on
their own.

**6. Player agency.** Priority, reserves, and policies — never direct task
assignment as the primary mechanism. Direct assignment may exist later for
consequential moments only.

**7. Consequences.** See B3 and B4. A person's unavailability cascades.

**8. Events.** Task started/completed/abandoned/refused, with the reason.

**9. Interface.** Roster panel. Tap a person for needs, current task, the reason
they chose it, recent events, working history, and relationships.

**10. Tests.** Every person has exactly one active task. A task is never held by
two people. Names are stable across a replay.

**11. Stage.** 2. History depth grows at 4 and 6.

---

## B2. Roles and specialties

**Status:** PROVISIONAL · **Stage 6**

**1. Purpose.** Creates the specialist problem — the reason a single absence
can reshape a day.

**2. State.** `role` plus `specialtyTags: string[]`. Specialties are chosen
from a small fixed set defined per stage, not from a large catalogue.

**3. Rules.** A person is eligible for a job if their role matches and their
work capacity permits it. Specialties modify *rate* and *reliability*, never
eligibility alone — otherwise a base becomes one missing person from total
paralysis, which feels arbitrary.

**4. Dependencies.** Owned by B1. Read by Jobs.

**5. Autonomy.** People prefer jobs matching their specialty, and will travel
between them if the trade is worthwhile.

**6. Player agency.** Cannot change who someone is. Can change what work exists.

**7. Consequences.** Over-specialisation is a trap the player can walk into. This
is intentional.

**8. Events.** A job completed by an unusually well-matched person is a notable
event.

**9. Interface.** Each person's specialties visible; each job shows which people
are eligible.

**10. Tests.** No job has zero eligible workers unless deliberately created. A
single absence degrades throughput rather than halting the base — unless the
player chose an over-specialised roster.

**11. Stage.** 6 (training/skills) — *note:* this system and Chain B in
`SYSTEM_DEPENDENCIES.md` are the intended payoff of choosing Equipment at
Stage 6.

---

## B3. Autonomous job selection

**Status:** SETTLED · **Stage 2**

**1. Purpose.** The heart of the game. Personnel should act usefully without the
player directing them, and the player should always be able to see why.

**2. State.** Owned by Jobs: task assignment and progress. B1 owns nothing here.

**3. Rules.** Selection priority, evaluated in order:

1. **Urgent needs** — a need crossed a threshold that blocks normal work.
2. **Recovery** — rest, if required by fatigue.
3. **Duties** — the assigned role.
4. **Player intent** — priority order between competing job kinds.
5. **Opportunity** — anything else eligible and unclaimed.

**Hysteresis is mandatory:** a worker must finish or explicitly abandon a task
before choosing a new one, and abandoning forfeits a portion of accumulated
progress. The forfeit must be slightly larger than "a better task just
appeared," or the base will thrash.

**Tie-breaking is deterministic** — lowest ID first, never randomly. Random
tie-breaks make behaviour irreproducible and are the classic source of "it only
happens sometimes."

**4. Dependencies.** Reads Needs, Intent, Facilities, Items, B2. Writes job
progress and Resources (on completion).

**5. Autonomy.** Total, except for the player's priority order.

**6. Player agency.** Intent changes the *order* of consideration. It does not
assign tasks. An intent whose effect cannot be observed is a dead control.

**7. Consequences.** Contention for a worker is the primary source of delay, and
delay is what makes consequences visible.

**8. Events.** Task claimed, started, completed, abandoned (with forfeit
amount), refused (with reason).

**9. Interface.** Current task and the **literal reason it was chosen** —
"no food available, hungry" beats "selected job #3."

**10. Tests.** Invariants 3, 4, 5, 9. Two people never claim the same job. A
person never oscillates between tasks without an explicit abandonment.

**11. Stage.** 2.

---

## B4. Needs — hunger, fatigue, hydration, morale, injury

**Status:** hunger/fatigue SETTLED · hydration PROVISIONAL · morale PROVISIONAL ·
injury PROVISIONAL · **Staged 3, 3, 6, 6**

**1. Purpose.** Gives personnel a reason to act, and gives neglect consequences.

**2. State.** Per person, each need in [0, 1]. Persistent. Injuries are separate
records with severity, cause, and recovery time.

**3. Rules.** Needs change on a timescale of *hours*, not minutes — so at 1×
the player sees meaningful change every ~20 seconds without anything flickering.

**Legitimate rest is not idleness.** Only *unproductive* idleness — awake, capable
of work, and not recovering — counts against the base. This was a genuine bug in
an earlier version of this design.

**Morale is derived**, never a standalone mood. It summarises food security,
rest, workload, injuries, and recent events. It must contribute something the
underlying needs do not already represent — if it does not, **cut it** (Q21).

**4. Dependencies.** Owns need values. Read by B3 (selection), Resources
(consumption). Writes nothing else.

**5. Autonomy.** People seek food, seek rest, and refuse work they are too tired
for — entirely without instruction.

**6. Player agency.** Through supplies, schedules, reserves, and decisions.
The player cannot raise someone's morale directly.

**7. Consequences.** The graduated ladder in `LOCKED_DECISIONS.md` D1: warning →
reduced effectiveness → declines demanding work → refuses optional assignments
→ leaves. **Every threshold is on the underlying condition, never on the
readiness summary.**

**8. Events.** Need crosses a threshold (notable). Needs declined work (notable).
Injury occurred (critical).

**9. Interface.** Per-person need bars, with thresholds marked. The reason a
person declined a task is shown on the task, not hidden in a menu.

**10. Tests.** Invariant 7 (range), 8 (rest). Needs never fall during recovery.
A person over the decline threshold refuses demanding work.

**11. Stage.** Hunger + fatigue at 3. Hydration after 3. Morale and injuries at
6, and only if Stage 6 selects people over equipment.

---

## B5. Schedules and rest

**Status:** PROVISIONAL · **Stage 3**

**1. Purpose.** Gives days a rhythm. Without it, a 3-minute day is undifferentiated
noise.

**2. State.** Per person: a coarse daily pattern of periods (work / rest /
meals), not minute-by-minute.

**3. Rules.** Schedule is a *preference*, not a command. A person deviates when
their needs demand it, and the report says so. Schedules are initially uniform;
variation arrives later if Stage 5 shows it matters.

**4. Dependencies.** Owns schedules. Read by B3. Written by B4 (deviation).

**5. Autonomy.** People skip meals when a job is urgent enough. This is a
tradeoff, not a failure.

**6. Player agency.** Work/rest policies. Cannot schedule individuals minute by
minute — that is micromanagement, and micromanagement is out of the game's
identity.

**7. Consequences.** A schedule everyone shares produces the same contention
every day. Variation creates different bottlenecks on different days.

**8. Events.** Schedule deviation with the reason.

**9. Interface.** A simple period strip per person.

**10. Tests.** No person works through a required rest period without a recorded
reason. Deviation is always explained.

**11. Stage.** 3.

---

# Group C — Player command

---

## C1. Player intent

**Status:** SETTLED · **Staged 2 (one priority), 4 (full set)**

**1. Purpose.** This is what makes the player a commander rather than a
spectator. **The central claim of the game is that you can notice a problem,
intervene, and later recognise the consequences.**

**2. State.** Persistent:
```ts
interface Intent {
  id: string;
  kind: 'priority' | 'reserve' | 'policy';
  target?: string;
  value: number | string | boolean;
}
```

**3. Rules.** Intent resolves into job-selection priority order. It changes the
*order of consideration*, not assignments. Invalid intent (targeting a
nonexistent job) is rejected with a reason.

**4. Dependencies.** Owns intent. Read by B3. Written only by commands.

**5. Autonomy.** N/A — this is the player's channel.

**6. Player agency.** This is the whole mechanism.

**7. Consequences.** An intent nobody can observe the effect of is a dead
control and must be removed.

**8. Events.** Intent changed (routine, unless it visibly altered the day).

**9. Interface.** A small, deliberately limited set of controls. Not a
configuration screen — see Q24 on how few is few enough.

**10. Tests.** Intent set headlessly produces identical behaviour to intent set
through the UI. This is what proves intent is not a UI concept.

**11. Stage.** One priority at 2. Priorities, reserves, and policies at 4.

---

## C2. Named-option decisions

**Status:** SETTLED · **Stage 4**

**1. Purpose.** The difference between a simulation and a game.

**2. State.** Persistent:
```ts
interface Decision {
  id: number;
  tick: number;
  prompt: string;
  options: { label: string; immediate: Effect[]; delayed: Effect[] }[];
  causeEventIds: number[];
  blocking: boolean;
}
```

**3. Rules.** Each option must have a **credible benefit and a credible cost**.
An option list whose correct answer is obvious teaches nothing and wastes an
interaction. Each option explains: what happens, why it matters now, what it
costs immediately, and what risk it leaves unresolved.

`blocking: false` queues; `blocking: true` pauses the world. **True interrupts
are budgeted to roughly one per in-game day.**

**4. Dependencies.** Owns pending decisions. Reads Events for causes. Writes
Resources, Needs, Personnel, Facilities on resolution.

**5. Autonomy.** The simulation generates decisions from its own state; it never
invents them for dramatic effect.

**6. Player agency.** The player's main expressive channel at consequential
moments.

**7. Consequences.** This is the consequence system. Choosing (a) push through
and risk injury, (b) hand off and lose the slot, (c) leave it broken — each has a
traceable cost.

**8. Events.** Decision offered, decision made, each option's consequences
recorded with cause links back to the offering event.

**9. Interface.** Queued in the end-of-day report; rare blocking interrupts
surface immediately. Headless runs answer decisions programmatically, which is
how balance gets tuned without a human.

**10. Tests.** Every decision has at least two defensible options. Every offered
decision's `causeEventIds` are non-empty and valid.

**11. Stage.** 4.

---

## C3. Preparation and commitments

**Status:** PROVISIONAL · **Stage 5**

**1. Purpose.** **Answers the long-term purpose question (Q16) provisionally.**
The player's reason to care about Day 5.

**2. State.** Active obligations with deadlines and preparation targets;
resources reserved against them.

**3. Rules.** A commitment creates future demand. Preparing for it is ordinary
work. Failing it has consequences that are **not** a game-over — the base
persists and continues.

**4. Dependencies.** Owns commitments. Reads Resources, Intent, Needs. Writes
Resources (consumption toward targets).

**5. Autonomy.** Personnel work toward commitments through ordinary job
selection; no special behaviour.

**6. Player agency.** Choosing what to prepare for, and when to spend against a
reserve. This is the reserve decision in Chain C.

**7. Consequences.** Over-preparing starves the present; under-preparing fails
the commitment. Both are legible.

**8. Events.** Commitment issued, progress toward it, met, missed.

**9. Interface.** An obligations panel, plus a reserve indicator.

**10. Tests.** Preparing does not generate constant emergencies. The same
commitment has different meanings under different starting states.

**11. Stage.** 5. **Provisional** — the shape may change once Q16 is answered by
evidence rather than by argument.

---

# Group D — The material world

---

## D1. Resources

**Status:** SETTLED · **Stage 3**

**1. Purpose.** The medium through which consequences travel.

**2. State.** **No mutable state of its own.** Resources is a *derived
aggregate* over Storage holdings, plus the rules for how much an action
consumes or yields. Initial resource kinds: food, maintenance supplies. Later:
water, medical, parts, fuel.

*Corrected after the fourth external review. This section previously claimed
Resources owns persistent quantities and is "written by consumption, production
and delivery", which contradicted the ownership table in `SYSTEM_DEPENDENCIES.md`
§3. Two documents, two rules, and an implementer would have followed whichever
they read first.*

**3. Rules.** **All consumption, production, and transfer goes through explicit
rules.** Never from UI handlers. Consumption happens *after* deliveries in the
tick (`SYSTEM_DEPENDENCIES.md` §4).

**4. Dependencies.** Owns **no mutable field**. Storage owns physical holdings;
Resources reads them to produce totals and defines the consumption rules. A
consuming system never writes stock — it sends a `consume(kind, amount)` request
and Storage applies or refuses it, recording why.

**No system may write holdings except Storage** (invariant 17).

**5. Autonomy.** Production and consumption are entirely automatic.

**6. Player agency.** Reserves and priorities. Cannot conjure supplies.

**7. Consequences.** Invariant 1: never negative. Invariant 13: never silently
over capacity.

**8. Events.** Below threshold (notable). Below zero (critical). Delivery
arrived (notable, with lateness).

**9. Interface.** Resource counts with thresholds marked. **A total is not
enough** — the design target is per-supply visibility by Stage 7.

**10. Tests.** Invariants 1, 2, 13. Totals equal the sum of holdings.

**11. Stage.** 3.

---

## D2. Facilities

**Status:** SETTLED · **Stage 2**

**1. Purpose.** Gives the base physical places and capacity limits.

**2. State.** Kitchen, barracks/rest area, storage, workshop. Each has a
capacity, an availability, and later a condition.

**3. Rules.** A facility can be unavailable — occupied, damaged, or
unpowered. A job requiring an unavailable facility cannot start.

**4. Dependencies.** Owns facility state — rooms, capacity, availability. Read
by Jobs. **Written by Facilities alone.**

*Corrected after the fourth external review: this previously read "Written by
Production and Items (condition)", which had two systems writing fields the
ownership table assigns to Facilities. Production and Items now send
`reserve(capacity)` and `wear(itemId)` requests; Facilities decides.*

**5. Autonomy.** Facilities degrade with use.

**6. Player agency.** Repair priorities. Cannot build a new facility until
production exists.

**7. Consequences.** An unavailable facility is the most common cause of delay,
and delay is how consequences become visible.

**8. Events.** Facility unavailable (notable), condition degraded (routine until
it matters, then notable).

**9. Interface.** Facility panel showing capacity, occupancy, condition.

**10. Tests.** Invariant 4. No job runs in an unavailable facility.

**11. Stage.** 2 (basic), 7 (condition).

---

## D3. Items — individual equipment, weapons, loadouts

**Status:** PROVISIONAL · **Stage 7**

**1. Purpose.** **This is the developer's original interest, and it is the
reason Stage 7 exists.** The base must become a world of specific, individual
things — not resource totals.

**2. State.** Per item: `id`, `type`, `condition` (0–1), `wearRate`,
`assignedTo?`, `location`, `reliability`. Persistent. Ammunition where relevant.
**All items are individually inspectable.**

**3. Rules.** Condition degrades with use. Below a threshold, reliability falls
and the item may fail during use — recorded as an event with a cause. Repair
changes the actual condition of *that* item. Loadout assignment affects a
person's capability, not merely a statistic.

**Ownership: Items alone writes `condition`.** A job that damages equipment does
not decrement it; it sends a `wear(itemId, amount)` request, and Items applies
it. An earlier draft's test section said condition "changes only through repair or
production", which contradicted the degradation rule above and would have
prevented wear from ever happening. Invariant 16 enforces the resolution.

**4. Dependencies.** Owns items. Read by Jobs (reliability), Production
(repair orders), Facilities (storage). Nothing writes item fields except Items.

**5. Autonomy.** Items wear without supervision. Nobody "maintains" an item
except by doing a repair job.

**6. Player agency.** Which items get repaired first, who carries what, what is
stored or issued.

**7. Consequences.** A worn item fails at the worst moment, and someone was
carrying it. That is the intended story.

**8. Events.** Condition crossed threshold (notable). Item failed in use
(critical). Item repaired (notable, naming the item).

**9. Interface.** **The inspection screen the developer wanted**: tap an item,
see its condition, wear history, who has it, reliability, and what has gone
wrong with it.

**10. Tests.** Invariants 2 and 16. **Item condition changes only when the
Items system applies an explicitly permitted operation — wear, repair, or
manufacture. No other system may modify `condition` at all.** A failed item
records which person was using it.

*Corrected after the fourth external review. This previously read "changes only
through a repair or production action", which contradicted §3's rule that
condition degrades with use — a contradiction that would have prevented wear
from ever happening.*

**11. Stage.** **7 — guaranteed** (D21). **Prerequisites: a minimal repair queue,
built in Stage 7 itself.** Stage 7 may not depend on Production (Stage 8),
because Stage 8 is conditional and a guaranteed stage cannot require an optional
one. Stage 8 later absorbs the queue rather than supplying it.

*Corrected after the fourth external review: this previously read "Production
(Stage 8) or a minimal repair queue", which left open the possibility of a
guaranteed stage depending on a conditional one.*

---

## D4. Storage and logistics

**Status:** PROVISIONAL · **Stage 7**

**1. Purpose.** Makes scarcity a physical constraint rather than an abstract
number.

**2. State.** Storage facilities with capacity; holdings per resource.

**3. Rules.** **Deliveries arrive on an imperfect schedule** — late, partial, or
occasionally wrong. Generated by rules, never scripted. Capacity overflow is a
soft clamp that warns visibly rather than silently discarding.

**4. Dependencies.** Owns holdings and capacity. Read by Resources,
Production, Facilities.

**Written by Storage alone.** Delivery does not write stock directly — it hands
over a scheduled arrival, which Storage applies. A consuming system sends a
`consume()` request for the same reason (invariant 17).

**5. Autonomy.** Deliveries are entirely automatic and entirely unreliable.

**6. Player agency.** Reserve policy, and accepting or refusing an order.

**7. Consequences.** A late delivery is not interesting by itself. It becomes
interesting when the player understands which supply it affects and who needs it.

**8. Events.** Delivery scheduled, arrived, late, partial, refused (notable).

**9. Interface.** Stock panel showing per-item holdings against capacity.

**10. Tests.** Invariant 13. A refused order produces no arrival.

**11. Stage.** 7.

---

## D5. Production, repair, engines, fuel

**Status:** PROVISIONAL · **Stage 8**

**1. Purpose.** Turns the base into a small production system **whose
bottleneck is people, not machines.** That is the game's identity: a factory
game where the factory workers are characters.

**2. State.** Recipes with inputs, outputs, duration, and required skill.
Manufacturing queues. Repair orders. Engines with fuel state and condition.

**3. Rules.** Repair versus manufacture is a genuine tradeoff: fix what you
have, or build a spare you may not need. Engines consume fuel and wear out;
unplanned downtime forces decisions about who works where and when.

**4. Dependencies.** Owns recipes and queues. Reads Resources, D2, D3, B2.
Writes Resources, D2, D3.

**5. Autonomy.** Production runs itself given inputs and workers.

**6. Player agency.** Which job kinds are prioritised, what is reserved.

**7. Consequences.** **The trap, stated explicitly:** the moment players begin
solving this as a throughput puzzle rather than a management story, the game has
changed genre. If the Stage 8 gate reveals that, the response is to pull back,
not to add more optimisation.

**8. Events.** Recipe started, completed, halted (input missing). Engine failed.

**9. Interface.** Queue panel. Engine panel with fuel and condition.

**10. Tests.** No production without inputs. A halted queue records *why*.
Invariant 1 under production load.

**11. Stage.** 8. May merge with 7.

---

## D6. Vehicles

**Status:** PROVISIONAL · **Stage 9**

**1. Purpose.** The natural bridge to the external layer, because a vehicle can
leave the base and not come back.

**2. State.** Per vehicle: `id`, `type`, `condition`, `fuel`, `crew[]`,
`location`, `cargo[]`.

**3. Rules.** Consume fuel, need maintenance, need a qualified driver. Dispatch
is a commitment (C3).

**4. Dependencies.** Owns vehicles. Reads D3 (equipment), D5 (fuel),
Resources. Writes Resources, Facilities.

**5. Autonomy.** Vehicles sit idle until dispatched; they do not act alone.

**6. Player agency.** Dispatch, crew assignment, loadout.

**7. Consequences.** A vehicle that does not return is the game's first
permanent, player-initiated loss.

**8. Events.** Dispatched, arrived, returned (or not). Maintenance performed.

**9. Interface.** Vehicle panel with condition, fuel, crew, history.

**10. Tests.** A vehicle cannot move without fuel and a driver. Condition
degrades with distance travelled.

**11. Stage.** 9.

---

# Group E — The world beyond

---

## E1. Operations and threats

**Status:** OPEN · **Stage 10 · PARKED**

**1. Purpose.** Makes accumulated state matter outside the base. **A raid is
only interesting if there is something to lose.**

**2. State.** Operations with participants, objectives, and outcomes.

**3. Rules.** Resolution must trace to the actual condition of the people and
equipment sent — not to a dice roll. Losses are permanent.

**4. Dependencies.** Reads everything. Writes Personnel, D3, Resources, Events.

**5. Autonomy.** Operations proceed without the player once dispatched.

**6. Player agency.** Who goes, with what, under which orders.

**7. Consequences. Why this is OPEN and not provisional:** the entire system
may not exist. Combat is optional garnish, not the point. If it ships, the
peaceful base must remain a valid way to play.

**8. Events.** Operation dispatched, resolved, casualties, losses.

**9. Interface.** Operation panel.

**10. Tests.** Not applicable until designed in earnest.

**11. Stage.** 10, parked indefinitely. **Prerequisite:** the base simulation
must be a fun game on its own first.

---

# Group F — Continuity and meaning

---

## F1. Relationships

**Status:** PROVISIONAL · **Stage 4 (minimal)**

**1. Purpose.** Makes the event log read as human rather than mechanical.
"Amina and Bakary argued" is more memorable than "Amina and Bakary both
contended for job #4."

**2. State.** Pairwise opinion values per person pair. Persistent.

**3. Rules.** Accumulate from repeated work together. Deliberately simple: a
value per pair, plus a threshold that surfaces one line in the report. **No
dialogue trees, no personality simulation.**

**4. Dependencies.** Owns relationship values. Read by Jobs as a cooperation
modifier — **applied at phase 8, read next tick** (see
`SYSTEM_DEPENDENCIES.md` §8).

**5. Autonomy.** Total.

**6. Player agency.** None directly. This is a reporting layer that occasionally
becomes a gameplay modifier.

**7. Consequences. The hard rule:** **if a relationship value never changes
anything observable, the system has failed and should be cut rather than
expanded.** Decorative relationships are worse than none.

**8. Events.** Threshold crossed (notable, once).

**9. Interface.** In the person's panel and in the report.

**10. Tests.** At least one job duration is measurably affected. Chain E in
`SYSTEM_DEPENDENCIES.md` is demonstrable end-to-end.

**11. Stage.** 4, minimal. Expand only if it earns it.

---

## F2. Anomalies

**Status:** SETTLED · **Stage 5**

**1. Purpose.** Makes a normal day — 95% of what the player sees — worth
watching.

**2. State.** Anomaly rules with eligibility conditions. Persistent.

**3. Rules. Hybrid model** (corrected after external review):

1. **Authored rules** define recognizable situations and possible consequences.
2. **Simulation-gated eligibility** — a rule may only fire when current state
   supports it.
3. **Seeded selection** picks among eligible outcomes via `rand()`.
4. **Causal follow-through** records what changed and what followed.

**An anomaly must earn its place:** change a decision, reveal a risk, create a
story, or inform. Never merely make the log look busy.

**4. Dependencies.** Reads all systems. Writes many. Uses the shared `rand()`.

**5. Autonomy.** Fires entirely on its own schedule and eligibility.

**6. Player agency.** Responds to anomalies through decisions and intent.

**7. Consequences.** A late delivery is not interesting. A late delivery that
starves the workshop on the day the generator fails is.

**8. Events.** Anomaly fired, with the state that made it eligible, and its
downstream consequences.

**9. Interface.** Surfaces through the report and, rarely, as a blocking
decision.

**10. Tests.** Determinism (invariant 14). A logged anomaly has non-empty
eligibility reasons.

**11. Stage.** 5.

---

## F3. Run continuity — history, secrets, achievements

**Status:** PROVISIONAL · **Stage 5** *(run history)* / **Stage 5+** *(secrets, achievements)*

**1. Purpose.** Answers the developer's own question: *"if nothing interesting
happens, and I lose everyone — is a loss still okay?"* Yes, if something
persists.

**2. State.** Persistent across runs: run records, unlocked secrets and
achievements, personnel contribution histories.

**3. Rules.** **Deferred past Stage 5's gate** — they reward a good experience
rather than creating one. If Stage 5 barely passes, they will not save it.

**4. Dependencies.** Owns continuity data. Reads Events and the final state.

**5. Autonomy.** Total.

**6. Player agency.** None.

**7. Consequences.** A collapsed base still leaves a record worth keeping.

**8. Events.** Run concluded, history written.

**9. Interface.** A history screen across runs.

**10. Tests.** Data survives a completed run and appears in the next one.

**11. Stage.** Run history at **Stage 5**; secrets and achievements at **Stage 5+**,
after the Stage 5 gate. *Corrected after the third external review: this entry
previously read simply "Stage 5, deferred", which the roadmap read as Stage 5
while the system map read it as after Stage 5. Two documents, two labels, one
system.*

---

# Group G — Persistence and tooling

---

## G1. Save and load

**Status:** SETTLED (constraint) · PROVISIONAL (UI) · **Stage 3**

**1. Purpose.** Lets the developer playtest across sessions on a phone without
rerunning from a seed every time.

**2. State.** The entire `SimState` as JSON.

**3. Rules.** **The constraint is the feature:** no class instances, functions,
`Map`, `Set`, or `Date` anywhere in state. Plain data only. This makes saves
trivial and is the rule that pays for itself most often.

**4. Dependencies.** Owns nothing. Serialises everything.

**5. Autonomy.** N/A.

**6. Player agency.** Save and load at will.

**7. Consequences.** If the constraint is ever violated, saves become expensive.
That is why it is enforced from the first commit.

**8. Events.** Saved, loaded (recorded outside the simulation).

**9. Interface.** Save/load buttons. Deferred to Stage 3.

**10. Tests.** Invariant 15: every state object survives a JSON round-trip
unchanged. Loading a save and continuing produces the same log as never saving.

**11. Stage.** Constraint at 1; UI at 3.

---

## G2. Headless simulation and testing

**Status:** SETTLED · **Stage 1**

**1. Purpose.** The enforcement mechanism for the pure-simulation rule, and the
reason a full day can be debugged in under a second.

**2. State.** None.

**3. Rules.** Runs N ticks with no browser. Must keep working forever. **If it
ever has to be stubbed to make a feature work, the architecture has broken —
fix that first, before building on it.**

**4. Dependencies.** Reads the simulation. Depends on nothing else.

**5. Autonomy.** Total.

**6. Player agency.** Developer-only.

**7. Consequences.** None directly. It is the guardrail.

**8. Events.** None.

**9. Interface.** Command line.

**10. Tests.** It is itself the test. Plus the 19 invariants in
`SYSTEM_DEPENDENCIES.md` §7.

**11. Stage.** 1.

---

# Appendix — The equipment structural contract

*Added after the third external review.*

Stage 7 is **guaranteed** (D21), which raises the stakes: if it ships as a flat
item list with a condition bar, it satisfies the roadmap and misses the thing
worth years of work. The developer's interest is *inspection* — soldiers,
helmets, clothing, pockets, durability, armour, weapons, loadouts, vehicles.
That interest needs a structural model, not a catalogue of weapon stats.

**This is a contract, not a content list.** Nothing here requires designing 100
weapons. It fixes the shape so Stage 7 can be built without rediscovering what a
"soldier's equipment" is.

## 1. The soldier

| Aspect | Owned by | Notes |
|---|---|---|
| Identity, role, specialty, personality seed | B1 Personnel | exists Stage 2 |
| Skills and history | B1 Personnel | depth decided at Stage 6+ |
| Needs, injuries | B4 Needs | exists Stage 3 |
| Current activity and availability | B1 Personnel | exists Stage 2 |
| **Carried equipment** | **D3 Items, via `assignedTo`** | Stage 7 |
| **Loadout slots — which are filled, empty, or blocked** | **D3 Items** | Stage 7 |
| **Effective capability** | **Derived**, from slots + condition | never stored |

The derived capability is the point. A soldier's ability to perform a task
should be *readable from their gear*, not stored as a number that gear can
silently contradict.

## 2. The item

| Field | Meaning |
|---|---|
| `id` | Stable and unique. Identity must outlive the item's condition — a badly damaged rifle is still *that* rifle |
| `type` | Helmet, clothing, webbing/pockets, armour, weapon, tool, spare part, vehicle part |
| `ownerId` / `assignedTo` | A soldier, or unassigned in storage |
| `locationId` | Where it physically is: a soldier, a facility, a storage, a vehicle |
| `condition`, `wearRate` | 0–1. Owned by Items alone |
| `reliability` | Derived from condition *and* repair history — a repaired item is never quite what it was |
| `repairHistory[]` | Append-only, inspectable. A visible scar is more interesting than a bare number |
| `requiredSlot` | Which slot it occupies if assigned |
| `compatibleWith[]` | Prevents impossible loadouts being representable |
| `consumableState` | Ammunition count, fuel, charge — where relevant |

## 3. Slots, containers, and the ambiguity worth resolving now

The developer's wish to inspect "helmets, clothing, pockets" is genuinely
ambiguous, and leaving it unresolved is how Stage 7 produces a flat list. The
resolution:

> **Slots and containers are the same mechanism at different depths.** A soldier
> has slots (primary weapon, sidearm, helmet, body armour, boots). Clothing and
> webbing are *containers* — they hold pockets or magazines, which are themselves
> slots with capacity. Everything is an item; some items hold other items.

This gives one general mechanism rather than three special cases, and it makes
"which pocket is the spare magazine in?" answerable.

## 4. The loadout

A loadout is **derived, never stored**: the set of items occupying a soldier's
slots, resolved from `assignedTo` and `requiredSlot`.

The interface must be able to answer, for any soldier, at any moment:

- Which slots are filled, and by what
- Which are **empty**, **incompatible**, **broken**, or **held by someone else**
- What the soldier can and cannot currently do as a result
- What changed when an item was removed, damaged, or replaced

**Removal is not symmetric with addition.** Giving a soldier a rifle should be a
decision; taking it away — through failure, theft, or loss — should be an event
the player notices. Losing a capability must never be silent.

## 5. Vehicles in relation to the above

*Vehicles are Stage 9 and may never ship. The contract is fixed anyway so that
vehicles are not retrofitted onto a model that cannot hold them.*

| Question | Answer |
|---|---|
| Are crew members assigned to seats? | Yes — crew is a loadout with role requirements. A seat is a slot |
| Does vehicle cargo differ from base storage? | Yes. Cargo is **mobile**; when a vehicle is gone, its contents are gone |
| How does mounted equipment differ? | A mounted item occupies a vehicle slot. A soldier with a mounted weapon is not carrying it |
| Does damage degrade capability specifically? | Yes — not just a condition bar. A damaged engine changes range and speed; a damaged track immobilises it |
| What happens if a vehicle is lost? | Crew survives or does not (its own chain), cargo is lost, mounted equipment is lost or recovered depending on cause |

**A vehicle is not a fuel bar with an inventory attached.** It is a mobile
platform with slots, crew with qualifications, and damage that changes what it
can physically do.

## 6. What this deliberately does not specify

Weapon statistics, armour values, and a catalogue of equipment types. Those are
content, tuned once the systems exist. Specifying 100 weapons now would be
precisely the "catalogue instead of a simulation" trap the project has avoided so
far.

---

# Appendix — System → stage map

The complete assignment of every system to a stage, so none is left floating.

| System | Stage | Conditional? |
|---|---|---|
| Clock, RNG, events, commands | 1 | No |
| Personnel identity, job selection, facilities | 2 | No |
| Needs (hunger, fatigue), resources, readiness, schedules, save/load | 3 | No |
| Intent (expanded), named-option decisions, reports, relationships | 4 | No |
| Anomalies, commitments, run history | 5 | No |
| *Evidence review — choose one* | 6 | — |
| Roles and specialties, morale, injuries | 6 or 7 | **Yes** |
| **Equipment, loadouts, storage, logistics, deliveries** | **7** | **No — guaranteed (D21)** |
| Production, repair, engines, fuel | 8 | **Yes** |
| Vehicles | 9 | **Yes** |
| Operations, threats, combat | 10 | **Yes — parked** |
| Secrets, achievements | 5+ *(after the Stage 5 gate)* | **Yes** |

---

# Appendix — The seven chains that define the game

Everything above exists to make these possible. If a system cannot be placed in
at least one of them, it is not yet justified.

| Chain | Gate | Defined in |
|---|---|---|
| **A1** — resource contention: work order due → worker already committed → repair deferred → meal late → hunger rises | Stage 5 | `SYSTEM_DEPENDENCIES.md` §7 |
| **A2** — the equipment chain: A1 plus item degrades → repair queue → repair beats meals → meal missed | Stage 8 | §7 |
| **B** — the specialist problem: one absence reshapes the day | Stage 5+ | §7 |
| **C** — the reserve decision: spending now versus saving for later | Stage 5+ | §7 |
| **D** — the departure: neglect compounds until someone leaves | Stage 3+ | §7 |
| **E** — relationship consequence: who works together changes how fast | Stage 4 | §7 |
| **F** — the inspection scenario: weapon issued → used → condition drops → repaired, and the player sees that same item change | Stage 7 | §7 |

**Chain A is the reference chain — and it is now two chains.** The full version
needs individual items (Stage 7) and production (Stage 8), so requiring it by
Stage 5 asked for a demonstration the roadmap could not produce. **A1** (resource
contention, reachable by Stage 5) is now the Stage 5 reference scenario; **A2**
(the full equipment chain) is the Stage 8 demonstration. See `SYSTEM_DEPENDENCIES.md`
§7. If A1 works but A2 does not, the game is still viable — a base simulation
with real contention. The reverse is not acceptable: shipping equipment later,
untested, would leave the military identity of the game unproven.