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

---

## 1. The ownership rule

> **Each piece of state is owned by exactly one system. Only the owner may write
> it. Everyone else reads it.**

If two systems both need to know whether a person is available to work, exactly
one of them asks the Personnel system — neither computes it independently.

**Derived data is computed once, by its owner, and stored.** This is what makes
the project debuggable: when a value looks wrong, there is one place to look.

The one exception is explicitly marked:

| Value | Owner | Exception |
|---|---|---|
| `readiness` | Needs system | **Pure summary. No system may read it except the UI.** |

Readiness is the documented exception because it summarises other systems'
data. Any system reading it would create exactly the circular dependency this
document prevents. Consequences are driven by the underlying conditions instead
(see `LOCKED_DECISIONS.md` D1).

---

## 2. Dependency direction

Dependencies point **one way**. The layering is:

```
┌──────────────────────────────────────────────┐
│  UI                                          │  reads everything, writes nothing
├──────────────────────────────────────────────┤
│  Controller                                  │  clock, speed, commands
├──────────────────────────────────────────────┤
│  Simulation systems                          │  see §3
└──────────────────────────────────────────────┘
```

Within the simulation, systems are grouped into tiers. **A system may only read
from its own tier or higher-numbered (later) tiers within the same tick pass.**

---

## 3. The systems and their tiers

Tier number = evaluation order within a tick. A tier-3 system may read anything
resolved in tiers 1–2, and its own data, but nothing from tier 4+ that has not
been updated yet.

| Tier | System | Owns | Stage |
|---|---|---|---|
| 0 | Clock | `tick`, day boundary | 1 |
| 0 | Player intent | `intent[]` — the orders given | 1 |
| 1 | Events | `log[]`, `log[]` length | 1 |
| 1 | RNG | `seed`, `rngCursor` | 1 |
| 2 | Personnel | identities, roles, skills, current task, task progress, schedule | 2 |
| 2 | Facilities | rooms, capacity, availability | 2 |
| 3 | Needs | hunger, fatigue, hydration, morale, injuries | 3 |
| 3 | Resources | food, water, medical, parts, fuel quantities | 3 |
| 4 | Items | individual equipment, condition, assignment, ammunition | 7 |
| 4 | Commitments | active obligations, deadlines, preparation targets | 5 |
| 5 | Jobs | job definitions, eligibility, progress, queues | 2 |
| 5 | Delivery | scheduled arrivals, in-transit state | 3 |
| 6 | Production | recipes, manufacturing queues, repair orders | 8 |
| 6 | Vehicles | vehicles, condition, fuel, crew assignment | 9 |
| 7 | Operations | missions, expedition state, outcomes | 10 |
| 8 | Readiness | `readiness` — **derived summary, read by nothing** | 3 |
| 8 | Relationships | pairwise opinion values | 4 |
| 8 | Continuity | run history, secrets, achievements | 5 |

**Why Jobs sits at tier 5.** Job selection reads needs (tier 3), facilities
(tier 2), intent (tier 0) and items (tier 4) — all already resolved. Nothing a
job produces can influence selection within the same tick, which is intentional:
it makes the loop stable and prevents oscillation.

---

## 4. Tick order, and why each step sits where it does

The fixed order is not arbitrary. Each entry exists to prevent a class of bug.

| # | Step | Tier | Why here |
|---|---|---|---|
| 1 | Advance clock | 0 | Everything is relative to time. |
| 2 | Apply queued decisions | 0 | Player commands land before anyone acts on them. A command issued last tick takes effect now, deterministically. |
| 3 | Apply intent to priority resolution | 0 | Intent must be readable by job selection. |
| 4 | Update needs | 3 | Needs change, *then* people react to them. Otherwise a worker decides based on last tick's hunger — an off-by-one that makes behaviour feel laggy. |
| 5 | Update facilities and items | 2, 4 | Equipment wear affects whether a job is possible. |
| 6 | Job selection | 5 | Reads needs, availability, intent, items — all current. |
| 7 | Advance job progress | 5 | Work completes. |
| 8 | Resource consumption and production | 3, 6 | **Deliveries are applied *before* consumption** — see §5. |
| 9 | Recompute readiness | 8 | Last, because it summarises everything above. |
| 10 | Relationships | 8 | Reads who worked with whom this tick. |
| 11 | Emit events | 1 | Everything is known, so events can carry accurate causes. |
| 12 | Check for new decisions | 5 | New situations arise from this tick's results. |

### Two ordering choices that were argued about

Both were flagged by external review as **potential biases that must be tested,
not assumed correct.**

**Consumption vs. delivery (step 8).** If consumption happens before a delivery
lands, someone can starve in the same tick food arrives. If delivery comes
first, a stockpile can briefly exceed capacity.

**Decision of record: delivery first.** Rationale — a scheduled arrival is a
fact that happened at this time, and refusing to feed someone because of an
ordering artifact would be indefensible. Capacity overflow is a soft clamp and
produces a visible warning, which is interesting rather than unfair.

*Test required:* both scenarios, asserting no starvation and no silent capacity
loss.

**Needs vs. job selection (steps 4 and 6).** If needs update after selection, a
person's last decision is based on stale information. If before, a person's need
can cross a threshold in the same tick they choose a demanding task.

**Decision of record: needs first.** The alternative produces decisions that look
wrong to the player, which is worse than an occasional borderline case.

*Test required:* a person whose fatigue crosses the decline-threshold while a
demanding task is available — assert they decline it, and that the report
explains why.

---

## 5. Cross-system chains

These are the chains that make the game a game. Each is a **testable scenario**,
not a feature.

### Chain A — the maintenance conflict *(the reference chain)*

```
Item degrades
  → its condition crosses a threshold (Items)
    → it appears in the repair queue (Production)
      → a qualified worker becomes contended (Personnel + Jobs)
        → the repair competes with food preparation (Jobs priority)
          → one is delayed (Jobs)
            → the delayed job's output is missing that tick (Resources)
              → food supply drops (Resources)
                → a meal is missed (Needs)
                  → someone's schedule shifts (Personnel)
                    → readiness contributor moves (Needs)
                      → the player sees the whole chain (Events + Report)
```

**This chain is the design's central claim.** If it cannot be demonstrated
end-to-end by Stage 5, the game is not the game we designed.

### Chain B — the specialist problem

```
A scarce skill is needed (Personnel)
  → only two people have it
    → one is injured or resting (Needs)
      → the job queues (Jobs)
        → dependent facilities degrade (Facilities)
          → repair demand rises (Production)
            → the player must choose what to delay (Intent)
              → consequences compound (all of the above)
```

**Design intent:** this is what makes named individuals matter. The player never
controls the specialist — they manage around their absence.

### Chain C — the reserve decision

```
Supplies are limited (Resources)
  → the player spends them on operations now, or reserves for later (Intent)
    → an unexpected shortage arrives (Delivery + Anomaly)
      → the reserve decision becomes visible
        → the player sees what their earlier choice cost
```

**Design intent:** preparation creates meaning without requiring constant
emergencies.

### Chain D — the departure

```
Sustained neglect (Needs)
  → declining effectiveness (Personnel reads Needs — never Readiness)
    → refuses optional assignments (Personnel)
      → fewer jobs get done (Jobs)
        → more problems accumulate (all systems)
          → eventual departure (Personnel)
            → the specialist problem, one step worse (Chain B)
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

## 6. Adding a new system without breaking the graph

The procedure, for when Stage 6 selects a new system:

1. **Name the data it will own.** New state goes in one place. If you need a
   value that another system already owns, you *read* it — do not copy it.
2. **Assign a tier.** Pick the lowest tier whose inputs are all resolved.
3. **Declare reads and writes.** Write down which systems it reads and which
   write to it. A write from a lower tier to a higher tier is a red flag.
4. **Add its tick step** in the position its tier dictates. Do not invent a new
   position for convenience.
5. **Write the invariants** before the code (see §7).
6. **Add one cross-system chain** that includes it. A system with no chain is a
   system with no reason to exist.

**The test for a well-integrated system:** you can describe one chain of causes
from its inputs to a consequence the player notices, with no other system
duplicating its logic.

---

## 7. Invariants

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

Invariants 12 and 15 deserve emphasis: 12 enforces the architecture from the
inside, and 15 is what makes saving cheap. Both are cheap to test and expensive
to discover late.

---

## 8. Circular dependency traps

Specific ways this graph can go wrong, and the rule that prevents each.

| Trap | Rule that prevents it |
|---|---|
| Personnel reads Readiness, Readiness reads Needs, Needs reads Personnel | Readiness is terminal and read by nothing (§1) |
| Jobs and Production both decide how long a repair takes | Production owns recipe duration; Jobs asks Production |
| Two systems both apply "rest reduces fatigue" | Needs owns the rule; Personnel asks for the effect |
| UI computing derived values to render faster | UI may derive for display, never for state, and never writes |
| Anomaly system inventing its own randomness | Anomaly uses the same `rand()`, or the replay breaks |
| Relationships changing job difficulty *and* job difficulty changing relationships | Relationships write the multiplier at tier 8; Jobs reads it next tick |

**The general rule:** if a cycle exists, one participant must be cut from the
loop by making it a summary, a next-tick read, or a pure output.

---

## 9. Debugging order

When something looks wrong, check in this order. It follows the dependency graph.

1. **Reproduce headlessly.** Get a seed that shows the problem.
2. **Read the event log backwards** from the wrong outcome. Follow `causeEventIds`.
3. **Check the owning system** for the value that looks wrong. One place.
4. **Check tick ordering** if the value is correct but applied at the wrong moment.
5. **Check hysteresis** if the behaviour is right but the timing is wrong.

Never fix a symptom in the UI. The UI cannot cause a simulation bug, so if the
UI looks wrong, the simulation data it received is wrong.