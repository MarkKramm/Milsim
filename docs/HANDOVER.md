# Handover — phone to PC

**Written 2026-10-16, at the end of Android/Termux development.**
**Branch:** `main` · **Stage 3 implemented and verified** · Stage 4 planned, not started.

This file is a pointer, not a design document. Everything it references is the
authority; this only tells you where to start reading.

---

## 1. Where things stand

| | |
|---|---|
| Implemented | **Stages 1, 2 and 3** — committed and pushed |
| Current stage | **Stage 4 — planned, zero code written** |
| Tests | 132 passing |
| Verification | `npm run verify` (see §6 for the Termux caveat) |
| Determinism | `rngCursor` is 7 after any run; nothing draws during a tick |

**Stage 3 in one paragraph:** seven people work two jobs across two facilities,
get hungry and tired, rest when they must, and eat if there is food. A larder can
empty. One priority control and one larder target. The documented five-day
reference figures and their measurements are in `CHANGELOG.md`.

---

## 2. Read these, in this order

| # | File | Why |
|---|---|---|
| 1 | `AGENTS.md` | The continuation brief. Start here. |
| 2 | `docs/plans/STAGE4_MASTER_PLAN.md` | **The next task.** Revision 2, approved |
| 3 | `docs/ROADMAP.md` | Build order and gates for all ten stages |
| 4 | `docs/LOCKED_DECISIONS.md` | Every decision, with rationale. Do not re-litigate |
| 5 | `docs/SYSTEM_DEPENDENCIES.md` | Field ownership, tick phases, 19 invariants |
| 6 | `docs/ARCHITECTURE.md` | The pure-simulation rule and state shape |
| 7 | `docs/GAME_DESIGN_BLUEPRINT.md` | All 24 systems, and the equipment contract |

`docs/PROJECT_MASTER.md` is a generated single-file bundle of the above. **Do not
edit it** — rebuild with `tools/build-master.sh`.

---

## 3. The next task

**Implement Stage 4: decisions, reports, and the first relationships.**

Full specification in `docs/plans/STAGE4_MASTER_PLAN.md` — nine ordered steps,
sixteen acceptance criteria. Three decisions are already **approved by the
developer** and are recorded as approved, not open:

- Relationships carry the bounded gameplay modifier (±10%, extremum not sum).
- Blocking interrupts ship **unused**. No artificial emergency.
- `reserve_food` is the **only** new persistent intent lever.

**Nothing is outstanding in that plan.** It went through a review that found four
specification defects; revision 2 corrected all four and records what changed in
its §13. Specifically corrected: the report's source of truth, relationship
semantics against Stage 3's task model, a rest-threshold option that had its
direction backwards, and an approximate decision budget replaced by a global
ceiling of 6.

*If you were told "two outstanding Stage 4 corrections" — that does not match
the record. Revision 2 closed four, and no decision remains open. Check
`STAGE4_MASTER_PLAN.md` §13.*

---

## 4. Must not be changed prematurely

- **D21 — equipment and loadouts are a guaranteed Stage 7 milestone.** Not a
  candidate, not conditional. Scope is negotiable; existence is not. Stage 7's
  structural contract (soldier / item / slot / loadout) is settled in
  `GAME_DESIGN_BLUEPRINT.md`.
- **The simulation stays pure.** `src/sim/**` imports no React, DOM, clock, or
  `Math.random`. Nine architecture tests enforce it. This is the rule the project
  survives on.
- **Readiness is derived and never causal.** It is not in `SimState`; no system
  may read it (invariant 12). `D1` is explicit and was corrected twice by
  external review for getting this wrong.
- **Derived values are never stored.** No cached readiness, no stored occupancy,
  no stored person-task list.
- **The immutability rule.** Everything reachable inside `SimState` is frozen at
  creation or rebuilt immutably. Three separate defects came from breaking it;
  the rule is written into `draftOf`.
- **Gates are not deadlines.** Do not advance past a stage that is not yet
  interesting. The documented way to fix that is to cut scope, not add systems.

---

## 5. What is unfinished, honestly

- **Stage 3 has never been gate-passed formally.** It was played on a phone —
  UI readable, rest patterns became staggered, food dropped around day 10 in
  Balanced — which is real evidence but not the same question.
- **The Stage 1 phone gate and the Stage 2 Day 4–5 gate were never performed.**
  Both remain open. A green suite establishes that its tests pass, not that the
  game is worth playing.
- **`NOTIFY_INTERVAL_MS` render cadence at 16× is still unmeasured.**
- **The UI has been seen at one phone width only.**

None of these block Stage 4, and all of them are recorded in `CHANGELOG.md`.

---

## 6. Commands

```bash
git clone https://github.com/MarkKramm/Milsim.git
cd Milsim
npm install          # or npm ci
npm run verify       # typecheck + tests + build + headless smoke run
npm run dev          # Vite dev server; open the printed URL
```

Individual checks: `npm run typecheck` · `npm test` · `npm run build` ·
`npm run headless -- --ticks 7200 --priority maintenance-first`

**Termux caveat, now irrelevant on a PC but worth knowing:** on Android, a single
`npm test` wedged the device once Stage 3 landed, because the fixture gate runs
many 7,200-tick simulations. The workaround was to run four slices
(`src/sim/stage3-gate.test.ts`, `src/sim/tick.test.ts`, `src/sim/time.test.ts`,
then the rest). On a PC `npm test` runs fine.

**Docs mirror:** `bash tools/sync-docs.sh` copies `docs/` to shared storage and
refreshes Android's media index. Note it is at `tools/`, **not** `scripts/` —
`AGENTS.md` currently says `scripts/` and that line is wrong.

---

## 7. Repository map

```
src/sim/        the simulation. PURE. no UI, no DOM, no clock, no Math.random
src/controller/ wall-clock, speed, pause, commands. the only layer reading time
src/ui/         React. contains no rules
tools/          headless runner + the pure-simulation smoke test + doc scripts
docs/           all design and planning documents
docs/plans/     approved per-stage implementation specs
docs/reviews/   audits, and external/ for superseded review inputs
```