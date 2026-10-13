# System Dependencies

**Who owns which data, which system reads which, and why the tick order is
what it is.**

This document exists to prevent two specific failure modes:

1. **Duplicated rules.** Two systems independently deciding how tired someone
   is, or how long a repair takes, so they disagree.
2. **Circular dependencies.** System A needs B's data and B needs A's, so neither
   can be written alone.

Every rule lives in exactly one system. Other systems *read* its output; they
never recompute it.

> **Corrected after the third external review.** An earlier version of this
> document used "tier" to mean two different things at once — dependency
> direction *and* execution order — and consequently stated two opposite rules
> in consecutive paragraphs. Those concepts are now separate, and the numbering
> was wrong: tier numbers did not match the tick order they claimed to describe.
> See §2.

---

## 1. Three concepts, kept separate

Confusing these is what produced the contradiction. They are different things
and use different vocabularies.

| Concept | Question it answers | Where it lives |
|---|---|---|
| **Ownership** | Who may *write* this field? | §3 — the field table |
| **Phase** | *When* does this system run within a tick? | §4 — chronological |
| **Service** | Which machinery is available at every phase? | §2 — cross-cutting |

**Ownership is the real protection against cycles.** A cycle cannot exist if
only one system can write each field. Phases make timing explicit; they are a
readability and correctness aid, not the cycle-breaker.

---

## 2. Services (cross-cutting, not phases)

These have no phase because they are used *by* every phase. They are the
machinery, not the simulation.

| Service | Owns | Used by |
|---|---|---|
| **Time** | `tick` | every phase |
| **RNG** | `seed`, `rngCursor` | every phase that needs randomness |
| **Events** | `log[]`, `nextEventId` | every phase that changes anything |
| **Commands** | `pendingCommands[]` | applied once, at the start of every tick |

**An earlier version placed Events at tier 1 while also emitting them last.**
That was incoherent: a service cannot be early and late. Events are now
explicitly *outside* the phase sequence — every phase writes to the log as it
goes, and there is no "emit events" phase at all.

---

## 3. Ownership: every mutable field

> **Each field is owned by exactly one system. Only the owner may write it.
> Everyone else reads it, or *requests* a change.**

If two systems both need to know whether a person is available to work, exactly
one of them asks the Personnel system. Neither computes it independently.

### The request pattern

A system never writes another system's field. It emits a **request**, and the
owner decides whether and how to apply it. This is what keeps single ownership
possible even when two systems care about the same value.

```
Jobs decides:     "this work consumed 1 ration"        → request
Resources owns:   applies it to storage, writes an event explaining why
```

If the owner can refuse — capacity full, insufficient stock — it refuses and
records why. A request that cannot be refused is a bug: it means the requester
has assumed authority it does not have.

### The field table

| Field | Owner | Others may | Stage |
|---|---|---|---|
| `tick` | Time | read | 1 |
| `seed`, `rngCursor` | RNG | read `seed` | 1 |
| `log[]`, `nextEventId` | Events | append via `emit()` | 1 |
| `pendingCommands[]` | Commands | enqueue | 1 |
| `intent[]` | Player intent | read | 1 |
| `persons[].identity`, `.role`, `.specialties`, `.history` | Personnel | read | 2 |
| `persons[].currentTask`, `.taskProgress`, `.location` | Personnel | request | 2 |
| `persons[].schedule` | Personnel | read, request | 2 |
| `facilities[]`, `.capacity`, `.availability` | Facilities | request | 2 |
| `items[]`, `.condition`, `.wear`, `.reliability`, `.assignedTo` | Items | request | 7 |
| `storage[].holdings`, `.location`, `.capacity` | Storage | request | 7 |
| `resources` *(aggregate)* | **Derived by Resources from Storage** | read | 3 |
| `persons[].needs` — hunger, fatigue, hydration | Needs | request | 3 |
| `persons[].morale` | **Derived by Needs** | read | 6 |
| `persons[].injuries[]` | Needs | request | 6 |
| `deliveries[]` | Delivery | read | 3 |
| `jobs[]` — definitions, eligibility, prerequisites | Jobs | read | 2 |
| `jobs[]` — progress, queues, assignment | Jobs | request | 2 |
| `recipes[]`, `.productionQueue` | Production | request | 8 |
| `commitments[]` | Commitments | read, request | 5 |
| `decisions[]` | Decisions | request | 4 |
| `relationships[]` | Relationships | read | 4 |
| `runHistory`, `.secrets` | Continuity | append | 5 |
| `vehicles[]`, `.condition`, `.fuel`, `.crew` | Vehicles | request | 9 |
| `readiness` | **Derived by Needs — read by nothing but the UI** | *nothing* | 3 |

### Three entries that were previously ambiguous

**`readiness` and `morale` are derived, not owned.** An earlier version listed
`readiness` both as owned by Needs (§1) and as its own system at tier 8 (§3).
Both were describing the same field from two angles. Resolved: **Needs computes
them; nothing writes them as state; nothing reads them except the UI.** They are
computed fresh each tick and never persisted, so no system can come to depend on
a stale copy.

**`resources` versus `storage`.** An earlier version had Resources owning
quantities while Storage also claimed holdings per resource. Resolved: **Storage
owns physical holdings and where they are. Resources owns no mutable field at
all** — it is a derived aggregate over Storage, plus the *rules* for how much an
action consumes. Consumption is therefore a request from the consuming system to
Storage, never a direct write.

**`condition` degrades with use.** Item condition was specified both as
degrading during use (§3 rules) and as changing *only* through repair or
production (§10 tests). Those contradict. Resolved: **Items owns wear and
applies it. Wear is applied during use — by Items, not by the system doing the
using.** A job that damages equipment sends a `wear(itemId, amount)` request.
Invariant 16 enforces that only Items writes `condition`.

---

## 4. Phases: the tick order

A **phase** is a chronological position in the tick. Phase numbers *are*
execution order. (Earlier versions claimed this and then violated it — Needs sat
at "tier 3" while Facilities sat at "tier 2", yet Needs ran first.)

**Read rule: a system in phase N may read any field owned by a system in phase
≤ N. Reading a later phase's field is a bug.**

This is a single, unambiguous rule. It replaces the earlier contradiction where
§2 said "read your own tier or higher-numbered tiers" and §3 said the opposite.

| Phase | System | Stage |
|---|---|---|
| 0 | Clock, Commands, Player intent | 1 |
| 1 | Facilities, Items | 2, 7 |
| 2 | Delivery | 3 |
| 3 | Resources *(deliveries applied before consumption)* | 3 |
| 4 | Needs | 3 |
| 5 | Jobs — selection, then progress | 2 |
| 6 | Production | 8 |
| 7 | Vehicles, Operations | 9, 10 |
| 8 | Relationships | 4 |
| 9 | Derived summaries — readiness, morale | 3, 6 |
| 10 | Decisions — check for new situations | 4 |

| # | Step | Phase | Why here |
|---|---|---|---|
| 1 | Advance clock | 0 | Everything is relative to time. |
| 2 | Apply queued commands | 0 | Player commands land before anyone acts on them. A command issued last tick takes effect now, deterministically. |
| 3 | Apply intent to priority resolution | 0 | Intent must be readable by job selection. |
| 4 | Update facilities and items | 1 | Equipment wear affects whether a job is possible. |
| 5 | Apply deliveries | 2 | **Deliveries before consumption** — see §6. |
| 6 | Resource consumption and production | 3 | Consumes what just arrived. |
| 7 | Update needs | 4 | Needs change, *then* people react to them. Otherwise a worker decides based on last tick's hunger — an off-by-one that makes behaviour feel laggy. |
| 8 | Job selection | 5 | Reads needs, availability, intent, items — all current. |
| 9 | Advance job progress | 5 | Work completes. |
| 10 | Relationships | 8 | Reads who worked with whom this tick. |
| 11 | Recompute derived summaries | 9 | Summarises everything above. |
| 12 | Check for new decisions | 10 | Must follow every other phase, or a decision could be raised on a situation that has not finished resolving. |

**Events are written throughout, not at a step.** There is no emit phase. A
system emits as soon as it knows something notable, which is what allows causes
to reference earlier events in the same tick.

**Why Jobs is phase 5.** Job selection reads needs (4), facilities (1), intent
(0) and items (1) — all resolved. Nothing a job produces can influence selection
within the same tick, which is intentional: it makes the loop stable and prevents
oscillation.

**Why deliveries precede consumption** — see §6.

---

## 5. Adding a new system without breaking the graph

The procedure, for when Stage 6 selects a new system:

1. **Name the data it will own.** Every mutable field goes in one row of §3. If
   you need a value another system already owns, you *read* it or *request* it —
   never copy it.
2. **Declare its reads and writes.** Which fields does it read, which does it
   own, which requests does it send? If it owns nothing, ask whether it is a
   derived summary or a service.
3. **Assign a phase.** Pick the phase after every system it reads.
4. **Add its tick step** in that position. Do not invent a new position for
   convenience.
5. **Write the invariants** before the code (§7).
6. **Add one cross-system chain** that includes it (§6). A system with no chain
   is a system with no reason to exist.

**The test for a well-integrated system:** you can describe one chain of causes
from its inputs to a consequence the player notices, with no other system
duplicating its logic.

---

## 6. Two ordering choices that were argued about

Both were flagged by external review as **potential biases that must be tested,
not assumed correct.**

**Consumption vs. delivery (steps 5 and 6).** If consumption happens before a
delivery lands, someone can starve in the same tick food arrives. If delivery
comes first, a stockpile can briefly exceed capacity.

**Decision of record: delivery first.** Rationale — a scheduled arrival is a
fact that happened at this time, and refusing to feed someone because of an
ordering artifact would be indefensible. Capacity overflow is a soft clamp and
produces a visible warning, which is interesting rather than unfair.

*Test required:* both scenarios, asserting no starvation and no silent capacity
loss.

**Needs vs. job selection (steps 7 and 8).** If needs update after selection, a
person's last decision is based on stale information. If before, a person's need
can cross a threshold in the same tick they choose a demanding task.

**Decision of record: needs first.** The alternative produces decisions that look
wrong to the player, which is worse than an occasional borderline case.

*Test required:* a person whose fatigue crosses the decline-threshold while a
demanding task is available — assert they decline it, and that the report
explains why.

---

## 7. Cross-system chains

These are the chains that make the game a game. Each is a **testable scenario**,
not a feature.

### Chain A — the maintenance conflict *(the reference chain)*

> **Split after the third external review.** The full chain requires individual
> items (Stage 7) and production (Stage 8). An earlier version demanded it be
> demonstrated end-to-end by **Stage 5**, which was impossible — the roadmap did
> not deliver the systems it needed. Claiming a demonstration the plan could not
> produce was worse than having no claim at all, because it would have been
> disproved rather than never tested.
>
> It is now two chains with two gates.

**A1 — resource contention *(the Stage 5 reference scenario)***

Reachable with systems available by Stage 5. No individual items required.

```
A scheduled repair work order comes due (Production/Commitments)
  → a qualified worker is already committed (Personnel + Jobs)
    → the repair is deferred in favour of a meal being prepared (Jobs priority)
      → a meal is served late (Jobs + Resources)
        → someone's hunger rises past a threshold (Needs)
          → they work slower, or decline the next demanding task (Needs → Personnel)
            → the player sees the cause chain in the report (Events + Report)
```

**Stage 5 gate:** demonstrate A1 end-to-end and show the player a meal that was
late for a traceable reason. This tests the central idea — *contention produces
consequences the player can follow* — without pretending the equipment system
exists.

**A2 — the equipment chain *(Stage 7 + 8)***

The original chain, requiring individual items and a repair queue.

```
Item degrades through use (Items)
  → its condition crosses a threshold (Items)
    → it appears in the repair queue (Production)
      → a qualified worker becomes contended (Personnel + Jobs)
        → the repair competes with food preparation (Jobs priority)
          → one is delayed (Jobs)
            → the delayed job's output is missing that tick (Resources)
              → food supply drops (Resources)
                → a meal is missed (Needs)
                  → someone's schedule shifts (Personnel)
                    → a readiness contributor moves (Needs — derived, never causal)
                      → the player sees the whole chain (Events + Report)
```

**Stage 8 gate:** demonstrate A2 end-to-end, with the worn item inspectable
before and after.

**If A1 works but A2 does not,** the game is still viable — it is a base
simulation with resource contention. What must not happen is the reverse: if only
A1 was ever tested and equipment arrived later untested, the military identity of
the game would be unproven.

### Chain F — the inspection scenario *(the Stage 7 gate)*

The chain that proves individual equipment is real rather than a list with a
condition bar.

```
A weapon is issued to Bakary and he carries it (Items)
  → his loadout shows the primary-weapon slot filled (Items)
    → he is assigned work needing that weapon (Jobs)
      → the weapon is used and its condition drops (Items applies wear)
        → he can be inspected, with a repair-history entry (Items + UI)
          → a repair changes that same item, and the player sees it (Items)
```

**Rule:** if a condition value never changes as a *consequence of use*, Items is
showing a decoration rather than a system.

### Chain B — the specialist problem

```
The one person qualified for a task is absent (Personnel)
  → the task has no eligible worker (Jobs)
    → it waits (Jobs)
      → its output is late (Resources)
        → something downstream is short (Needs, Production)
          → a second person is trained or hired, or the task is automated
```

### Chain C — the reserve decision

```
Stock is adequate today and short in three days (Resources)
  → the player may spend it now, or hold it (Intent)
    → the choice has consequences either way (Jobs, Needs)
      → holding produces a shortage later; spending produces one now
```

### Chain D — the departure

```
Sustained neglect raises fatigue past thresholds (Needs)
  → the person declines demanding work (Personnel)
    → output falls (Jobs, Resources)
      → more work falls to others (Jobs)
        → their need state worsens too (Needs)
          → eventually someone leaves (Personnel)
```

### Chain E — relationship consequence

```
Two people repeatedly work the same job (Personnel + Jobs)
  → pairwise opinion shifts (Relationships)
    → cooperation becomes faster, or coordination fails (Jobs modifier)
      → a specific job takes longer or shorter than expected
        → the report attributes it to the relationship
```

**Rule:** if a relationship value never changes anything observable, the
Relationships system has failed and should be cut rather than expanded.

---

## 8. Invariants

Structural properties that must hold after any number of ticks. These are the
primary test suite (`ARCHITECTURE.md` §10).

| # | Invariant | Protects against |
|---|---|---|
| 1 | No resource is ever negative | consumption ordering bugs |
| 2 | Resource totals equal the sum of their holdings | double-counting across systems |
| 3 | No person holds two active jobs | selection race conditions |
| 4 | No job progresses without a valid worker | orphaned jobs |
| 5 | No job progresses without its prerequisites | prerequisites not enforced |
| 6 | Every event's cause IDs exist and are earlier ticks | broken causality |
| 7 | Needs stay within [0, 1] | unbounded drift |
| 8 | Readiness never falls during legitimate rest | the rest/idleness bug |
| 9 | A person who declined a demanding task keeps refusing | hysteresis failure |
| 10 | The tick count advances by exactly 1 per tick | clock bugs |
| 11 | The RNG cursor advances only inside `rand()` | determinism breaks |
| 12 | No system reads `state.readiness` except the UI | the summary becoming causal |
| 13 | Storage never silently exceeds capacity | capacity clamp bugs |
| 14 | Same seed + same commands → identical event log | determinism regressions |
| 15 | Every state object survives JSON round-trip | save/load breakage |
| 16 | Only Items writes `items[].condition` | the wear-vs-repair contradiction |
| 17 | Only Storage writes `storage[].holdings` | the Resources/Storage split |
| 18 | No system writes a field it does not own | ownership collapse |
| 19 | Every phase reads only fields owned by its own or earlier phases | ordering violations |

Invariants 12, 16, 17 and 18 are the ones that enforce this document. Invariant
19 is mechanically checkable and should be tested directly rather than trusted.

---

## 9. Circular dependency traps

Specific ways this graph can go wrong, and the rule that prevents each.

| Trap | Rule that prevents it |
|---|---|
| Personnel reads Readiness, Readiness reads Needs, Needs reads Personnel | Readiness is terminal and read by nothing (§3) |
| Jobs and Production both decide how long a repair takes | Production owns recipe duration; Jobs requests it |
| Two systems both apply "rest reduces fatigue" | Needs owns the rule; Personnel requests the effect |
| A job damaging its own equipment | Items owns wear; the job sends a `wear()` request |
| Resources decrementing stock directly | Storage owns holdings; Resources sends a `consume()` request |
| UI computing derived values to render faster | UI may derive for display, never for state, and never writes |
| Anomaly system inventing its own randomness | Anomaly uses the same `rand()`, or the replay breaks |
| Relationships changing job difficulty *and* job difficulty changing relationships | Relationships write the multiplier at phase 8; Jobs reads it next tick |
| A system reading a later phase's field to be "fresher" | Invariant 19 |

**The general rule:** if a cycle exists, one participant must be cut from the
loop by making it a summary, a next-tick read, or a pure output.

---

## 10. Debugging order

When something looks wrong, check in this order. It follows the ownership table.

1. **Reproduce headlessly.** Get a seed that shows the problem.
2. **Read the event log backwards** from the wrong outcome. Follow `causeEventIds`.
3. **Check the owning system** for the value that looks wrong. One place.
4. **Check the phase** if the value is correct but applied at the wrong moment.
5. **Check hysteresis** if the behaviour is right but the timing is wrong.

Never fix a symptom in the UI. The UI cannot cause a simulation bug, so if the