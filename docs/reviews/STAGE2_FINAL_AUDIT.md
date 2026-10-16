# Milsim — Stage 2 Final Engineering Audit & Stage 3 Readiness Review

**Audit date:** 2026-10-15 · **Auditor:** SpaceBunny · **Scope:** Stage 2 implementation only
**Method:** source trace, targeted probes against the real build, and the repository's own verification commands. Every finding is marked `[V]` verified by execution, `[S]` source-level, or `[R]` recommendation.

---

## 1. Executive verdict

**CONDITIONALLY READY for Stage 3 planning.**

Stage 2 does what it was built to do, and it does it deterministically: the priority control is live, causally attributable, and non-dominant, verified across 7 seeds and reproducible from the command line. The reference figures reproduce **exactly**. No critical or high-severity defect remains open.

The condition is not about code. It is that **Stage 2 has never been watched.** Both the Stage 1 phone gate and the Stage 2 Day 4–5 manual gate are outstanding, and no automated test can substitute for them — the automated gate proves the control is *not inert*, which is not the same as it being *interesting*. Stage 3 should not be planned as though the answer to "is watching a base operate fun?" is known, because it is not.

Two genuine defects were found and fixed during this audit (§4, §10). Neither changed simulation behaviour; the reference figures still reproduce.

---

## 2. Repository state

`[V]` all verified by command.

| Fact | Value |
|---|---|
| Root | `/data/data/com.termux/files/home/military-base-sim-dev` |
| Remote | `https://github.com/MarkKramm/Milsim.git` |
| Branch | `main` |
| HEAD at audit start | `3d1390207430fdf571e1f40e47e1b6bf974f132a` (matches the reported Stage 2 commit) |
| Working tree | Clean at audit start; no user changes existed to preserve |
| Stage 2 commit | `3d13902` — 5 new files, 16 modified |

HEAD now `3b3a0f7df2ed2f56a755407416f3a5d72bf46169` (this audit's fixes). Working tree clean. **Not pushed** — `origin/main` is still at `88dbe92`.

---

## 3. Verification commands and actual results

`[V]` every command below was executed; results are as reported.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm test` | **123 pass, 0 fail**, 19.8s duration |
| `npm run build` | built in 4.4s, no errors |
| `headless --ticks 7200 --priority balanced` | 267 / 866, backlog 30 / 30 |
| `headless --ticks 7200 --priority maintenance-first` | 297 / 777, backlog 0 / 119 |
| `headless --ticks 7200 --priority meals-first` | 257 / 896, backlog 40 / 0 |

`--priority sideways`, `--nope`, `--ticks` (missing value) each exit 1 with a specific message `[V]`.

---

## 4. Findings

| # | Sev | Finding | Evidence | Files | Action |
|---|---|---|---|---|---|
| **F1** | **High** | **`draftOf` shared a mutable nested object with the caller's state.** Shallow-spreading each person shares `currentTask` and `history`. A write through a draft changed the previous state's task: `original.personnel[0].currentTask.progressTicks` became `9999` `[V]`. Same class as Stage 1's H1 finding, fixed for `Event` by freezing — not repeated for `ActiveTask` when Stage 2 added it | `state.ts:119`; probe written back 9999 | `state.ts`, `personnel.ts` | **FIXED** — `ActiveTask` frozen on claim and on advance, `progressTicks` made `readonly` |
| **F2** | **Medium** | **The roster told idle workers there was nothing to do when work existed.** A worker idle between completion and re-selection was shown `"nothing claimable — standing by"`. Measured over 5 days: **1,098 of 1,315 idle person-ticks (83%)** carried that false line — the most common string on screen `[V]` | `tick.ts` `standbyReason`; probe3 tally | `tick.ts` | **FIXED** — three distinct reasons now |
| F3 | Medium | **`runCli` had no subprocess timeout.** One stalled `node`+`tsx` child blocked the suite forever. Observed in practice: it wedged Termux on this device several times during Stage 2 | `tools/headless.test.ts` `execFileSync` | `headless.test.ts` | Already fixed in `3d13902`; verified bounded at 60s |
| F4 | Low | **Latent runtime cycle risk.** `personnel.ts` ⇄ `jobs.ts` and `state.ts` ⇄ `rng.ts` are import cycles, safe only because every leg is `import type` and erased `[V]`. Converting one to a value import at Stage 3 would introduce a real cycle | import graph, `personnel.ts`, `jobs.ts`, `rng.ts`, `state.ts` | — | Document; add a guard at Stage 3 if a third module is added to the cycle |
| F5 | Low | **`src/ui/App.tsx` is imported by no test.** The roster, facility cards and priority control have no automated coverage and never run in CI | confirmed; `src/ui/` has no test file | `App.tsx` | Deferred — manual phone gate |
| F6 | Low | **Type-only cycles and `statesEqual` are load-bearing and undocumented as constraints.** `statesEqual` compares via `JSON.stringify`, which cannot distinguish `-0` from `0` and drops `undefined` fields | `state.ts:132` | `state.ts` | Document for Stage 3 |
| F7 | Info | **Arrival timing cannot skip.** `runArrivals` sets `nextArrivalTick = tick + interval`, and `tick` is always +1, so no arrival can be lost or batched. Confirmed: `run(x,3000)` is byte-identical to 3000 × `tick(x)` `[V]` | probe2 | `jobs.ts` | None — working as intended |
| F8 | Info | **Seed changes names, not outcomes.** Verified: rosters differ across seeds while `simulate('balanced', 20260101)` deep-equals `simulate('balanced', 4242)` `[V]`. Correct by design after jitter removal | `stage2-gate.test.ts` | — | None |

### Areas audited and found sound

- **Phase order** — clock → rollover → commands → intent → arrivals → selection → progress. Invariant 19 holds: phase 5 reads intent (0) and facilities (1), never a later phase `[S]`.
- **Hysteresis / invariant 9** — `selectWork` skips anyone with a `currentTask`, so switching is structurally impossible `[S]`. Verified over 3,000 ticks that no person changed job `[V]`.
- **Capacity** — occupancy is derived from `personnel[]`, never stored. Checked every tick for 4,000 ticks × 3 settings `[V]`.
- **`pending` accounting** — never negative across 4,000 ticks × 3 settings `[V]`; `claims == completions + inProgress` exactly `[V]`.
- **Event causal integrity** — 475 started, 468 completed, 7 in hand, 7 people working; every completion cites a real `task_started` for the *same person*, earlier or same tick; 0 bad `[V]`.
- **Commands** — invalid value rejected with no partial change; unknown type rejected and queue drained; two commands apply FIFO in one tick; applied exactly once; duplicate value is a no-op with no spurious event `[V]`.
- **Pause** — 0 ticks while paused; a command issued while paused queues but does not apply; resume replays no paused gap `[V]`.
- **Snapshot isolation** — each `snapshot()` returns fresh arrays; mutating one does not affect the next `[V]`.
- **Architecture guardrail** — still enforces no React/DOM/node imports, no `Date.now`/`performance.now`, no `Math.random`, and `rngCursor` written only by `rng.ts`. `forbiddenFields` correctly narrowed to `storage, items, readiness, resources` `[S]`.

---

## 5. Test-coverage gaps

| Gap | Consequence | Recommendation |
|---|---|---|
| **No UI test** (F5) | Roster and priority control unverified in CI | Cannot close without a browser. Manual gate |
| **No test that `standbyReason` matches the decision that produced the assignment** | F2 shipped undetected | **CLOSED** by the new regression test |
| **No test that a draft cannot mutate its source, for persons/jobs** | F1 shipped undetected | **CLOSED** by the new regression test |
| **The pre-existing immutability test cannot catch F1** | `tick does not mutate the state it was given` snapshots a *fresh* run, where no task exists | Now covered by a test that snapshots a run **after** work has started |
| **No test for multi-day backlog continuity across a day boundary** | The gate runs 5 days but asserts only end-state | Add a Day 4→5 carry-over assertion at Stage 3 |
| **No assertion on `work_order_queued` transition-gating** | Ungated events would pass every other assertion | Add: count must equal the number of 0→1 transitions |

Test counts by area: sim 55 (`tick` 20, `stage2-gate` 18, `rng` 15, `time` 11), controller 33, tools 17 — **123 total**, up from 95.

---

## 6. Stage 2 acceptance-gate results

**Automated half: PASSED** `[V]`. Re-ran from the CLI independently of the test suite; all three settings reproduce the reported five-day reference **exactly**:

| Priority | maint done | meals done | maint backlog | meal backlog | matches reported |
|---|---|---|---|---|---|
| Balanced | 267 | 866 | 30 | 30 | yes |
| Maintenance-first | 297 | 777 | 0 | 119 | yes |
| Meals-first | 257 | 896 | 40 | 0 | yes |

Also verified: neither extreme starves the other to zero (777 meals under maintenance-first; 257 maintenance under meals-first); non-dominance holds on both axes; `balanced` sits between the extremes; duty-claim counts are priority-independent (639/639/638) while intent-claim counts shift (501/442/522); log stays under 3,000 events over five days.

**Manual half: NOT PERFORMED.** See §8.

---

## 7. Determinism findings

`[V]` all confirmed:

- `run(x, 3000)` is byte-identical to 3000 successive `tick(x)` calls.
- Two fully independent runs from scratch are byte-identical.
- Mid-run JSON serialise/restore produces an identical continuation.
- `rngCursor` is exactly **7** after `createRun` and stays 7 across 30 days at 16×. Nothing draws during a tick.
- No wall-clock, DOM, `Date`, or `Math.random` reference exists anywhere under `src/sim` (enforced by 9 architecture tests).
- Iteration order is array order everywhere; no `Set`/`Map` iteration reaches state. The `Map`/`Set` in `jobIndex` and `assignNames` is lookup-only and never serialised.

No hidden nondeterminism found.

---

## 8. Manual verification status

**Completed by this audit:** none. This environment has no browser and no display; no browser-based check was attempted or simulated.

**Outstanding:**

1. **Stage 1 phone gate** — never performed. Recorded as outstanding since the Stage 1 evidence audit; not treated as a hard prerequisite because the authoritative documents do not make it one.
2. **Stage 2 Day 4–5 gate** — not performed. This is the deciding evidence and it is entirely human. Protocol: `docs/plans/STAGE2_MASTER_PLAN.md` §8.2 — predict, change the priority, and confirm the backlog moved, then answer the four evidence items (3 of 4 required).
3. **`NOTIFY_INTERVAL_MS` render cadence at 16×** — still unmeasured.
4. **Roster legibility at phone width** — never rendered.

Item 2 is the one that matters. Stage 3 planning should proceed on the assumption that Stage 2's *gameplay* question is still open.

---

## 9. Stage 3 compatibility risks, ranked by urgency

| Rank | Risk | Now | Stage 3 needs | Constraint | Action before Stage 3? |
|---|---|---|---|---|---|
| **1** | **Nested-mutable-state aliasing** | `draftOf` copies top level only; `currentTask`/`history` were shared until F1 was fixed | `needs`, `injuries`, `schedule` are all nested arrays on a person. The same shallow copy exposes each of them | Every new nested structure must be frozen or rebuilt. Without that, "the previous state stays usable" silently stops being true | **Yes — decide the rule once.** Recommend: freeze every object placed in state, as `Event` and now `ActiveTask` do. Cheap now, expensive across five new fields |
| **2** | **No ownership enforcement** | Ownership is a convention held by review; `person.ts` writes person fields but nothing prevents another module doing so | Needs, Facilities, Jobs will all need person mutations | `SYSTEM_DEPENDENCIES.md` invariant 18 is untested. `architecture.test.ts` greps source but has no per-field ownership check | **Yes — add one ownership test** before the first second-writer arrives |
| **3** | **Latent import cycles** (F4) | `personnel ⇄ jobs`, `state ⇄ rng`, safe only via `import type` | Adding a third module to either cycle turns it into a runtime cycle that fails at load | Not detectable by the current architecture tests | **Recommended** — add a cycle check to `architecture.test.ts` |
| **4** | **`persons[].currentTask` shape will change** | A single optional task | Needs may allow several concurrent activities; rest may be a *task* | A person doing rest and a job simultaneously has no representation | **No** — decide during Stage 3 design, not now |
| **5** | **Arrival model has no owner for *why* work exists** | Fixed cadence is `jobs.ts`'s own invention, documented as an assumption | Needs must drive demand for work to be meaningful rather than arbitrary | If meals arrive on a timer regardless of hunger, hunger becomes decoration | **Yes, conceptually** — Stage 3 should decide whether arrival becomes need-driven before building on it. No code change now |
| **6** | **Structural deficit with no relief** | 99.7% utilisation, backlog grows unbounded | `D1`'s consequence ladder makes it meaningful | Backlog numbers will grow every session, so any UI comparing absolute values across runs will mislead | **No** — Stage 3 owns the consequence |
| **7** | **D21 / Stage 7 equipment** | Untouched; `jobs[].pending` is Jobs-owned | Stage 7 attaches a repair queue there | — | **No.** Preserved and guaranteed. Nothing in this audit changes it |

---

## 10. Fixes made

**One commit: `3b3a0f7df2ed2f56a755407416f3a5d72bf46169`** — "Fix two defects found in the Stage 2 final audit". Not pushed.

- **F1** — `ActiveTask` frozen in `claimTask` and `advanceTask`; `progressTicks` now `readonly`. Files: `src/sim/personnel.ts`.
- **F2** — `standbyReason` now distinguishes facility-at-capacity, work-waiting-but-selection-not-yet-run, and genuinely no work. File: `src/sim/tick.ts`.
- **Two regression tests** added to `src/sim/stage2-gate.test.ts` (121 → 123 tests).

**Reference results unchanged and re-verified after the fix**: 267/866·30/30, 297/777·0/119, 257/896·40/0. Neither fix altered simulation behaviour — one changed immutability, the other a display string. No expectation was weakened.

---

## 11. Deferred, and why

| Deferred | Reason |
|---|---|
| UI test coverage | Needs a browser this environment does not have. Faking it would be worse than the gap |
| Ownership enforcement (risk 2) | Architectural, not a Stage 2 bug. Recommend it as a Stage 3 prerequisite rather than changing it mid-audit |
| Import-cycle guard (risk 3) | Low urgency; no cycle exists today |
| `statesEqual` hardening | Would change a Stage 1 contract under audit conditions |
| Re-tuning the arrival model | Explicitly a documented provisional assumption; Stage 3 should revisit it with the gameplay question answered |
| Needs / fatigue / readiness | Stage 3. Out of scope by instruction |
| Stage 1 phone gate, Stage 2 Day 4–5 gate | Require a human with a browser |

---

## 12. Prerequisites for the Stage 3 Plan Mode session

1. **Run the Day 4–5 manual gate.** Answer the four evidence items and record the answers in `CHANGELOG.md`. Everything about Stage 3's scope depends on whether Stage 2 was interesting, and that is currently unknown.
2. **Decide the nested-state rule once** (risk 1). Stage 3 adds five nested fields per person. Recommend freezing everything placed in state, matching `Event` and `ActiveTask`.
3. **Decide whether work arrival becomes need-driven** (risk 5). If meals keep arriving on a timer regardless of hunger, `D1`'s readiness spine becomes decorative — and readiness is Stage 3's core deliverable.
4. **Decide the concurrent-activity model** (risk 4). Can someone rest *and* work? The current single-task shape cannot express it, and Needs depends on the answer.
5. Optionally add the ownership test (risk 2) before the first second-writer exists.

---

*Nothing in this report was inferred without evidence. Every `[V]` marking corresponds to a command run during this audit. No browser-based check was performed or claimed.*