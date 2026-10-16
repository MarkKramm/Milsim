# External review material — inputs, not authority

**These are not part of the design.** They are the raw outputs that fed two
planning sessions, preserved so the audit trail is complete and nothing that
influenced a decision is lost.

**Do not implement from anything in this folder.** Each file below was
*superseded* by an approved master plan, and where they disagree with those
plans, the plans are right.

| File | What it is | Superseded by |
|---|---|---|
| `STAGE2_PLAN_spacebunny.md` | One of two competing Stage 2 implementation plans submitted for review | `../plans/STAGE2_MASTER_PLAN.md` |
| `STAGE2_PLAN_step5.md` | The other competing Stage 2 plan | `../plans/STAGE2_MASTER_PLAN.md` |
| `ROUND2_DETERMINISM_spacebunny.md` | Stage 2 determinism / state-transition audit | fixed in `3d13902` |
| `ROUND2_DETERMINISM_step5.md` | The other Stage 2 determinism audit | fixed in `3d13902` |

## Why they are kept

The Stage 2 master plan's §3 is a comparison of the two competing plans, and its
argument for the chosen fixture only makes sense if you can read what it was
arguing against. The Round 2 audits found real defects that became the
`architecture.test.ts` ownership guard and the frozen-`history` fix in `3b3a0f7`.

Two findings from that round are worth knowing even though the documents are
superseded: the first plan asserted reference figures that were wrong on two of
three rows, and the first version of a gate would have passed on a degenerate
build. Both were caught and corrected *before* implementation, and the
corrections are recorded in `STAGE2_MASTER_PLAN.md` §11A. That history is the
reason the project now distrusts reference tables it has not re-measured.

## What is authoritative instead

| Question | Read |
|---|---|
| What is the current design? | `PROJECT_MASTER.md`, or the documents in `docs/` |
| What stage comes next, and what is it? | `../plans/STAGE4_MASTER_PLAN.md` |
| What was decided, and why? | `LOCKED_DECISIONS.md` |
| What was built and verified? | `CHANGELOG.md`, `AGENTS.md` |