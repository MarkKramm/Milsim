<!-- SYNCSTAMP -->
<!-- v6759255 | 375 lines | 6759255 -->

# Stage 1 Implementation Plan — v4 (approved)

> Revised after three external reviews of v1. What changed and why is in §1 and §12.
> Nothing here has been implemented.

---

## 1. What changed

The review found one genuine technical flaw and four correct tightenings. All are
applied. One of its recommendations was **declined**, with reasoning in §12.

| | v1 | v2 |
|---|---|---|
| Command flow | `tick(state, commands)` merging into `state.pendingCommands` — **ambiguous, could apply a command twice** | `tick(state)` drains the queue; `enqueue(state, cmd)` adds to it. One source of truth |
| State shape | Minimal 8-field shape, contradicting `ARCHITECTURE.md` §3 | Both documents corrected and now agree; the target shape is annotated by stage |
| Rollover | "part of clock", placement unspecified | Checked **immediately after the clock advances**, before commands. Tick 0 emits nothing |
| Background tabs | Clamp per-frame `deltaMs` **and** claim elapsed-time equivalence — **self-contradictory** | Never discard accumulated time. A per-frame cap limits burst without losing backlog |
| `droppedTicks` | Considered as state | Removed from `SimState` — it is a controller diagnostic |
| Genesis event | Optional "run started" event | Dropped. It exists only to make the log look busier |

The two documents that contradicted each other are now fixed at source, so the
next agent cannot implement the old shape by mistake.

---

## 2. Repository state

Unchanged from v1 and re-verified: HEAD `b4f89fc`+ , clean tree, private remote
`github.com/MarkKramm/Milsim`, docs CI green. Node v24.18.0.

Scaffold verified present: `package.json` (React 18, Vite 6, TS 5.7, `tsx`),
`tsconfig.json` (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
+ `verbatimModuleSyntax`). Missing and to be created: `vite.config.ts`,
`index.html`, `src/main.tsx`, `tools/headless.ts`. `node_modules` and
`package-lock.json` absent; `@types/node` not declared.

---

## 3. Scope

**In:** scaffold; pure `src/sim` with state, tick loop, seeded RNG, fixed tick
order; `tools/headless.ts`; minimal live-numbers UI; pause/1×/4×/16×; tests and
exit gate.

**Out:** personnel, jobs, needs, facilities, resources, equipment, production,
combat, decisions, reports. **No placeholders pretending to implement them.**

**Deliberately not built, per review** — each would be scaffolding for a future
stage rather than something Stage 1 needs:

- No generic phase scheduler. Three documented operations in a fixed linear
  function. The phase numbers in `SYSTEM_DEPENDENCIES.md` §4 remain authoritative
  and are referenced by comment.
- No command framework. Stage 1 has no valid commands; a small explicit
  rejection path is enough.
- No reporting subsystem. The headless runner prints a small digest and nothing else.
- No generic runtime ownership enforcement. Ownership is enforced by keeping
  writes centralised and visible, plus the tests in §8.
- No elaborate UI state management. One controller, one subscription, one panel.
- `intent: []` exists because the ownership table marks it Stage 1. It stays an
  empty array. **It is not permission to build intent resolution early.**

---

## 4. Architecture

```
UI          src/ui, src/main.tsx, index.html   reads snapshot, sends enqueue/speed
Controller  src/controller                      wall-clock, speed, pause, drives sim
Simulation  src/sim                             PURE: state -> state + events
```

Dependencies point downward only. `src/sim/**` imports no React, no DOM, no
browser globals, and no `Date.now()` / `Math.random()`. The controller is the
only thing that reads wall-clock time.

Enforcement: `tools/headless.ts` (G2) plus an architecture test that greps
`src/sim` for forbidden imports.

---

## 5. State, clock, and tick

### 5.1 State

```ts
interface SimState {
  seed: number; rngCursor: number; tick: number;
  nextEventId: number; log: Event[];
  pendingCommands: Command[]; intent: Intent[];
}
```

This is `ARCHITECTURE.md` §3 with the later-stage fields absent, which is what
that document now says should happen. **Derived values are not stored** —
readiness and `resources` never appear in state.

Plain JSON only: no class, function, `Map`, `Set`, or `Date`.

### 5.2 Clock

`TICKS_PER_DAY = 1440`. `day = floor(tick / 1440) + 1`, so tick 0 is Day 1.
Period from minute-of-day: Night 0–5, Morning 6–11, Afternoon 12–17, Evening 18–23.
Day and period are **derived**, never stored.

### 5.3 Tick sequence

Phase 0 only. Later phases are absent, not stubbed.

| # | Operation | Notes |
|---|---|---|
| 1 | Advance clock | `tick := tick + 1`. Exactly +1 (invariant 10) |
| 2 | Derive day; **check rollover** | If `tick > 0 && tick % 1440 === 0`, append `routine` event with `{ day }`. Tick 0 emits nothing |
| 3 | Drain commands | `pendingCommands` in FIFO order, then emptied |
| 4 | Apply intent | No-op — `intent` is empty and unresolved at Stage 1 |

Rollover is checked immediately after the clock advances, before commands,
because it depends only on time. Commands cannot alter it.

### 5.4 Commands

```ts
function enqueue(state: SimState, command: Command): SimState  // appends
function tick(state: SimState): SimState                       // drains at step 3
```

`tick` takes **no** command parameter. One code path owns every command.

Stage 1 has **no valid command types**. `Command` is an empty union. Any command
that reaches `applyCommands` is rejected with a recorded reason (A4) — the
rejection path is real, and it is the entire implementation.

**Why the parameter was removed** (v1 had it, and it was wrong): the Stage 1
contract requires orders to be persisted with state so a saved run resumes with
unissued orders intact. A function parameter is not persisted. Worse, a caller
that both enqueued and passed the same command would have it applied **twice**.

### 5.5 RNG

`rand(draft): number` — Mulberry32, mutating `rngCursor` on a draft internal to
one tick. The caller's state is never touched; a test asserts its cursor is
unchanged after `tick`.

**Stage 1 makes no draws, so `rngCursor` stays `0`.** That is the correct
behaviour, not a missing feature. The generator is unit-tested directly rather
than by inventing gameplay that would consume it.

### 5.6 Events

`state.log` is the only copy. `emit()` assigns `id = nextEventId++`, sets `tick`
to the new tick, and requires an explicit tier — `routine`, `notable`, or
`critical`. `causeEventIds` must reference existing, earlier events (invariant 6).

The UI derives "events this tick" as `newLog.length - prevLog.length`, so no
event can be shown twice.

---

## 6. Controller and timing

```ts
advance(accumulatedMs, deltaMs, ticksPerSecond, maxTicksPerFrame)
  -> { ticksToRun, accumulatedMs, backlogTicks }
```

Pure and therefore directly testable.

**The rule: accumulated time is never discarded.**

- `ticksPerSecond === 0` means **paused**: return zero ticks and leave
  `accumulatedMs` byte-for-byte unchanged.
- Otherwise `accumulatedMs += deltaMs` — full measured elapsed, **never clamped**.
- `ticksOwed = floor(accumulatedMs / msPerTick)`.
- `ticksToRun = min(ticksOwed, maxTicksPerFrame)`.
- `accumulatedMs -= ticksToRun * msPerTick` — so **the remainder stays queued** and
  drains on later frames.

**A per-frame cap is not the same as clamping elapsed time, and the difference is
the whole bug.** v1 clamped `deltaMs` to ≤1000ms *and* claimed elapsed-time
equivalence. Those cannot both hold: after a 10-minute background suspension at 1×
the simulation owes 4,800 ticks, a clamp grants 8, and 4,792 ticks vanish.

A cap alone loses nothing. At 60fps a 240-tick cap sustains **14,400 ticks/s**,
which is **112× the 128 ticks/s that 16× requires** — so a backlog always drains
far faster than the speed being caught up to. A full day of backlog clears in
about 100 ms at the cap, versus 11.25 s at 16×.

> **Corrected after a third plan review.** This line previously said the cap
> sustained "far more than the 8,400 ticks a 16× run needs to catch up in a
> second". That figure was simply wrong — 16× is **128 ticks/s** (1440 ÷ 128 =
> 11.25 s per day), not 8,400, and no calculation produces 8,400. The design was
> unaffected; only the arithmetic was. Speed table for reference: 1× = 8 ticks/s
> (180 s/day), 4× = 32 (45 s/day), 16× = 128 (11.25 s/day).

### 6.1 Pause and backlog

*Added after a second plan review, which correctly found that §6 answered "how do
I catch up?" without answering "what does pause mean?" Those are different
questions and the gap hid a real defect.*

Three quantities exist here and conflating any two of them produces a bug:

| Quantity | Behaviour | If you get it wrong |
|---|---|---|
| **Elapsed while running** | Accrues normally | — |
| **Elapsed while paused** | **Discarded. Never becomes debt.** | A pause that keeps accruing turns 10 paused minutes into an instant 10-minute jump on resume. Pause becomes a lie. |
| **Backlog already owed** | **Retained** across the pause — neither discarded nor doubled | Discarding loses owed time; double-adding invents time |

So the rule is:

- **Pause runs zero ticks and freezes the accumulator.** `tps === 0` returns
  `accumulatedMs` untouched. The backlog that existed at the moment of pausing is
  still there when you come back.
- **On resume, reset the frame baseline** so the first `deltaMs` is ~0. This is
  what stops the pause gap being replayed as elapsed time. Without it, resume
  replays the entire paused duration — the same class of bug as the v1 clamp, in
  the opposite direction.
- **A retained backlog drains at the per-frame cap**, never all at once.

### 6.2 The two background policies

*Added after a third plan review, which correctly noted that §6.1's worked example
implied hidden time is always counted while §6 also described an auto-pause mode
that excludes it. Both are valid; they are different policies, and the example must
say which one it is illustrating.*

There are exactly two, and they are mutually exclusive per run:

| | **Catch-up** (default) | **Auto-pause** (optional setting) |
|---|---|---|
| Hidden time | **Counted** — owed when the tab returns | **Excluded** — never becomes debt |
| Returning after 10 min hidden at 1× | 4,800 ticks owed, drained at the cap | 0 ticks owed; resumes exactly where it paused |
| Effect on elapsed-time equivalence | Holds | Intentionally does not — and says so |

**Default is catch-up**, because it is what the timing contract promises: equal
elapsed time yields equal ticks. Auto-pause is offered as a user-facing setting
for someone who would rather the base wait than fast-forward unattended, and
choosing it is a deliberate trade of elapsed-time equivalence for predictability.

**The worked example is the catch-up policy**, with auto-pause disabled. At 1×,
returning after 10 minutes hidden (4,800 ticks owed):

```
return from hidden   ran 240 (cap), backlog 4560
paused 10 s          ran 0, accumulator EXACTLY unchanged
resume frame         ran 240 (cap rate), backlog 4320   <- not 4560 at once
draining             <=240 per frame, final backlog 0    <- nothing lost, nothing invented
```

The second plan review asked whether backlog should keep catching up after a
resume, or whether pause freezes it until the player explicitly resumes. **It
does both, in that order and without conflict:** pause freezes it, resume both
releases it and drains it at a bounded rate. There is no separate "let me catch
up" gesture, because 4,800 ticks at the cap clears in about a fifth of a second.

**Auto-pause on `visibilitychange` is an optional UI affordance.** If enabled,
the baseline resets on return so the hidden period is not counted. It is not a
correctness requirement, and it is not the answer to catch-up: pausing instead of
catching up *discards* elapsed time, which is precisely what this contract exists
to prevent.

`droppedTicks` is a controller diagnostic and is **not** part of `SimState`.

Rendering is decoupled: the loop steps the sim, and notifies subscribers at a
bounded cadence plus on pause/speed change. Eight ticks per second does not mean
eight renders per second.

---

## 7. Headless runner

`tools/headless.ts --ticks N --seed S [--json]` (defaults: 1440, `20260101`).

Runs N ticks with no browser. Prints final tick, day, period, seed, `rngCursor`,
log length, events by tier, and a small deterministic digest for golden runs.
Invalid arguments print usage to stderr and exit 1; success exits 0.

It is the enforcement mechanism for the pure-simulation rule and must keep
working as systems are added.

---

## 8. Test matrix

| Test | Setup | Expected | Catches |
|---|---|---|---|
| Tick +1 | one tick | `tick === 1` | inv 10 |
| Period boundaries | 359/360, 719/720, 1079/1080, 1439/1440 | Night→Morning @360, etc. | off-by-one |
| Day derivation | 0, 1439, 1440, 2879, 2880 | 1, 1, 2, 2, 3 | off-by-one |
| **Rollover absent at tick 0** | start a run | no rollover event | D5 |
| **Rollover present at 1440** | run to 1440 | exactly one, `day: 2` | D5 |
| **Long-run rollover** | 10 days | 9 events, days 2–10, no gaps or duplicates | drift |
| **nextEventId sequential** | run 10 days | ids unique and consecutive | duplicate ids break causality |
| Mulberry32 vectors | fixed cursor | known sequence | wrong algorithm |
| Cursor idle | 1440 ticks, no draws | `rngCursor === 0` | phantom draws |
| Cursor only via `rand` | direct generator test | advances once, nowhere else | inv 11 |
| **Old state untouched** | deep-freeze input, run | input identical after `tick` | accidental mutation |
| **Input RNG cursor unchanged** | run with draws | original cursor unchanged | draft aliasing |
| Only expected fields differ | run N | `tick`, `log`, `nextEventId` only | unowned writes |
| **Determinism — logs** | same seed twice | identical `log` | inv 14 |
| **Determinism — final state** | same seed twice | identical whole state, not just log | partial determinism |
| JSON round-trip | parse/stringify | deep-equal | inv 15, D15 |
| **Command enqueued once** | `enqueue` then `tick` | applied exactly once | double-application |
| Command queue drains | enqueue 2, tick | queue empty, both handled | stuck queue |
| Invalid command rejected | fake command | rejected with reason | silent drop |
| **Pause yields no ticks** | `advance(acc, d, 0, cap)` | 0 ticks, accumulator retained | pause leaks |
| **Pause adds no debt** | pause for 600s with `tps 0` | backlog unchanged, not +4800 | paused time becoming debt |
| **Pause freezes backlog** | backlog exists, then pause | accumulator byte-identical across the pause | backlog lost or doubled |
| **Resume does not replay the gap** | pause 600s, resume with `delta 0` | 0 extra ticks from the pause gap | pause replayed as elapsed |
| **Resume drains without burst** | backlog 4560, pause, resume | first frame ≤ cap; not all 4560 at once | resume stall |
| **Speed rates** | `d=1000`, tps 8/32/128 | 8/32/128 | contract |
| **Backlog preserved** | huge `d`, small cap | backlog non-zero, nothing lost | the v1 bug |
| **Fractional accumulation** | many small `d` | exact tick count | rounding drift |
| **No burst on resume** | backlog then pause then resume | backlog does not fire at once | pause-burst |
| **Sim has no UI** | grep `src/sim` | no react/DOM/`Math.random`/`Date` | D9, rule 1 |
| **Headless no browser** | run CLI | exit 0, summary printed | G2 |
| **Headless bad args** | `--ticks abc` | exit 1, usage | silent misuse |
| Headless determinism | same seed twice | identical digest | golden |

Tests assert contracts, not counts. Golden runs stay one small digest.

---

## 9. Implementation sequence

| Step | Files | Works when done | Verify |
|---|---|---|---|
| 1 | `package.json` (+`@types/node`, widen glob), lockfile, `vite.config.ts` | installs, typechecks | `npm run typecheck` |
| 2 | `time.ts` + test | clock math | `npm test` |
| 3 | `rng.ts` + test | deterministic draws | `npm test` |
| 4 | `events.ts`, `commands.ts`, `state.ts` | types + initial state | typecheck |
| 5 | `tick.ts` + test | a simulation that ticks | `npm test` |
| 6 | `tools/headless.ts` + test | runs without a browser | run it |
| 7 | `timeline.ts` + test | timing is testable | `npm test` |
| 8 | `controller.ts` | loop drives sim | manual |
| 9 | `index.html`, `main.tsx`, `App.tsx` | phone UI live | open browser |
| 10 | `ci.yml` | code CI green | push |
| 11 | — | **exit gate** | §10 |

---

## 10. Exit gate

**Automated:** `npm run verify` passes; tick +1; day/period correct across
boundaries; rollover exactly once per day and never at tick 0; `rngCursor` stays
0; identical seed → identical state and log; JSON round-trip; old state unmutated;
headless runs 1440 ticks with no browser; `src/sim` free of UI code; CI green.

**Manual:** on the phone — clock advances, all seven values update, 1× runs ~8
ticks/s (~3 min/day), the four speeds change the rate, the log grows at day
boundaries, and **the developer can explain what every number means**.

These are separate. A green build does not establish understanding.

**Not claimed:** that the game is fun. Stage 1 has no personnel and cannot test it.

---

## 11. Decisions, now resolved

| | Decision | Status |
|---|---|---|
| D1 | Minimal Stage 1 shape; derived values never stored; `ARCHITECTURE.md` §3 corrected | **Resolved, documented** |
| D2 | `tick(state)` + `enqueue(state, cmd)`; queue is the only source of truth | **Resolved, documented** |
| D3 | Duplicate of D1 | Resolved |
| D4 | `rand(draft)` on a tick-local draft; test asserts the caller's cursor is unchanged | Accepted |
| D5 | Rollover checked after the clock, before commands; none at tick 0; no genesis event | **Resolved, documented** |
| D6 | Add `@types/node`, lockfile, `vite.config.ts`, `index.html`, `main.tsx` | Approved |
| D7 | Widen test glob to `src/**/*.test.ts` | Approved |
| Timing | Never discard accumulated time; per-frame cap only | **Corrected from v1** |
| Pause / backlog | Not answered by v2 §6 | **Added in §6.1** — three distinct quantities, verified |
| 16× catch-up figure | Claimed 8,400 ticks/s — **arithmetically wrong** | **§6** — 16× is 128 ticks/s; cap sustains 14,400/s, 112× faster |
| Background policy | Example implied hidden time is always counted | **§6.2** — catch-up and auto-pause named as two explicit, mutually exclusive policies |

Nothing here reopens a settled decision, expands the design, or adds gameplay.

---

## 12. Review response

**Accepted:** the command-flow ambiguity was real and would have caused
double-applied commands; the state shape had to be corrected at source rather than
worked around in code; rollover placement needed to be explicit; immutability,
final-state determinism, `nextEventId` sequencing, fractional accumulation and
pause-burst tests were all missing and are now specified; the necessity
constraints in §3 are right and have been adopted.

**Declined:** auto-pausing when the tab is hidden, as the fix for the timing
problem. It discards elapsed time, which contradicts the documented contract that
the same elapsed time yields the same ticks. It also conflicts with D4's 16× mode
— a day takes ~11 seconds at 16× precisely so the player can skip ahead, and that
only works if the accumulator is not reset. Both are *available* as a user-facing
setting, but the correctness fix is to stop discarding time, which is what v2
does.

**Also declined:** a generic runtime ownership-enforcement framework. A simulation
with almost no gameplay does not need one, and building it before the systems
arrive means guessing what it must enforce.

**On the phase-order test:** the review is right that it is weaker than it sounds.
With only phase-0 operations it proves nothing about the future phase table. It is
specified as a smoke test of the documented sequence, not as proof of invariant 19
across stages not yet built.