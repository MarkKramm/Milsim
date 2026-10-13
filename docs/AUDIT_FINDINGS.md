# Audit Findings

**An audit of the design's own completeness, run after the third external
review.** The three reviews all examined the documents by following pointed
questions. This audit instead asks a different question:

> **If an agent started the later stages today, from these documents alone,
> would it build what we meant?**

Three reviews found real contradictions by being *shown* something. Nobody had
yet checked whether the later half of the project had ever been specified at all.

**Method.** Measured rather than read-and-opined: per-stage content counts,
per-system word counts, chain coverage of every system, and searches for
concepts claimed but never defined.

**This document records findings. It does not fix them.** Several findings are
Stage 5+ questions that cannot honestly be answered early, and answering them
now would be exactly the drift the roadmap warns against. Those are named as
open, not silently patched.

---

## 1. The later stages are specified far less than the earlier ones

This is the central finding.

| Stage | Lines | Build items | Gate | Questions passed forward |
|---|---|---|---|---|
| 1 — State advances | 52 | 6 | yes | 0 |
| 2 — Autonomous jobs | 75 | 10 | yes | 0 |
| 3 — Needs | 30 | 9 | yes | 1 |
| 4 — Decisions | 23 | 8 | yes | 1 |
| 5 — Reasons to continue | 42 | 7 | yes | 2 |
| **6 — Evidence review** | 34 | 0 | *n/a (a decision)* | 0 |
| **7 — Equipment** | 20 | **0** | yes | **0** |
| **8 — Production** | 14 | **0** | yes | **0** |
| **9 — Vehicles** | **5** | **0** | **no gate** | **0** |
| 10 — Operations | 71 | 8 | yes | 0 |

Stages 1–5 have build lists, gates, and forward questions. **Stages 7–9 have
none of the three.** Stage 9 is five lines long.

**This is worse now than it was before the third review.** D21 made Stage 7
*guaranteed* — a commitment — while it is the second thinnest stage in the
document. We made a promise and did not pay for it with specifications. A
guaranteed stage with no build list is a hope, not a plan.

**Stage 10 is the exception** at 71 lines with 8 build items, because it is
parked and was written exhaustively. Being "parked" made it better specified
than the stages most likely to actually ship.

## 2. Stage 9 has no gate

The roadmap's summary table promises Stage 9's gate — *"a dispatched vehicle can
leave and not return"* — and `REVIEW_BRIEF.md` repeats it. **The Stage 9 section
does not define one.** Stage 6 has no gate either, which is correct: it is a
decision, not a build.

A stage with no gate cannot be completed or abandoned, only quietly abandoned.
That is precisely the failure the gate discipline exists to prevent.

## 3. Eleven systems have no cross-system chain

`SYSTEM_DEPENDENCIES.md` §5 states the rule: *"A system with no chain is a
system with no reason to exist."* Measured against that rule, **11 of 24 systems
violate it** (4 more — Clock, RNG, Events, Commands — are infrastructure and are
legitimately exempt; they have invariants instead).

Uncovered systems:

| System | Why it matters that it has no chain |
|---|---|
| **Decisions** | The player's *primary agency mechanism*. Nothing demonstrates that a decision changed anything. Stage 4's gate asserts it does, but no chain proves it. |
| **Anomalies** | The entire answer to "boring days." Unproven as a mechanism. |
| **Facilities** | Capacity is what creates contention in Chain A1 — yet capacity has no chain of its own. |
| **Storage** | Owns the holdings that every resource chain depends on. |
| **Delivery** | Has an ordering decision of record ("deliveries before consumption") and no chain. |
| **Continuity** | Run history is the answer to "is a loss still okay?" — untested. |
| **Morale** | Already flagged as a cuttable system. It has no chain and no proof it contributes. |
| **Injuries** | Called out as caused by the player's own choices — unproven. |
| **Skills** | A Stage 6 candidate with no specification beyond a table cell. |
| **Vehicles** | Stage 9 has no gate *and* no chain. |
| **Operations** | Same, and parked. |

**The pattern is consistent:** the systems with the strongest claims in the
blueprint are the least demonstrated. Chains A–E were written early, when the
design centred on personnel and resources, and were never extended to cover what
was added afterwards.

## 4. Emergence is the project's premise and is nowhere designed

The game's identity is that interconnected systems produce consequences no one
scripted. It is the reason for pure simulation, seeded determinism, and the
causal event log.

**Searched all 24 documents: the concept appears once, in passing**
(`LOCKED_DECISIONS.md` D3, on anomalies). There is:

- **No list** of what is *supposed* to emerge.
- **No mechanism** describing how emergence is encouraged or bounded.
- **No test** for whether it happened.
- **No distinction** between emergence that is designed-for and emergence that
  is merely permitted.

So the central promise is untested. The gate evidence asks *"did you notice
something before the report told you?"* — which is a proxy for emergence — but
it is measured per stage rather than tracked as a property of the whole game.

**This is the finding most worth acting on**, because it is the one the design
test in `REVIEW_BRIEF.md` Part 1 actually reduces to, and nothing currently
checks it.

## 5. No terminal state

If every person leaves, the design does not say what happens. `F3` says *"a
collapsed base still leaves a record worth keeping"* — which is a statement
about continuity, not a rule about the run.

Is it a loss? A reset? An ending with a summary? Can it be recovered from? This
is the ultimate stakes question and no document answers it. The graduated
consequence ladder (D1) ends at "leaves" and stops.

Given the project's rejection of fail states, an honest answer is likely "the
run continues in a diminished form, or ends gracefully" — but that must be
*decided*, not defaulted into by whatever the code happens to do.

## 6. The four substrate systems are the thinnest

Word count per system, measured:

| System | Words | Note |
|---|---|---|
| **D2 Facilities** | **145** | Thinnest. Owns the capacity that creates all contention. |
| **D6 Vehicles** | 147 | |
| **D1 Resources** | 151 | Owns no mutable field after the recent correction, but carries the consumption *rules*. |
| **D4 Storage and logistics** | 153 | Owns every holding. |
| B3 Autonomous job selection | 296 | |
| B4 Needs | 322 | |
| D3 Items | 324 | |

The four thinnest are precisely the substrate everything else stands on. They
are thin because they were assumed simple — but "resources" is not a number,
"storage" is not a capacity, and "facilities" is what makes a queue exist at all.

## 7. Two smaller inconsistencies

**Combined interrupt rate is not bounded.** Individual systems throttle
themselves — true interrupts are capped at ~1 per in-game day (D8) — but three
systems generate interruptions (decisions, anomalies, commitments). Nothing
bounds the *combined* rate. Interrupt fatigue is the characteristic failure mode
of this genre.

**Base size is asserted, never justified.** Stage 2 specifies 6–8 personnel with
no reasoning recorded anywhere. This matters beyond Stage 2: Chain B needs
specialists (one specialist among seven is fragile, not dramatic) and Chain D
needs a departure to actually hurt.

## 8. What the audit did not find

Worth stating, since a review that only finds problems is not a review:

- **No dangling references.** Every cross-document path resolves; the
  reorganisation left nothing broken.
- **No duplicated logic between documents** after the fourth review's fixes.
- **Stage 1 and the Stage 1 contract are complete** — the recent contract work
  means Stage 1 could be built today without inventing anything.
- **The back-half stage table is honest** — conditional stages are labelled
  conditional everywhere. Nothing pretends to be more finished than it is,
  except Stages 7–9, which understate rather than overstate.

---

## Severity

| # | Finding | Severity | Stage to answer |
|---|---|---|---|
| 4 | Emergence never designed or tested | **High** | 5 |
| 1 | Stages 7–9 unspecified; Stage 7 guaranteed but thin | **High** | 6 |
| 5 | No terminal state | **High** | 5 |
| 3 | 11 systems with no chain, incl. Decisions and Anomalies | **High** | 5–7 |
| 2 | Stage 9 has no gate | Medium | before 9 |
| 6 | Substrate systems thinnest | Medium | 3 |
| 7 | Combined interrupt rate unbounded | Medium | 4–5 |
| 7 | Base size unjustified | Medium | 2 |

## What should happen

**Not a fourth planning pass.** Findings 4, 5 and 3 are Stage 5+ questions and
would be answered badly if answered now. Finding 1 is the exception that should
be paid for immediately, because D21 made a promise that has not been funded.

The honest position:

> **The first half of this project is specified well enough to build. The
> second half is named, gated in outline, and thin in detail — which is
> defensible *until* you make a stage guaranteed, and then it stops being
> defensible.**

Two actions, and then Stage 1:

1. ~~**Fund the D21 promise.**~~ **Done after the fourth external review.**
   Stage 7 now has a build list, its own minimal repair queue, and Chain F as its
   gate. The prerequisite problem it exposed is also closed: Stage 7 no longer
   depends on the conditional Stage 8.
2. **Carry findings 3, 4 and 5 into `OPEN_QUESTIONS.md`** as Stage 5+ questions
   so they are answered at the point where evidence exists, not forgotten.