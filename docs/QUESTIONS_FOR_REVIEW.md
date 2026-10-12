# Questions For Review

**Purpose:** questions this project genuinely wants answered by another mind,
written so any assistant can pick them up without reading the whole project.

This document is a **request**, not a report. It assumes you have been sent
`STATUS_HANDOFF.md` (and ideally `LONG_TERM_DESIGN.md`). Answer in
`OPEN_QUESTIONS_FOR_REVIEW.md` so the answers become part of the record.

Questions are grouped by how much they matter. Start at Q1.

---

## Priority 1 — Answer these first

These can change the design. Everything else is refinement.

---

### Q1. The pacing number is a guess. What is it likely wrong about?

We locked: 1 tick = 1 in-game minute, 1440 ticks/day, 8 ticks/sec at 1× → an
in-game day is ~3 real minutes. Speeds pause / 1× / 4× / 16×.

This was chosen without evidence. Nobody has played it.

- What is the likely failure mode — too fast, too slow, or right length but
  wrong rhythm?
- Should needs change on a timescale of hours or something faster, given a
  3-minute day?
- Is there a better structure than "same speed all day"? (Varying speed by time
  of day is an idea we have not considered.)
- What would you expect to be the most *tedious* number on that screen?

**Why it matters:** if pacing is wrong, every later judgement about whether the
game is interesting is measured against a broken instrument.

---

### Q2. Does the readiness spine actually create stakes, or just noise?

Our soft failure: a value drifting down when people are hungry, tired, or idle;
up when fed, rested, working. At zero, people quit.

- Does a single aggregate number create drama, or is it just another bar to
  watch?
- How often should it move before it stops being meaningful?
- Is quitting the right consequence, or too blunt? What else could a person do
  when morale collapses that is worse than leaving?
- Could this produce a death spiral where one quit makes the next quit more
  likely — and is that interesting or just a collapse?

---

### Q3. What is the strongest argument against this entire design?

Not the weakest. The **strongest**.

- What is the most likely reason this game ends up boring despite everything
  being designed correctly?
- Which single feature, if implemented well, would still leave the game hollow?
- What game is this one mistake away from turning into, and how would we notice
  too late?

**Why it matters:** we have audited the plan repeatedly. A fresh hostile
review is worth more now than another friendly pass.

---

### Q4. Is "watch a small autonomous base" a real genre with known design laws?

We believe the appeal is watching understandable systems interact — in the
spirit of Dwarf Fortress and Kingdom Come, but much smaller.

- What separates sims people love from sims people abandon, in terms of design
  rather than features?
- Is there prior art we should study that we have not mentioned?
- What is the single most common mistake in this genre that we are currently
  walking into?

---

## Priority 2 — Design gaps

---

### Q5. Anomalies, without content

We want normal days interesting via small rule-generated irregularities — a
tool runs hot, a delivery is late, two people need the same thing. Never
scripted.

- What makes an anomaly *readable* without a narrative voice?
- Should anomalies be individually authored (a fixed pool, chosen by
  simulation state) or genuinely emergent?
- How do we generate interesting anomalies without a content designer?
- Is there a risk this just becomes noise that the player learns to ignore?

---

### Q6. Decisions without dialogue

Our player decisions are 2–3 concrete named options with visible costs, shown
as text in a report.

- How do we write options that feel like genuine tradeoffs rather than
  obviously-correct answers?
- How much should the game *explain* its reasoning — fully transparent, or
  partially opaque?
- Is text-only enough, or will it need supporting visuals to land emotionally?

---

### Q7. Relationships, kept cheap

Pairwise opinions surfacing as one-line report entries. No dialogue trees.

- Is that enough to create attachment, or is it a feature that will read as
  decorative?
- What is the cheapest way to make a *specific named person* matter to a player
  who is not controlling them?
- Any failure modes to avoid?

---

### Q8. Morale, the need most likely to be built badly

Planned after hydration.

- Our intent: derive it from observable state (food security, rest, workload,
  injuries) so it is always explainable, never a standalone mood.
- Is that the right call, or is a partly-opaque morale more interesting?
- What is the common way morale systems fail?

---

## Priority 3 — Technical

---

### Q9. The pure-simulation rule — is it the right architecture?

Constraint: `src/sim` has no UI imports, is a pure function of state, runnable
headless, all randomness from one seeded stream, all state plain JSON.

- What does this rule cost in normal development? What breaks first?
- Is immutable state with events the right model, or would a mutable sim with
  undo be more practical?
- Any concrete failure mode we should design against now?

---

### Q10. Reporting architecture

Every meaningful change appends an event with cause IDs. Reports read the log
and never recompute.

- Does storing causality as event IDs scale, or does it become unreadable?
- How should a report be *structured* — what does a good end-of-day summary
  look like for a game about eight people?
- What is the right amount of detail? Too little is opaque, too much is a wall.

---

### Q11. Determinism, honestly

We want reproducible runs so bugs can be diagnosed and replays compared.

- What do we give up by being fully deterministic? Any design options that
  depend on genuine unpredictability?
- Is a seed-based golden-run test suite worth building, or will it become a
  maintenance burden that gets abandoned?

---

### Q12. Phone-first UI

Target device is a phone browser. Panels only, no map.

- What is the information architecture for a many-panel game on a small screen?
- What should be on the always-visible screen versus behind a tap?
- Is there a reason to allow desktop later, or should it be phone-only by
  design?

---

## Priority 4 — Open invitations

---

### Q13. What are we obviously missing?

Not "add more features" — features are not what this project needs.

- What question about the player's experience have we never asked?
- What system would deepen this game that we have not considered at all?
- What is a feature we would add if we were certain it was cheap?

---

### Q14. Challenge the gates

Our roadmap uses gates that are feelings, not features: "watching them work is
interesting", "something can be lost and you felt it", "you want to play day 5".

- Are those the right gates? Any too vague to ever be honestly answered?
- Which gate is most likely to be faked by the developer?
- Is there a stage we have skipped that should exist before Stage 2?

---

### Q15. What should we deliberately never build?

- What feature would be tempting, look impressive, and quietly damage the game?
- What would we regret in two years?
- If you were advising us to protect the original vision, what would you tell us
  to refuse?

---

## Q16–Q20. Your questions

If you see a risk, a contradiction, or an unasked question we have missed, add
it here. Number them continuing from Q16.

---

## How to answer

Write to `docs/OPEN_QUESTIONS_FOR_REVIEW.md` in the same structure:

```
### Q1. <original question, abbreviated>
**Short answer:** ...
**Detail:** ...
**What we would change:** ...
**What we would keep:** ...
```

Be direct. "This is a bad idea because X" is more useful than "you might
consider reconsidering X". We would rather hear a confident disagreement with a
reason than a polite non-answer.

Disagreeing with a locked decision is fine — but say what it costs. We will not
change the design on a hunch.