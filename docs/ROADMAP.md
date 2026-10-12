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
| 0 | Foundation | *(complete — documents)* | — |
| 1 | State advances | The numbers move and you understand them | **Technical only.** No gameplay claim is possible here. |
| 2 | People work | **Watching them work is interesting** | 3 of 4 evidence items in §Gate evidence |
| 3 | Needs and consequence | **Something can be lost, and you felt it** | 3 of 4 |
| 4 | Decisions and reports | **You made a choice and understood its effect** | 3 of 4 |
| 5 | Long-term play | **You want to play day 5** | 3 of 4 |
| 6 | Expansion | *one* new layer, chosen by evidence | — |
| 7 | Production layer | The bottleneck is people, not throughput | — |
| 8 | External layer | *(parked)* | — |

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

**Why so empty:** it validates the time model (D4) in one evening. If 3
minutes per day feels wrong, you find out now, not after a month of building.

---

## Stage 2 — Autonomous jobs

**Build:**
- 6–8 personnel with IDs and duties.
- 3 jobs with eligibility, duration, prerequisites, outputs.
- Autonomous task selection: needs → duties → availability → policy priority.
- Hysteresis (D6): finish or abandon, abandoning costs progress.
- Deterministic tie-breaking.
- UI: roster showing each person's current task **and the reason they chose
  it**.

**Gate:** **watching them work is interesting.** Not "it works" — interesting.
Requires 3 of the 4 evidence items. **This is the easiest gate to fake:** six
people working is cute, and cuteness feels like fun.

This is the first real test of the game's core hypothesis. If it fails here,
nothing later will rescue the project, so it is worth playing honestly.

---

## Stage 3 — Needs and consequence

**Build:**
- Hunger and fatigue (hydration and morale come later).
- Food consumption and one maintenance-supply interaction.
- **Readiness** (the soft failure spine, D1) with quit consequences.
- Resource contention changing outcomes.
- Save/load — cheap now, because of the serialization constraint (D15).
- Player-set goals tracked by the report.

**Gate:** **something can be lost, and you felt it lose it.** Losing a person
should sting.

---

## Stage 4 — Decisions and reports

**Build:**
- Named-option decisions (D2), queued in the report.
- Rare blocking interrupts (D16), ~1 per in-game day maximum.
- Event timeline and end-of-day report, reading the log without recomputing.
- Debug view + "copy run as JSON".
- Relationships, minimal: pair values surfacing as report lines.

**Gate:** **you made a choice and understood its effect.** You can point at the
report and say why things happened.

---

## Stage 5 — Long-term play

**Build:**
- Several consecutive days played through.
- Anomalies generating normal-day interest (D3).
- Permanent run history.
- Secrets and achievements (small).

**Gate:** **you want to play day 5.** This is the real test of a sim.
Requires 3 of the 4 evidence items.

**Do not pass this stage by adding features.** If day 5 is boring, the fix is
usually to remove systems, not add them.

---

## Stage 6 — Choose one layer

Only now, and only **one**, chosen by what Stage 5 revealed you wanted:

- Equipment condition → if you cared about the workshop.
- Training → if you cared about people improving.
- Supply deliveries → if you cared about logistics.
- First operation → if you wanted external pressure.

Adding all four at once is how this project dies.

---

## Stage 7 — The production layer

Per `LONG_TERM_DESIGN.md` §4. Engines and fuel, workshop and manufacturing,
supply chain with imperfect deliveries, equipment condition at scale.

**Gate:** the base reads as a production system whose bottleneck is *people*.

**Watch for the trap:** the moment players start solving it as a throughput
puzzle instead of a management story, the game's identity has slipped. Pull
back.

---

## Stage 8 — The external layer (parked)

Vehicles, then raids and operations. Designed, not committed.

**Gate:** the base has enough accumulated state that an external threat is
meaningful rather than arbitrary.

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