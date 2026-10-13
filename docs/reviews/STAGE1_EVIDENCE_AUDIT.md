# Stage 1 — Evidence Audit

**Status:** read-only audit. No source, test, configuration, or Git history was
modified. This report is the only file created.

**Method note.** Claims are labelled by how they were established:
**[source]** read from the code at a cited line · **[run]** produced by a command
executed during this audit, output reproduced · **[log]** taken from existing CI
or prior output, not re-derived here · **[unverified]** no evidence exists.

---

## 1. Repository, branch, commit

| | |
|---|---|
| Branch | `main` |
| Commit | `14c365917f332826fc4cc310dd8a110a22fd58ec` |
| Working tree | clean (`git status --porcelain` empty) |
| Remote | `github.com/MarkKramm/Milsim` (private) |
| CI — `docs` | success, run 38353990078, commit `14c3659` **[log]** |
| CI — `ci` | success, run 38353990074, commit `14c3659` **[log]** |

---

## 2. Requirements and documents inspected

Authoritative requirements, as identified in the checked-out tree:

| Document | Version basis | Used for |
|---|---|---|
| `docs/ARCHITECTURE.md` | @ `14c3659` | §3 state shape, §4 tick loop, §4.0 event-log contract, §5 RNG, §6 events, layering §2 |
| `docs/SYSTEM_DEPENDENCIES.md` | @ `14c3659` | §3 field ownership, §4 phases, §8 invariants 10/11/14/15 |
| `docs/ROADMAP.md` | @ `14c3659` | §Stage 1 contract table — the binding Stage 1 spec |
| `docs/LOCKED_DECISIONS.md` | @ `14c3659` | D4 pacing, D9 pure simulation, D10 seeded RNG, D15 serialization |
| `docs/plans/STAGE1_PLAN_v4.md` | @ `14c3659` | approved Stage 1 implementation spec (§5, §6, §6.1) |
| `docs/GAME_DESIGN_BLUEPRINT.md` | @ `14c3659` | A1 Clock, A2 RNG, A3 Events, A4 Commands, G2 Headless |

Source inspected in full: `src/sim/{state,tick,time,rng,events,commands,intent}.ts`,
`src/controller/{timeline,controller}.ts`, `src/ui/App.tsx`, `src/main.tsx`,
`tools/headless.ts`, and all six `*.test.ts` files.

---

## 3. Executive verdict

**Verified with limitations.**

Stage 1's core simulation is **correct and independently confirmed**: the clock,
the rollover boundary, the command queue, determinism, state immutability, RNG
reconstruction, and the pure-simulation boundary all hold under direct
inspection and execution.

**One confirmed defect exists**, in the controller rather than the simulation:
changing speed while the simulation is *running* discards elapsed time. It is
user-visible, it contradicts the Stage 1 contract, and no test covers it. The
smallest correction is one conditional in one function.

**One latent aliasing hazard exists** in `draftOf`, with two documentation and
test-name claims that overstate the guarantee. It is not an active bug.

The manual phone-UI gate **remains unverified**. It has never been performed.

---

## 4. Requirement-by-requirement verification

### Part A — verifying the original report

| # | Claim | Evidence | Basis |
|---|---|---|---|
| 1 | Tick advances exactly 1 | `tick.ts:33` `next.tick = state.tick + 1`; test `tick.test.ts:13` passes | [source][run] |
| 1 | Tick order: clock → rollover → commands | `tick.ts:32,42,51` | [source] |
| 1 | Commands only via queue | `tick.ts:24-25`, `commands.ts:32-37`; `tick(state)` takes no command parameter | [source] |
| 1 | Queue drains, applied once | `commands.ts:48-57`; tests `tick.test.ts:141,154` | [source][run] |
| 1 | Invalid command rejected with reason | `commands.ts:50-56` emits `command_rejected` with `data.command` | [source][run] |
| 1 | Log is single authoritative copy | `state.ts:40`; `ARCHITECTURE.md` §4.0 | [source] |
| 1 | Identical state for identical inputs | test `tick.test.ts:72` compares whole state, not just log | [source][run] |
| 2 | Mulberry32, single entry point | `rng.ts:49-55`, `rand` at `rng.ts:67` is the only writer of `rngCursor` | [source] |
| 2 | Seed affects the stream | `rng.test.ts:32`; probe B: different seeds differ in 500/500 draws | [source][run] |
| 2 | Cursor stays 0 in ordinary runs | probe: `rngCursor: 0` after 1440 ticks; test `tick.test.ts:172` (30 days) | [run] |
| 2 | Reproducible across serialize/restore | probe A: next draw after JSON round-trip **matches exactly** | [run] |
| 3 | Speeds 0/8/32/128 | `timeline.ts:26-31`; test `timeline.test.ts:8` | [source][run] |
| 3 | Pause runs zero ticks | `timeline.ts:67-77`; test `timeline.test.ts:12` | [source][run] |
| 3 | Per-frame cap 240, backlog retained | `timeline.ts:43,84,89`; probe E: cap reaches 240 when deltas are large | [source][run] |
| 3 | **Speed change while running** | **probe F: elapsed time discarded — DEFECT, §5.1** | [run] |
| 3 | Hidden-tab catch-up | probe I: 600 000 ms → 240 run + 4 560 backlog | [run] |
| 3 | Resume does not replay pause | `controller.ts:85`; test `controller.test.ts:47` | [source][run] |
| 4 | Headless deterministic | 3 consecutive runs → digest `101e3989` identical | [run] |
| 4 | Headless exit codes | `--ticks abc` → exit 1; `--help` → exit 0 | [run] |
| 5 | No UI/browser in `src/sim` | raw grep: 0 hits for react, document, window, `Math.random`, `Date.now`, performance, rAF, `node:` | [run] |
| 5 | UI imports controller only, never sim | `App.tsx:14-19`; no `sim/` import | [source] |
| 6 | Typecheck / tests / build | typecheck exit 0; **89/89 tests**; `✓ built in 4.41s` | [run] |
| 6 | CI configured and green | `ci.yml` runs `npm ci`, typecheck, test, build, headless; both workflows success | [source][log] |
| 7 | No gameplay leaked into Stage 1 | gameplay identifiers absent from `src/sim` executable code (one comment only); `SimState` has exactly 7 fields | [run] |
| — | Phone UI manual gate | **UNVERIFIED** — never opened in a browser | [unverified] |

### Where the previous report overstated

| Report claim | Finding |
|---|---|
| "the input and the output share no mutable structure" (`state.ts:71-72`) | **False for nested event objects.** Proven in §5.3 |
| "the cap defers work but never loses it" (`timeline.test.ts:65`) | The cap never engages in that test — peak 8 of 240 (§5.5) |
| Headless digest as evidence of determinism | Digest is seed-independent by construction (§5.4) |

---

## 5. Investigations

### 5.1 Speed-change semantics — **CONFIRMED DEFECT**

**Question:** if elapsed time accumulates at 1× and the user switches to 16×
before the next update, what happens to the already-accumulated time?

**Answer: it is silently discarded.**

**Mechanism.** `Controller.setSpeed` (`controller.ts:78-87`) unconditionally
executes `this.lastFrameMs = now()` at line 85. The frame loop derives elapsed
time as `deltaMs = timeMs - lastFrameMs` (`controller.ts:155`). Resetting the
baseline therefore erases the interval since the previous frame before `advance()`
is ever called.

**Evidence [run]** — real clock, injected frame callback, 400 ms gap:

```
CONTROL (no setSpeed)     ticks after 400ms at 1x: 3        (correct, ≈3)
WITH setSpeed mid-gap     ticks after 400ms     : 0        (all 400 ms lost)
```

**Why this contradicts the specification.**

- `ROADMAP.md` §Stage 1 contract, *Background throttling*: "**never discard
  accumulated time**".
- `ROADMAP.md` §Stage 1 contract, *Pause and backlog*: "**elapsed while running**
  accrues normally".
- `docs/plans/STAGE1_PLAN_v4.md` §6.1 scopes the reset narrowly: "**On resume**,
  reset the frame baseline so the first `deltaMs` is ~0." The code applies it to
  *every* speed change, not only resume.

**Reachability and severity.** Any speed-button click loses up to one frame of time
(≈16 ms at 60 fps — minor). The serious case: the tab is hidden, no frames run, the
elapsed interval was never fed to the accumulator, and if the user taps a speed
button **before** the first frame after waking, `lastFrameMs` jumps to now and the
**entire hidden interval is discarded**. The user returns, taps 16× to skip ahead,
and nothing catches up. This is the exact symptom the catch-up contract exists to
prevent, and it is reachable on the phone, which is the target device.

**Test coverage: none.** `controller.test.ts` covers 1×→pause→1× (line 47) and a
notification-only speed change (line 130). No test performs a running→running speed
change. The pure-function tests in `timeline.test.ts` cannot detect it, because the
discard happens in the controller before `advance()` is called.

**Smallest correction** (proposed, not applied): reset the baseline only when
leaving the paused state.

```ts
// controller.ts:78
setSpeed(speed: SpeedName): void {
  if (speed === this.speed) return;
  const wasPaused = SPEEDS[this.speed] === 0;
  if (SPEEDS[speed] > 0) this.lastActiveTps = SPEEDS[speed];
  this.speed = speed;
  // Only a pause->running transition must discard the paused interval.
  // A running->running change must not discard time since the last frame.
  if (wasPaused) this.lastFrameMs = now();
  this.emit(true);
}
```

**Suggested regression tests** (both would fail today):

1. `setSpeed` while running preserves elapsed time — 400 ms at 1× then switch to
   16× must advance ≈51 ticks, not 0.
2. Speed change after a long idle interval must not discard it — a 10-minute
   simulated gap followed by `setSpeed` must still bank ≈4 560 backlog ticks.

### 5.2 RNG reconstruction — **VERIFIED CORRECT, one test gap**

**Cursor semantics [source].** `rngCursor` is a **count of draws taken**, not an
internal generator word. `rand` (`rng.ts:67-70`) increments it, then computes
`mulberry32(draft.seed, draft.rngCursor)`. `mulberry32` (`rng.ts:49-55`) is a pure
function of `(seed, draws)`, folding the seed in as `seed + draws * INCREMENT`.

Consequence: the complete state needed to reproduce the next value is exactly
`(seed, rngCursor)`, both of which are numbers in `SimState` (`state.ts:31,33`) and
both JSON-serializable.

**Serialization round-trip [run].** Three draws, serialize, restore, draw again:

```
cursor after 3 draws : 3
restored next draw  : 0.7292939077597111
uninterrupted draw  : 0.7292939077597111
MATCH               : YES
restored.cursor     : 4     uninterrupted.cursor: 4
```

The restored run's next draw is **bit-identical** to the uninterrupted run.

**Sequence properties [run].** Identical seed → identical 500-draw sequence: YES.
Different seed → **500/500 draws differ**.

**Are the tests algorithm-specific?** Yes. `rng.test.ts:14-20` holds five expected
values derived from the published Mulberry32 algorithm via an independent
implementation, not from the code under test. These are true test vectors, not
"outputs exist" assertions. `rng.test.ts:47` additionally checks the mean over
100 000 draws stays within 0.01 of 0.5.

**Test gap.** No committed test covers (a) serialization across draws, (b) full
sequence equality across two independent 500-draw runs, or (c) that every draw of
two different seeds differs. All three were verified here by probe only. The
behaviour is correct; the *regression protection* is missing. These are the exact
tests that would catch a future change making `rand` depend on hidden state.

**Recommendation:** add the three tests. They cost about 15 lines and lock in the
property that replay depends on.

### 5.3 Event immutability — **ALIASING HAZARD CONFIRMED, NOT AN ACTIVE DEFECT**

**Question: is immutability enforced by types, runtime, or convention?**

**By convention only.** `Event` (`events.ts:24-36`) declares every field mutable:
`id: number`, `tick: number`, `type: string`, `tier`, `subjects: string[]`,
`causeEventIds: number[]`, `data: Record<string, unknown>`. No `readonly`
modifier appears. Nothing at runtime prevents mutation.

**Can code mutate a shared event through a draft? Yes [run].** `draftOf`
(`state.ts:74-84`) spreads each array but shares element references:

```
ARRAY shared?           : false   (array copied)
EVENT object shared?    : true    (same object reference)
event before mutation   : {"id":0,...,"data":{"day":2}}
original after mutation : {"id":0,...,"data":{"day":999}}
ORIGINAL STATE MUTATED? : YES
```

Mutating `draft.log[0].data.day = 999` changed the **original state's** event.

**Would this affect the original state?** Yes, as shown. That breaks the
immutability contract the rest of the design rests on.

**Is it safe for current requirements?** Yes, today. `emit` (`events.ts:57-70`)
only ever constructs new objects and pushes them; `tick` never mutates an event.
No executable path in Stage 1 mutates an existing event. So **no current bug**.

**Why it still matters.** The hazard activates the moment any later stage mutates
an event — for example enriching a `day_rollover` record, or a report system
annotating an event. The failure is silent and corrupts historical state, which is
precisely the data the causal-report design depends on.

**Two overclaims that should be corrected:**

1. `state.ts:69-72` — the comment states "event objects are shared because they are
   immutable once appended. This is what makes `tick()` provably non-mutating: the
   input and the output share no mutable structure." The first clause is the design
   intent; the second clause is **false as written**.
2. `tick.test.ts:102` — the test is named *"draftOf shares no mutable structure
   with its source"* but constructs an **empty** original log
   (`createRun`, `log: []`). With no events present, event aliasing is
   structurally undetectable. It passes on an implementation that shares events.

**Recommendation — deliberately minimal.** Deep cloning is not justified now: it
costs memory on every tick and would still not prevent a future system from
mutating its own draft. The proportionate fix is to make the contract true at the
type level and correct the two claims:

1. Add `readonly` to `Event` fields and to `SimState.log`. Zero runtime cost,
   compile-time enforcement, and it turns a silent hazard into a build error.
2. Rename the test to what it actually verifies (array-copy and scalar isolation),
   and add one test that *does* catch event aliasing: run to tick 1440, mutate the
   draft's event, assert the original is unchanged.

### 5.4 Headless digest scope — **AMBIGUITY, NOT A DEFECT**

**Observed [run]:** every seed produces the same digest.

```
seed 1          digest 101e3989
seed 999        digest 101e3989
seed 20260101   digest 101e3989
```

**Why, and why it is correct.** `digestOf` (`headless.ts:98-99`) hashes only
`` `${event.type}@${event.tick};` `` over the log. Nothing in Stage 1 consumes
randomness — `rand()` is defined at `rng.ts:67` but **called from no executable
path**, confirmed by grep — so `rngCursor` stays 0 and the seed cannot influence
the tick sequence. This is exactly what the Stage 1 contract predicts.

**The ambiguity.** The digest is a *log* digest. It is blind to `seed` and
`rngCursor`, so it provides **no evidence that the seed is wired through the
system**. A reviewer seeing identical digests across seeds could reasonably
conclude a determinism fault. The JSON output does report `seed` separately, which
mitigates but does not remove the trap.

**Recommendation:** state the digest's scope in `headless.ts` and in `README` — it
covers the event log only, and seed sensitivity is untestable until some system
consumes randomness. No code change required.

### 5.5 Timing test quality — **THREE WEAKNESSES, NO BROKEN IMPLEMENTATION FOUND**

| Test | Preconditions sound? | Finding |
|---|---|---|
| `timeline.test.ts:65` "the cap defers work but never loses it" | **No** | Frames are 1000 ms at 1× = 8 ticks. Cap is 240. Measured peak: **8**. The cap never engages, so the test named for the cap does not test it. Its conservation assertion (line 82) is sound and valuable; its **name** is wrong |
| `timeline.test.ts:94` "a backlog drains at the cap…" | Partly | Feeds 600 000 ms **per frame**, so the backlog grows rather than drains. Measured: 20 frames × 240 = 4 800 delivered. The assertion that the cap binds is meaningful; the **name** is wrong |
| `timeline.test.ts:137` "a resume drains without firing the whole backlog at once" | **Yes** | Deltas large enough to exceed the cap. Measured peak **240 = cap hit**. This test is correctly built and does what it claims |
| `timeline.test.ts:207` "the cap never makes the controller run faster than the cap" | **Yes** | 1 hour at 16× → 4 608 000 owed, returns exactly 240 |
| `timeline.test.ts:46` fractional remainder | **Yes** | 1000 frames × 10 ms at 16× = exactly 1 280. Units consistent, no rounding drift |
| `timeline.test.ts:188` speed change | **Yes** | Uses 1100 ms so 100 ms is genuinely carried; asserts conservation at both rates |

**Could the implementation be broken while these pass?** The conservation
invariant at `timeline.test.ts:82` and `:182` is strong — it would catch any
discard, invention, or rounding loss inside `advance()`. But **none** of these
tests can catch §5.1, because the defect is upstream of `advance()`.

**Concrete failure a weak test would miss:** replace `timeline.ts:89`
(`accumulatedMs: total - toRun * msPerTick`) with
`accumulatedMs: total - (owed * msPerTick)`. The current
`timeline.test.ts:65` would fail. But `timeline.test.ts:65`'s *name* claims to
verify the cap, so a reviewer skimming names would believe cap behaviour is
covered by it when only `timeline.test.ts:137` and `:207` actually are.

**Recommendation:** rename `:65` to describe the conservation invariant, and
rename `:94` to describe the cap binding. No behavioural change needed.

### 5.6 Controller sequences

| Sequence | Observed behaviour | Verdict |
|---|---|---|
| Accumulate → pause → resume | Pause returns accumulator byte-for-byte (`timeline.ts:77`); resume drains at cap | Correct |
| Backlog beyond cap | 600 000 ms → 240 run, 4 560 backlog | Correct |
| Pause while backlog exists | Accumulator frozen; `lastActiveTps` measures it (`controller.ts:141-142`) | Correct — regression-tested at `controller.test.ts:140` |
| **Speed change while running** | **All elapsed time since last frame discarded** | **DEFECT §5.1** |
| Fractional remainder across speed change | 1100 ms at 1× → 8 ticks + 100 ms carried; at 16× the 100 ms → 12 ticks + 6.25 ms carried | Correct; documented in test at `timeline.test.ts:194-204` |
| Hidden-tab interval | 10 min gap → 240 run + 4 560 backlog | Correct |
| Speed-up re-values a banked backlog | 570 000 ms carry = 4 560 ticks at 1× but **72 960** at 16× | **Undocumented ambiguity** |

**The re-valuation question, answered precisely.** The accumulator is denominated
in **milliseconds**, not ticks (`timeline.ts:45-52,89`). Speed therefore changes
what banked milliseconds are *worth*, but never their amount. Worked example:

```
700 ms at 1x   -> run 5 ticks, carry 75 ms      (700 / 125)
75 ms at 16x   -> run 9 ticks, carry 4.6875 ms  (75 / 7.8125)
net: 700 ms bought 5 ticks at 1x, 14 ticks after switching to 16x
```

This is consistent with elapsed-time equivalence — 700 ms of real time is worth
more simulation at a higher multiplier — and it preserves the conservation
invariant. It is **defensible and correct**, but no document states it. A player
who banks a backlog at 1× and switches to 16× sees the backlog number multiply by
16, which is surprising without explanation.

**Ambiguity to record, not resolve:** `ROADMAP.md` and `STAGE1_PLAN_v4.md` §6.1
specify pause and background-tab behaviour but say nothing about speed changes
while running. Two defensible readings exist: (a) banked time is re-valued at the
new rate — current behaviour; (b) banked time is spent at the rate it was earned
at. The code implements (a). A one-line contract row would close this.

---

## 6. Commands actually run

All run from the repository root on the target machine.

| Command | Result |
|---|---|
| `git rev-parse --abbrev-ref HEAD` | `main` |
| `git rev-parse HEAD` | `14c365917f332826fc4cc310dd8a110a22fd58ec` |
| `git status --porcelain` | empty (clean) |
| `gh run list --limit 4` | `docs` success, `ci` success at `14c3659` |
| `npm run typecheck` | exit 0 |
| `npm test` | **89 tests, 89 pass, 0 fail** |
| `npm run build` | `✓ built in 4.41s` |
| `npm run headless -- --ticks 1440 --seed 20260101 --json` ×3 | digest `101e3989` each time |
| `npm run headless -- --ticks 1440 --seed {1,999,20260101} --json` | identical digest for all three |
| `npm run headless -- --ticks abc` | exit 1 |
| `npm run headless -- --help` | exit 0 |
| raw grep of `src/sim` for forbidden APIs | 0 hits across 8 patterns |
| `rand(` grep in non-test sim code | only the definition at `rng.ts:67` — never called |
| probe: RNG serialize/restore | next draw matches exactly |
| probe: 500-draw sequence equality | identical seed equal; different seed differs 500/500 |
| probe: speed change mid-gap | 400 ms → 0 ticks (defect) |
| probe: hidden-tab 10 min | 240 run + 4 560 backlog |
| probe: `draftOf` event aliasing | original state mutated — confirmed |

---

## 7. Findings separated by class

### 7.1 Confirmed defects

**D1 — `setSpeed` discards elapsed time while running.** `controller.ts:85`.
Severity: moderate, user-visible, phone-reachable. Contradicts `ROADMAP.md`
§Stage 1 contract on two counts. Untested. Fix: one `wasPaused` conditional.

*This is the only confirmed behavioural defect.*

### 7.2 Confirmed overclaims (documentation and test names)

| # | Location | Claim | Reality |
|---|---|---|---|
| O1 | `state.ts:69-72` | "the input and the output share no mutable structure" | False for nested event objects |
| O2 | `tick.test.ts:102` | test name claims no shared mutable structure | Uses an empty log; cannot detect sharing |
| O3 | `timeline.test.ts:65` | test name claims it tests the frame cap | Cap never engages (peak 8 of 240) |
| O4 | `timeline.test.ts:94` | test name claims the backlog "drains" | Backlog grows; 600 s fed per frame |

None of these causes incorrect behaviour. All four would mislead a future
maintainer, which in a solo project with a written architecture is the actual risk.

### 7.3 Latent hazards

**H1 — `draftOf` shares event objects; `Event` is mutable by type.** Proven
reachable (§5.3). Inactive today because nothing mutates events. Would become a
silent data-corruption bug the first time a later stage enriches a log record.

### 7.4 Ambiguities in the specification

**A1 — banked time is re-valued on speed change.** Current behaviour is defensible
and conservation-preserving, but undocumented.

**A2 — the headless digest is seed-blind.** Correct, but its scope should be stated
so it is not misread as a determinism failure.

### 7.5 Optional improvements (no defect behind them)

- Add the three missing RNG regression tests (§5.2).
- Rename the four tests/comments above.
- `TICKS_PER_DAY` is duplicated as a literal `1440` in `App.tsx:34` and again in
  prose at `App.tsx:84`. Importing the constant would prevent drift.
- `NOTIFY_INTERVAL_MS` (`controller.ts:47`, 100 ms) is the render-decoupling
  mechanism and has no test. It is unobservable without a browser.

---

## 8. Prioritized fixes

| # | Fix | Why | Regression test that must exist |
|---|---|---|---|
| 1 | Gate the `lastFrameMs` reset in `setSpeed` on `wasPaused` (`controller.ts:85`) | Confirmed defect; loses up to a full idle interval, and an entire hidden-tab interval if a speed is tapped before the first frame | 400 ms at 1× → switch to 16× → must advance ≈51 ticks, not 0 |
| 2 | Add `readonly` to `Event` fields and `SimState.log` | Turns H1 from a silent hazard into a compile error, at zero runtime cost | Mutating `draft.log[0].data` must fail to compile |
| 3 | Add an event-aliasing test using a **non-empty** log | O2 currently cannot detect the hazard it is named for | Run to tick 1440, mutate the draft's event, assert the original is unchanged |
| 4 | Correct the comment at `state.ts:69-72` | O1 is false as written | — |
| 5 | Rename the two misleading timing tests | O3, O4 mislead name-based review | — |
| 6 | Add serialize/restore and sequence-equality RNG tests | Locks in the property replay depends on; currently probe-only | 3 draws → JSON → restore → next draw equals uninterrupted |
| 7 | Document speed-change re-valuation in the Stage 1 contract | Closes A1 | — |
| 8 | State the digest's scope in `headless.ts` and `README` | Closes A2 | — |

Items 1–3 are the only ones I would call necessary. The rest are hygiene.

---

## 9. Unverified items

| Item | Status | Evidence that would close it |
|---|---|---|
| **Phone UI manual gate** | **Never performed.** The app has never been opened in a browser | Run `npm run dev`, open on the phone, confirm the seven values update, 1× advances ≈8 ticks/s, all four speeds change the rate, Pause stops the clock, a day-rollover appears, and the panel is usable at phone viewport |
| React re-render cadence under 16× | Unverified. `NOTIFY_INTERVAL_MS` is untested | Instrument a render counter while running at 16× and confirm it stays ≤ ~10/s |
| Real frame rate on the target device | The 60 fps figure underlying `MAX_TICKS_PER_FRAME` is an assumption | Measure actual rAF cadence on the phone |
| Behaviour with a large log | Unexamined. Event sharing makes this O(n) in aliasing risk | Run several thousand ticks and check memory and tick cost |
| Long-run digest stability | Only 1 440 and 5 000 ticks exercised here | Run 50 000+ ticks and confirm the digest is stable and the test time acceptable |

**A caution about CI.** `ci` runs `npm ci`, typecheck, tests, build, and a headless
run. That establishes the simulation is correct in Node. It establishes **nothing**
about the React interface, the render loop, or the phone — `src/ui/App.tsx` is
never imported by any test. A fully green CI is compatible with a completely broken
interface.

---

## 10. Recommendation

**Stage 1 can remain closed, provided D1 is recorded as a known limitation, or
fixed first.** It is a one-line change with a clear regression test, and I
recommend taking it rather than carrying it into Stage 2, because Stage 2 is
where the interface becomes interactive enough for a player to click speeds
mid-session and notice.

Order of work:

1. Fix D1 (`controller.ts:85`) and add its two regression tests.
2. Add the `readonly` modifiers and the event-aliasing test — cheap, and closes H1
   before the log starts carrying real gameplay events.
3. Correct the four overclaims (O1–O4). Documentation accuracy only.
4. Perform the **phone manual gate**, which is still outstanding and is the only
   thing standing between "verified in Node" and "verified as a working app".
5. Add the remaining optional items opportunistically.

**What this audit does not claim.** A green suite and a green CI do not establish
that Stage 1 is correct. They establish that the tests it contains pass. This
audit found one real defect that 89 passing tests did not catch — and that a
single probe with a real clock found in under a minute — plus four claims in
comments and test names that were not true as written. Stage 1 is in good
condition, but the honest summary is *verified in Node*, not *verified*.

**Do not read this as endorsement of Stage 2.** Stage 2's gate asks whether
watching personnel work is interesting. Stage 1 contains no personnel and cannot
answer it, and per `ROADMAP.md` that gate is the easiest in the project to fake.
---

# Addendum — findings actioned

**Applied at commit `e86113e`.** This addendum records what was done with each
finding above. It does not replace the audit; the audit's evidence stands as
written.

## Resolved

| # | Finding | Resolution |
|---|---|---|
| **D1** | `setSpeed` discarded elapsed time while running | `controller.ts` resets the frame baseline only when `wasPaused`. Two regression tests added; **both verified to fail against the old code** |
| **H1** | `draftOf` shares event objects, mutability by convention only | `Event` fields are `readonly`, nested collections `Readonly`, and each event is `Object.freeze`d at creation. Sharing is now safe by construction |
| **O1** | `state.ts` claimed no shared mutable structure | Reworded to the precise guarantee: none at the top level; nested events are shared *and immutable* |
| **O2** | Test named for a property it could not detect | Renamed to what it verifies, plus a new test that covers the hazard with a non-empty log |
| **O3** | Test named for the cap; cap never engaged (peak 8/240) | Renamed to the conservation invariant it actually checks |
| **O4** | Test named "backlog drains"; backlog grew | Renamed to "the cap binds when a frame owes more than the cap" |
| **RNG gaps** | Serialize/restore and sequence equality were probe-only | Three tests committed: mid-stream round-trip reproduces the next draw exactly, 500-draw sequences match for equal seeds, all draws differ between seeds |
| **A1** | Speed-change re-valuation undocumented | New row in the `ROADMAP.md` Stage 1 contract |
| **A2** | Digest scope unstated | Documented in `headless.ts`: it covers the event log only, so it is seed-identical at Stage 1 by design |
| — | `1440` duplicated as a literal in `App.tsx` | Replaced with `TICKS_PER_DAY` |

**Tests: 89 → 95.** `npm run verify` exits 0. Both CI workflows green.

## A note on the regression tests

The first version of the second regression test drove the controller through
`step()`, which takes an explicit delta and never reads `lastFrameMs` — so it
**could not detect the defect it was written for**. It passed against the buggy
code. It was rewritten to drive the frame loop, which is where the defect lives.

Both tests were then confirmed to fail when the fix is reverted and pass when it
is applied. A test that has never been observed failing is not evidence.

## Still outstanding

- **The phone manual gate.** Never performed. `src/ui/App.tsx` is imported by no
  test, so CI cannot speak to it.
- `NOTIFY_INTERVAL_MS` render cadence — unobservable without a browser.
- Behaviour with a large log.

The defect fixed in D1 was found by a probe with a real clock taking under a
minute, after 89 tests had passed for days. That is worth carrying into Stage 2:
the suite is necessary and it is not sufficient.
