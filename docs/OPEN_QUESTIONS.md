# Open Questions

Every decision that is not fully settled, with its status, its alternatives, and
**how or when it will be decided.**

| Status | Meaning |
|---|---|
| **SETTLED** | Direction is clear. Revisiting requires a reason. |
| **PROVISIONAL** | A preferred design exists; testing may change it. |
| **OPEN** | Alternatives remain. The deciding evidence is recorded below. |

**No question here blocks Stage 1.** Questions are grouped by the stage at which
they become answerable.

**19 questions, numbered Q16–Q35.** The numbering skips Q20: it was a question
about log retention that the event-log design (§A3) had already answered by the
time the list was written. It is recorded here rather than renumbered so the
numbering stays stable against the earlier drafts and reviews that cite it.

---

## Answerable now — Stage 1

*(none. Stage 1 is a clock, seeded randomness, an event log, and a headless
runner. There is nothing design-dependent in it.)*

---

## Answerable at Stage 2 — the first base

---

### Q25. What is the first prototype's single most important question? — PROVISIONAL

We have always asked *"is watching an autonomous base interesting?"* External
review proposed a sharper version:

> Can the player anticipate a problem, make a meaningful intervention, and later
> recognise the consequences of that intervention?

- **Adopted as the design test for the whole project.** Both versions are now in
  use at different scopes: Stage 2 tests whether *a priority* changes behaviour;
  Stage 4 tests whether *a meaningful tradeoff* produces traceable consequences.
- **Decided by:** playing Stage 2. If intent visibly changes nothing, the gate
  fails and something is wrong with C1, not with the player.

---

### Q29. Is the "reason they chose it" explanation enough? — OPEN

The roster must show *why* each person picked their current task.

- Options: literal rule citation ("no food available, hungry"); plain-language
  summary; both, with a details toggle.
- **Decided by:** watching a real player use it. If they never look at it,
  simplify it. If they look and are confused, rewrite it.
- **Smallest experiment:** show both variants in one play session.

---

### Q30. Does hysteresis work, or do people still dither? — OPEN

- **Decided by:** invariant 9 plus observation at Stage 2.
- **If it fails:** the forfeit penalty needs raising, or task-selection needs a
  minimum commitment duration.

---

## Answerable at Stage 3 — needs and consequence

---

### Q21. Is readiness adding anything, or just duplicating hunger and fatigue? — PROVISIONAL

Now that readiness is a *pure summary that no system reads* (see D1), the
sharper question applies: if it is computed from hunger, fatigue, and workload,
what does it tell the player that those three do not?

- **If the honest answer is "not much", cut it.** Deleting it costs one panel,
  because it is not wired into anything. That was the point of making it a
  summary.
- **Decided by:** playing Stage 3 and asking whether the readiness panel was ever
  informative rather than decorative.
- **Note:** this is the single cheapest feature in the project to remove, and
  that is intentional.

---

### Q22. How should rest be distinguished from idleness? — PROVISIONAL

Already corrected: legitimate rest must not count against the base. The
mechanism is still open.

- Options: current *activity* determines it; a cooldown after work; an explicit
  "resting" state with its own duration.
- **Sub-question:** is there a cost to resting when the base needs you? If so, is
  that fair, and can the player farm good outcomes by deliberate rest?
- **Decided by:** Stage 3 playtesting. **Invariants 8** enforce the minimum
  regardless of which option wins.

---

### Q18. What happens when the player faces an unfixable problem? — PROVISIONAL

A good simulation sometimes forces an unwinnable position. Without warning,
response, or room to recover, that feels unfair rather than demanding.

The player should understand what went wrong, what capability remains, which
options reduce the damage, and which consequences are already unavoidable.

- **Not every bad outcome must be preventable** — that is fine. The test is
  whether the player can **learn** from it.
- **How much warning is too much?** A game that always warns has no tension.
- **Decided by:** deliberately causing a bad run in Stage 3 and watching whether
  the reaction is "that was my fault" or "that was arbitrary." The difference is
  the whole question.

---

### Q23. What makes someone leave, versus merely unhappy? — PROVISIONAL

The consequence ladder exists; its top is not set.

- **Open:** how severe for sustained neglect? Is anyone ever unrecoverably lost,
  or can the base always rebuild its staff? Should a departure be permanent?
- **Decided by:** watching several Stage 3 runs. **Not before.**
- **Standing constraint:** the developer has confirmed that final tuning and
  irreversible-loss rules stay provisional until tested. The ladder is designed;
  its top is deferred.

---

### Q31. Does the simulation continue while the player inspects someone? — OPEN

- Options: always; pause automatically on inspect; player-selectable.
- **Decided by:** Stage 3, once inspection exists alongside a running simulation.
- **Note:** the original plan assumed free inspection. Whether that is actually
  pleasant is untested — pausing to read is often the more relaxing option.

---

## Answerable at Stage 4 — command and consequences

---

### Q24. How many distinct intents before the player stops reading them? — OPEN

The intent layer risks recreating the slider problem in a new place.

- Is there a natural ceiling — five? eight? twelve?
- Should some intents have defaults so the player need never touch them?
- How do we surface "your intent is being ignored" without punishing normal play?
- **Decided by:** adding intents one at a time at Stage 4 and stopping when
  observation says the last one was not read.

---

### Q26. Do relationships have an observable effect, or should they be cut? — OPEN

- **Hard rule already adopted:** if a relationship value never changes anything
  observable, the system has failed and should be cut rather than expanded.
- **Decided by:** whether Chain E in `SYSTEM_DEPENDENCIES.md` §5 is demonstrable
  end-to-end at Stage 4.

---

### Q27. How much should the game explain its reasoning? — PROVISIONAL

- Options: fully transparent; partly opaque; adaptive.
- **Leaning:** fully transparent for causes, opaque for future outcomes. The
  player should fully understand the immediate tradeoff while remaining uncertain
  about what depends on later events.
- **Decided by:** Stage 4, and partly by Q33.

---

## Answerable at Stage 5 — reasons to continue

---

### Q16. What is the long-term purpose? — PROVISIONAL · **the most important open question**

The brief explicitly says this is not an infinite sandbox, but nothing defines
what a successful run looks like.

**Provisional structure, per the developer's direction to combine rather than
choose:**

1. **Maintain and improve** the base — personnel and equipment stay functional.
2. **Prepare for commitments** — the player chooses what to prioritise ahead of
   time.
3. **Fulfil commitments** — which gives preparation a reason to matter.
4. **Absorb consequences** — failures change the situation rather than ending the
   game.
5. **Accumulate history** — what happened today changes tomorrow.

This gives the player a reason to care about Day 5 without an external enemy.

- **Deliberately not decided:** campaign structure, win conditions, exact balance
  between the five strands.
- **Decided by:** playing Stage 5. The exact balance comes from evidence about
  what the developer actually reaches for.

---

### Q19. How does the game avoid repeating itself? — OPEN

- Does ten state-dependent anomalies beat a hundred unrelated ones? (The plan
  claims yes, but it is unproven.)
- What is the honest maximum run length before repetition becomes painful?
- **Decided by:** playing Stage 5 for as many consecutive days as it takes for
  the repetition to become noticeable. That measurement *is* the experiment.

---

### Q32. Does preparing for a commitment create interest without requiring constant emergencies? — OPEN

The whole point of C3 is preparation that matters later. If it instead
generates a constant low-grade alarm, it has failed.

- **Decided by:** whether the player felt anticipation rather than pressure.

---

## Answerable at Stage 6 — the evidence review

---

### Q33. Should the game be transparent, or hold information back? — OPEN

Separate from Q27, and more consequential than it looks.

- A game that explains everything can be solved like a spreadsheet. A game that
  hides things feels arbitrary. Where is the line?
- **Decided by:** Stage 4 onward, watching whether transparency makes the game
  solvable rather than interesting.
- **Not asked before because** it could not be observed without a decision
  system.

---

### Q17. How does the player express intent? — PROVISIONAL

Partially settled: intent is first-class simulation data (C1, `ARCHITECTURE.md`
§4.2).

- **Still open:** which intent types earn a place first — priority, reserve, or
  policy? How many before the player stops reading them (see Q24)? Can intents
  contradict, and how is that resolved?
- **Decided by:** Stage 4, incrementally.

---

## Still further out

---

### Q28. What is the amplitude of loss? — PROVISIONAL

*How much permanent loss is right.* The developer has confirmed this stays
provisional until tested.

- Alternatives range from: nobody ever permanently leaves, through people may
  leave but can be replaced, to irrecoverable losses.
- **Decided by:** after Stage 3 and Stage 5 have shown what loss feels like.
- **Standing constraint:** design the mechanics now, do not lock the tuning.

---

### Q34. What should we refuse to build, ever? — PROVISIONAL

Nominated traps, from external review:

- A large collection of stats that never changes a decision.
- Micromanaging every person's routine.
- Disasters with no traceable cause.
- Production chains that turn people into interchangeable throughput units.
- Endless content compensating for a weak core loop.
- Visual polish before the simulation is engaging.
- **Detailed equipment inspection before the data behind it matters** — this one
  is a genuine temptation here, because it was the developer's original
  interest. A screen showing every weapon component is not automatically fun;
  equipment detail should matter because it affects reliability, logistics, or a
  specific person's story.

**Status: provisional.** These are recorded so that refusing is easy later,
when the feature is most tempting.

---

### Q35. Does combat ever ship? — OPEN

The entire external layer is parked. It may never exist.

- **If it does**, it must be additive and optional, and the peaceful base must
  remain a valid way to play.
- **Decided by:** whether Stage 7–9 produce a game that already satisfies, and
  whether the developer wants it.

---

## Resolved — kept for the record

| Question | Resolution |
|---|---|
| Was 3 minutes/day right? | Untested. Changeable in one constant. |
| Does readiness drive consequences? | **No — a corrected error.** Underlying conditions drive them; readiness only explains. |
| Should decisions interrupt constantly? | No. Queued by default, ~1 true interrupt per in-game day. |
| Is "locked" the right word for our decisions? | No. Renamed to "settled," with an explicit revisitable note. |
| Stack? | TypeScript + Vite + React. |

---

## The rule for resolving these

Do not settle a question because it is common in other simulation games. Choose
the simplest option that supports the intended player experience, test it when
possible, and document the result.

**If a question cannot be answered yet, that is a legitimate outcome** — record
why, and move on. Every question here names the stage at which it becomes
answerable and the evidence that will answer it.

**This list is deliberately finite.** It is not an invitation to generate more.