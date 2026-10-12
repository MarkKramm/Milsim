# Open Questions

Questions that are genuinely unresolved. **Not settled because they are common
in other simulation games** — settled when the prototype needs the answer.

**Q16–Q20 came from an external review** and are recorded verbatim in spirit.
Q21–Q25 arose from acting on that review.

Answers get written into this file and reflected in `LOCKED_DECISIONS.md`.

---

## Added by external review

---

### Q16. What is the long-term purpose?

**The most important open question in the project.**

The design explicitly says this is not an infinite sandbox — but nothing defines
what a successful run looks like, or what the player is trying to accomplish.
Without this, Day 5 is only worth reaching because it exists.

Candidate shapes:

- **Keep a small outpost operational** through a difficult period.
- **Restore a neglected base** to a functional condition.
- **Prepare personnel and equipment** for an upcoming assignment.
- **Fulfil recurring commitments** while managing shortages.
- **Build and improve** the base itself.
- **Survive and surface emergent stories** — deliberately unstructured.

**Not answering this yet, deliberately.** The right answer depends on what the
base simulation feels like, which nobody knows. Decide before Stage 5.

---

### Q17. How does the player express intent to autonomous personnel?

Now partially answered: intent is a first-class simulation input
(`ARCHITECTURE.md` §4.2), not a UI slider.

Still open:

- Which intent types earn a place first — priority, reserve, or policy?
- How many distinct intents before the player stops reading them?
- Can an intent ever be *contradictory*, and if so how is that resolved?

Constraint already accepted: **a few clear commands that visibly change
outcomes beat a large configuration screen.**

---

### Q18. What happens when the player faces an unfixable problem?

A good simulation sometimes puts the player in an unwinnable position. But
without warning, without an available response, and without room to recover, it
feels unfair rather than demanding.

The player should generally be able to understand what went wrong, what
capabilities remain, which options reduce the damage, and which consequences are
already unavoidable.

- Not every bad outcome must be preventable — that's fine. The test is whether
  the player can **learn** from it.
- Does this need a design rule now, or is it discovered during playtesting?
- How much warning is too much? A game that always warns is a game with no
  tension.

---

### Q19. How does the game avoid repeating itself?

The claim is that a small number of interacting systems gives variety. Needs
testing.

- Ten authored events with state-dependent consequences may beat a hundred
  unrelated random ones. Is that right?
- How much variety is enough for a 20-day run?
- What is the honest maximum length of time before repetition becomes painful?

---

### Q20. What should we refuse to build, ever?

External review nominated these traps. Worth confirming explicitly, because
refusing in advance is much easier than refusing when the feature is exciting:

- A large collection of stats that never changes a decision.
- Micromanaging every person's routine.
- Random disasters with no traceable cause.
- Production chains that turn people into interchangeable throughput units.
- Endless content compensating for a weak core loop.
- Visual polish before the simulation is engaging.
- **Detailed equipment inspection** — this one is a genuine temptation here,
  because the developer's original interest was exactly that. A screen showing
  every weapon component is not automatically fun. Equipment detail should
  matter because it affects reliability, logistics, or a specific person's story.

---

## Added while acting on the review

---

### Q21. Is readiness adding anything, or just duplicating hunger and fatigue?

Now that readiness is a *derived summary* rather than a magic meter, the sharper
question applies: if it is computed from hunger and fatigue and workload, what
does it tell the player that those three numbers do not?

If the honest answer is "not much," readiness should be cut. It exists to create
stakes, and a meter that restates its own inputs is not stakes.

---

### Q22. How should rest be distinguished from idleness?

Accepted as a correction: legitimate rest must not count as idleness. But how?

- Does a person's current *activity* determine it (sleeping vs. awake and
  idle)?
- Is there a cost to resting when the base needs you? If yes, is that fair?
- Could a player exploit deliberate rest to farm good outcomes? If so, is that
  interesting or a problem?

---

### Q23. What makes someone leave, versus what makes them merely unhappy?

The graduated consequence ladder replaces instant quitting. Still open:

- What is the *right* severity of consequence for sustained neglect?
- Is anyone ever *unrecoverably* lost, or should the base always be able to
  rebuild its staff?
- Does a departure need to be permanent? A former member who could return is a
  different design from one who cannot.

---

### Q24. How many distinct intents before the player stops reading them?

The intent layer is now a first-class concept. The risk is recreating the
slider problem in a new place — a configuration screen nobody reads.

- Is there a natural ceiling (five? eight? twelve?)?
- Should some intents have defaults so the player need never touch them?
- How do we surface "your intent is being ignored" without punishing normal play?

---

### Q25. What is the first prototype's single most important question?

The project's stated question has always been *"is watching an autonomous base
interesting?"* But external review suggested a sharper version:

> Can the player anticipate a problem, make a meaningful intervention, and later
> recognise the consequences of that intervention?

- Is that the better question to design Stage 2 around?
- Is it answerable at Stage 2's scale, or does it need the decision system from
  Stage 4?
- If it can only be answered at Stage 4, should Stage 2 be folded into Stage 3?

---

## Rule for resolving these

Do not settle a question because it is common in other simulation games. Choose
the simplest option that supports the intended player experience, test it when
possible, and document the result.

If a question cannot be answered yet, that is a legitimate outcome — record why,
and move on.