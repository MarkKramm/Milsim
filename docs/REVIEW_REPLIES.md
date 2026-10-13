# Review Replies

Answers received from other assistants, recorded so they become part of the
project's history rather than a lost chat log.

They reply to **Part 9 of `REVIEW_BRIEF.md`**.

---

## Review 1 — ChatGPT

**Date received:** planning phase, before any code.
**Reviewer:** ChatGPT (GPT-5 class), given `REVIEW_BRIEF.md` only.
**Overall verdict given:** *"The foundation is strong. The game design is not
fully proven."*

---

### Summary of the review

The reviewer accepted the architecture and the staged approach, and agreed the
central risk is that a simulation can run correctly while giving the player
little reason to watch, care, or intervene.

It answered all 20 questions, challenged 12 of the 18 "locked" decisions,
proposed five mechanics worth considering, flagged two places where the brief
was self-inconsistent, and recommended settling four design questions before
Stage 1.

It also stated one important caveat, which we accept and have acted on:

> The brief says planning is complete and lists decisions as locked. That
> doesn't automatically mean you personally approved every one of them. We
> should treat the word locked as a claim to verify, not as a reason you can't
> change your mind.

---

### What we accepted, and what changed

Thirteen of the reviewer's points were correct and have been folded into the
design. Listed here so the reasoning is on the record.

| # | Reviewer's criticism | Response |
|---|---|---|
| 1 | **Readiness was a magic meter.** A single number that drifts for reasons the player may not understand. | **Accepted.** It is now explicitly a *derived summary*, never an independent input. It must display the reason it moved, tracing to underlying causes. |
| 2 | **Readiness penalises all idleness, including necessary rest.** A soldier resting after a demanding shift is doing exactly what the base needs. | **Accepted — this was a genuine design bug, not a wording issue.** Rest is now separated from *unproductive* idleness. Readiness must not fall during legitimate recovery. |
| 3 | **Zero readiness → immediate quit is too abrupt.** | **Accepted.** Replaced with a graduated consequence ladder: warning → reduced effectiveness → declines demanding work → refuses optional assignments → *then* leaves. |
| 4 | **Gates are feelings, and feelings can be self-deceived.** A developer can convince themselves a feature is fun because it took effort. | **Accepted.** Every gate now has an observable evidence checklist in `ROADMAP.md`. |
| 5 | **Player commands were never designed as a concept** — they existed only as UI sliders. | **Accepted.** An explicit *intent layer* is now part of the design, separate from the interface that sets it. |
| 6 | **No long-term purpose defined.** Nothing makes Day 5 different from Day 4. | **Accepted as an open question.** Now Q16, and deliberately *not* answered yet. |
| 7 | **Eight ticks/second should not mean eight UI repaints per second.** | **Accepted.** Simulation rate and render rate are decoupled. The UI may coalesce ticks. |
| 8 | **Fixed tick order introduces its own biases** and must be tested, not assumed correct. | **Accepted.** Tick-order bias tests added to the invariant suite. |
| 9 | **Event log needs significance tiers**, or it becomes an unreadable wall. | **Accepted.** Three tiers added to `ARCHITECTURE.md`: current state, notable events, causal explanation. |
| 10 | **Invariant tests matter more than golden runs.** | **Accepted.** Invariants first; golden runs kept small and few. |
| 11 | **Relationships that do not change anything observable are decorative.** | **Accepted.** Relationships must have at least one visible consequence before expanding. |
| 12 | **Anomalies need importance and frequency rules, not just variety.** | **Accepted.** Hybrid model: authored anomaly *rules*, simulation-gated eligibility, seeded selection, recorded consequences. |
| 13 | **"Locked" is a claim, not a fact.** | **Accepted.** Renamed to *settled*, and the record now notes that several were approved by blanket trust rather than item-by-item. |

### What we did not accept

| Reviewer's recommendation | Our response |
|---|---|
| **"Don't start Stage 1 just yet — verify the original documents first."** | **Declined.** A document audit before implementation is exactly the drift the gates exist to prevent. Stage 1 contains no people, no decisions, and no mechanics — it is a clock and some numbers. It cannot be invalidated by a design change later. |
| **"Settle four design questions before Stage 1."** | **Declined as a blocker.** All four are good questions and are now recorded (Q16–Q19). None affects Stage 1, which has no personnel to fail, no decisions to make, and no morale. They are Stage 3 and Stage 5 questions. |
| **"Verify that OpenCode preserved the original documents correctly."** | **Noted, and handled differently.** The original documents are in the repository, unmodified, and their full text is reproduced in `ORIGINAL_PLANNING_PACK.md` for any reviewer. But they are superseded by `LOCKED_DECISIONS.md`, and reading them is a research task, not a prerequisite for a clock. |

### Where we agree with the reviewer and had not thought of it

The review's strongest contribution was not any single mechanic — it was the
observation that **our gates were the weakest part of our own plan**, because
we wrote them in the language of feelings and never asked how they could be
faked. That criticism was correct and has been acted on.

The second was separating **"the player is informed"** from **"the player is
responsible."** The original plan assumed that showing someone a report would
make them feel ownership. It does not.

---

### Five mechanics the reviewer proposed

Recorded for later evaluation. None is scheduled, and none blocks any stage.

1. **Bottlenecks that create stories** — a shortage should affect *specific*
   people and jobs, not just a total. One missing part delays a repair; the
   delay forces a choice about what to maintain first. Deep without adding
   combat, maps, or graphics. *Rated high priority — closest to what we
   already want, expressed more concretely than we had.*
2. **Personnel identity and history** — name, role, skills, and a record of
   meaningful events, so attachment forms without direct control. *Partially
   already in our design; now stated as an explicit goal.*
3. **Work leaving persistent results** — a completed repair changes the actual
   condition of a specific item. *This is what makes the production layer
   honest rather than decorative. Strong endorsement of a direction we had.*
4. **Commitments and preparation** — something to prepare *for*, without
   constant emergencies. *Adopted as a candidate for the long-term purpose
   question (Q16).*
5. **A useful inspection interface** — tap a person, weapon, or vehicle and
   understand its condition, history, and problems. *Deferred, but endorsed as
   aligned with the developer's original interest. Build after the underlying
   data matters.*

The reviewer's own preference: **explore 1–3 before committing to 4–5.** We
agree.

---

### The reviewer's conclusion

> Don't start Stage 1 just yet… The goal isn't to plan forever. It's to make
> sure we're building your dream game, not merely a technically sound
> interpretation of it.

Our answer: the goal is right, the timing is not. The dream game is not
specified anywhere — it does not exist yet, and no amount of document review
will produce it. It only exists once the developer has watched a base run and
decided whether it moved them. Stage 1 is the cheapest possible step toward
that, and delaying it is the one action guaranteed to delay learning.

---

### Still open after this review

Added as new questions: **Q16** (long-term purpose), **Q17** (the intent layer),
**Q18** (recovery from unfixable situations), **Q19** (variety from state, not
event count), **Q20** (what we should refuse to build).

Record their answers in `OPEN_QUESTIONS.md` when the prototype reaches the
stage where they start to matter.

---

## Review 2 — ChatGPT

**Date received:** after Review 1's corrections were applied.
**Reviewer:** ChatGPT, given the updated `REVIEW_BRIEF.md`.
**Overall verdict:** *"The foundation is good. The game design is not finished
yet."*

### What it asked for

A **System Atlas** — every major intended system specified deeply enough that
another developer could implement it without rediscovering the design, using an
eleven-section template. Plus a system dependency map, a revised roadmap with
per-stage gates, and a long-term gameplay structure.

It also supplied a blueprint prompt to run against this assistant.

### What it found — and what it was right about

**Three of its catches were real contradictions in the plan as it stood.** Two
were errors this assistant had introduced while applying Review 1's own advice.

| Problem | Severity | Resolution |
|---|---|---|
| **Readiness contradicted itself.** It was "never an input to any other system" *and* drove a progression of consequences. Both cannot be true. | **Real contradiction, self-inflicted** | Split. Readiness is a pure explanatory summary that **no system may read**. Behavioural consequences are driven by the underlying conditions — fatigue, injury, neglect. A person declines hard work because their fatigue crossed a threshold, not because a summary number did. Now an enforced invariant (#12). |
| **Stage 2's gate was unanswerable.** It demanded evidence that "a decision visibly changed what happened next", but the named-option decision system did not arrive until Stage 4. | **Real contradiction** | Stage 2 now includes *one player priority*, and its gate asks the question it can actually answer. Stage 4 tests the harder version of the same question. |
| **Stage 6 vs Stage 7 ambiguity.** Stage 6 said "choose by evidence"; Stage 7 then assumed production was already chosen. The evidence gate controlled nothing. | **Real ambiguity** | Stage 6 is now explicitly *a decision, not a build*. Stages 7–10 are marked conditional throughout, with the leading candidate named and its rationale given. |

**Three gaps it identified correctly:**

- **Commitments sat outside the roadmap.** They were the answer to the
  long-term-purpose question but had no stage. Now at Stage 5, deliberately
  *ahead* of achievements — achievements reward a good experience, commitments
  create the reason to have one.
- **Several systems had no stage at all.** Hydration, morale, injuries,
  equipment inspection, ammunition, vehicles. Now assigned in the blueprint's
  system → stage appendix, including which are conditional.
- **Gates were applied uniformly.** Corrected: each stage now names the question
  it can answer *at its own scale*.

**Its strongest structural contribution:** the **system dependency map**
(`SYSTEM_DEPENDENCIES.md`), with ownership rules, tier ordering, tick-order
justifications, the two contested ordering decisions written out with their
rationale and required tests, 15 invariants, and a table of circular-dependency
traps.

**Its framing of "locked" was adopted earlier** and is preserved: decisions are
*settled*, not *locked*.

### What it did not get, or over-reached on

**It recommended this blueprint pass before Stage 1, twice.** This time the
recommendation was accepted — but only because it arrived as a bounded
deliverable with a specified template, and only after Review 1 had already
established the gate-discipline argument. The distinguishing factor is that
this pass produced *documentation*, whereas indefinite planning produces
*deferral*. The line drawn: if a further planning pass cannot be specified in
advance with a completion criterion, it is drift and should be refused.

**It proposed a ten-stage roadmap.** Adopted with one disagreement recorded in
the blueprint: Stage 10 (combat) remains **open, not provisional**. The reviewer
treated combat as a likely eventual stage; this project treats it as a system
that may never exist, because a game whose threat is external cannot justify its
own simulation if the simulation is not already worth watching.

### An error found in my own report

A verification pass counted the artefacts rather than trusting the summary I had
written, and found the summary overstated nothing but undercounted twice:

- **"20 systems" was wrong: there are 24** — Group A (4), B (5), C (3), D (6),
  E (1), F (3), G (2). Undercounting was harmless, but a design document that
  miscounts its own contents is exactly the kind of thing this project cannot
  afford, so it is recorded here rather than quietly corrected.
- **"20 open questions" was wrong: there are 19** (Q16–Q35, skipping Q20).

What the verification confirmed as genuinely complete: all **24 systems carry
all 11 template sections** (no system was left half-specified), **15 invariants**,
**5 cross-system chains**, **10 stages each with a gate**, and a system → stage
map assigning every system, including which are conditional.

The lesson recorded: count the artefacts, do not summarise from memory.

### Deliverables produced

| File | What it contains |
|---|---|
| `GAME_DESIGN_BLUEPRINT.md` | The System Atlas — **24 systems**, each with all 11 template sections, plus status labels and the system → stage map |
| `SYSTEM_DEPENDENCIES.md` | Ownership, tiers, tick order, 5 cross-system chains, 15 invariants, dependency traps, debugging order |
| `OPEN_QUESTIONS.md` | Rewritten — every question grouped by the stage that answers it, with status and deciding evidence |
| `ROADMAP.md` | 10 stages, conditional ones marked, per-stage gates, questions passed forward |
| `ARCHITECTURE.md` | §4.1 readiness rule rewritten; invariants reordered |
| `LOCKED_DECISIONS.md` | D1 rewritten to resolve the contradiction |

### What did not change

The architecture, the stack, the pure-simulation rule, seeded determinism, the
gate discipline, and the sequencing discipline (design everything, build in
evidence order). Nothing in Review 2 touched them, which is the outcome a
correct architecture produces under review.

---

## Review 3 — ChatGPT

**Trigger:** the third external review, given the blueprint, the dependency
document, the roadmap and the brief.
**Overall verdict:** *"the project has a strong foundation, but the documents
claim to be a complete, consistent blueprint when some of their systems cannot
yet work together as written."*

### The framing that mattered

This review came with an explicit instruction: reconcile the existing
documents, explain any design changes, leave unrelated code alone. That is the
first review to state a **scope boundary** rather than an ambition — and it is
the distinction that made acting on it safe rather than another planning round.

### What it found, and what was actually true

**Four findings verified as real. All four were mine.**

I checked each against the documents before acting rather than taking the
review's word for it. All four were genuine.

| Finding | Verified? | Resolution |
|---|---|---|
| **Dependency rules contradict themselves.** §2 said "read your own tier or higher-numbered tiers"; §3 said the opposite in the next paragraph. | **Real.** Both statements existed, three lines apart | Tiers were doing two jobs — dependency direction *and* execution order. Now three separate concepts: **ownership** (who writes), **phase** (when it runs), **service** (cross-cutting machinery). One unambiguous read rule. |
| **Phase numbers did not match the tick order they described.** Needs sat at "tier 3" and Facilities at "tier 2", yet Needs ran first. | **Real.** The header claimed tier = evaluation order; the table contradicted it | Phases renumbered to match actual execution order. Events moved out of the sequence entirely — a service cannot be both first and last. |
| **Several systems claimed the same data.** Readiness owned by Needs but listed separately; Personnel writing Needs; Production writing Facilities; Resources and Storage both owning holdings. | **Real.** Four distinct ownership ambiguities | A field-level ownership table: every mutable field, its owner, who may request changes. Plus the **request pattern** — a system never writes another's field, it asks. |
| **Chain A could not be proven by Stage 5.** The reference chain needs items (Stage 7) and production (Stage 8). | **Real, and the worst of the four** | Split into **A1** (resource contention, reachable by Stage 5, now the Stage 5 gate) and **A2** (full equipment chain, Stage 8). |

Plus a smaller contradiction: item condition "degrades with use" in the rules
but "changes only through repair or production" in the tests — a contradiction
that would have prevented wear from ever happening. Now invariant 16.

### The finding I had under-weighted

**Equipment was droppable.** Stage 6's evidence review chose one of four
expansions, and equipment was one of them. Every stage after 6 is conditional, so
the project's defining feature — inspecting soldiers, their gear and loadouts —
had no guaranteed stage. The review called this the largest vision risk.

It was right, and I had dismissed the same concern as "scope discipline" when I
wrote it.

**Now D21:** a minimum equipment and loadout experience is guaranteed. Its scope
stays negotiable; the stage does not. Stage 6 now chooses what is added *beside*
equipment.

### What it asked for that went beyond fixing contradictions

**A structural model for soldiers, items and loadouts.** Correct, and the
largest single addition. The interest here is *inspection* — helmets, clothing,
pockets, durability, armour, weapons — and Stage 7 could have shipped as a flat
item list with a condition bar while satisfying the roadmap and missing all of it.

Now the **equipment structural contract**: the soldier, the item, slots and
containers (resolved as one mechanism at different depths, not three special
cases), derived loadouts, and how vehicles relate to all of it. It deliberately
specifies no weapon catalogue.

**A Stage 1 technical contract.** Also correct, and uncomfortably so: I had
begun scaffolding Stage 1 when this arrived, and its questions — does "tick()"
return events or append them, where do pending commands live, how is the seed
represented — were exactly the ambiguities I would have answered by inventing
something mid-implementation and then contradicting in another file. All now
recorded as decisions.

**A Stage 2 reference scenario.** Accepted. A feature list does not guarantee the
experiment happens: if starting conditions never create contention, the priority
control looks useless even when correctly implemented. The fixture now fixes
personnel, jobs, capacities, and the condition under which the conflict is real.

### What I pushed back on

**It called the correction pass justified while also noting the checkpoint claims
no further planning is scheduled.** Fair — but only because this pass was bounded
by real contradictions rather than ambition. The recorded boundary now stands: a
further pass must arrive naming a specific defect.

**It did not flag that Stage 1 code had already started.** That was caught by the
developer's interruption, not by the review. Its Stage 1 contract is worth far
more *before* the first commit than after.

### What did not change

Autonomy and command by exception. The pure deterministic simulation. Causal
explanations over log walls. Small stages with honest gates. Graduated
consequences and persistent history. None were touched — which after three
reviews is the strongest available evidence that the architecture is sound.

---

## Review 4 — ChatGPT

**Trigger:** given `PROJECT_MASTER.md` — the single-file bundle — rather than a
document selection. It correctly noticed it was reading the current design,
including `AUDIT_FINDINGS.md`, and reported that previously identified problems
were already fixed.

**Overall verdict:** *"we are close to having a solid Stage 1 foundation, but the
guaranteed equipment stage and a few remaining architectural contradictions
deserve attention."*

### What it confirmed

Everything in the third review: the ownership/phases/services split, the A1/A2
chain split, D21, and the Stage 1 contract. It explicitly recommended preserving
them rather than reopening them.

### What it found — and what was true

**Three contradictions, all verified as real, and all introduced by this
assistant while applying the third review's fixes.** Each was checked against the
documents before acting.

| Finding | Resolution |
|---|---|
| **The tick order contradicted itself.** Derived summaries ran at phase 9, but the final step assigned "check for new decisions" to phase 5 — a phase-5 operation scheduled after phase 9. | Decisions given their own phase (10) at the end. Every tick step is now phase-monotonic, verified mechanically. |
| **The blueprint still described the old ownership model.** D1 claimed Resources "owns quantities... written by consumption, production and delivery"; D2 claimed "Written by Production and Items"; D4 claimed "Written by Delivery" — all contradicting the ownership table written in a *different document* during the previous pass. | D1, D2 and D4 now state the authoritative rule: Storage owns holdings, Resources owns no mutable field, Facilities alone writes facility state. Every system outside an owner sends a **request**. |
| **The item-wear test still contradicted the wear rule.** §3 had been corrected to say condition degrades with use, but §10 still read "changes only through a repair or production" — which would have prevented wear from ever happening. | §10 now reads: condition changes only when Items applies a permitted operation (wear, repair, manufacture). Invariant 16. |

**The pattern is the real finding.** Fixing a document without checking the other
documents that describe the same rule does not remove a contradiction — it
*relocates* it. The third pass corrected `SYSTEM_DEPENDENCIES.md` and left the
blueprint describing the old model, which is strictly worse than the original
single-document error, because now two authoritative-looking sources disagree.

**This is why every correction in this pass edits every document that describes
the affected rule**, not only the one where the contradiction was noticed.

### Three further inconsistencies it caused me to find

Its Stage 7 critique sent me looking for the same class of error elsewhere, and
three more appeared:

- **D3's prerequisite still permitted Stage 7 to depend on Production (Stage 8)** —
  a *conditional* stage. A guaranteed stage cannot require an optional one. Now
  Stage 7 ships its own minimal repair queue.
- **D21's rationale described the old rule in the present tense** ("every stage
  after 6 is conditional"), contradicting its own outcome three paragraphs later.
  Rewritten as past tense.
- **`AUDIT_FINDINGS.md` still listed Stage 7's missing build list as an open
  action**, contradicting the roadmap once that action was taken. Marked resolved.

### What it added that was genuinely new

**A build list for Stage 7**, including the dependency closure it exposed: the
stage needed a repair queue, and Stage 8 was conditional, so Stage 7 had to
supply its own. That is precisely the class of bug that a promise without a build
list produces.

**Chain F — the inspection scenario**, now the Stage 7 gate: issue a weapon, use
it, damage it, inspect the history, repair it, and see *that item* change. Chains
A1, A2 and F together now cover the three stages that matter most.

**A design question it asked that I answered:** can a newly generated decision be
answered immediately? **No — a decision raised in tick N is answered in tick N+1.**
This is not a limitation to route around. If a decision could be answered the
moment it appeared, the same state and seed could resolve differently depending
on when the player clicked, and replay would stop being deterministic. The
one-tick delay is what makes a run reproducible.

### What it did not get

It asked for the emergence, terminal-state and cross-system questions to be
carried into `OPEN_QUESTIONS.md`. They already were — Q36, Q37 and the audit's
chain-coverage finding, added in the previous pass. It was working from the audit
without knowing it had already been acted on.

It also suggested pushing to GitHub as an open risk. Already done.

### What did not change

Settled decisions and the game vision. No new systems, no scope expansion, no
unrelated questions reopened. Stage 7's *scope* remains negotiable per D21; only
its certainty changed.

---

## Reviews

*(four received — see above)*