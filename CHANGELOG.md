# Changelog

Notable changes to the project. Design history lives in `docs/` — this file
records what actually changed in the repository.

Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow
[semantic versioning](https://semver.org/). The project is pre-1.0, so `0.x.y`.

## [Unreleased]

## [0.2.0] — Stage 2: autonomous jobs and first intent

The base now has people who work, a reason you can read for every assignment, and
one policy control whose effect you can watch move a backlog.

Exit gate: **not yet passed.** The automated half is built and green; the
manual Day 4–5 phone gate has not been performed. See "What remains unverified".

### Added

**Simulation (`src/sim/`, still pure — no React, DOM, browser globals, clock, or
`Math.random()`)**

- `personnel.ts` — `Person`, the seven-person reference roster, and the only
  writer of person fields. Names are drawn from the seeded stream at creation
  and ranked so the seven are always distinct and differ between seeds.
- `facilities.ts` — workshop and kitchen, capacity 4 each, plus a read-only
  `hasFreeCapacity`. Occupancy is derived, never stored.
- `jobs.ts` — the job table (maintenance 90 ticks / meals 30), the arrival
  cadence, eligibility, and the pending queue.
- `priority.ts` — resolves the single `intent[]` entry into the order job
  selection considers. `balanced` attacks the deeper queue.
- `tick.ts` gained phases 5–7: arrivals, selection, progress. Selection follows
  the `B3` §3 ladder (duties → player intent → opportunity) in ascending id
  order. Hysteresis is structural: a person selects only when idle.
- `commands.ts` — `Command` is no longer `never`. `set_priority` is the entire
  Stage 2 command surface; anything else is rejected with a recorded reason.

**Controller**

- `issue()` and `setPriority()` — the command path. Commands queue and apply at
  the next tick, so a change never lands mid-tick.
- `snapshot()` now carries a derived roster (name, role, task, reason, progress)
  and per-facility occupancy and backlog.

**Interface**

- Facility cards: occupancy and waiting work, with a backlog that turns amber
  when it is piling up.
- Roster: every person, what they are doing, **why**, and how far through.
- A three-way work-priority control that issues a command.

**Tooling**

- `tools/headless.ts` prints the roster and per-job totals, and takes
  `--priority`, so the fixture gate is reproducible from the command line:
  `npm run headless -- --ticks 7200 --priority meals-first`
- `src/sim/stage2-gate.test.ts` — the automated prerequisite for the manual gate.

### Decided during implementation

- **Facility capacity 2 → 4.** At 2+2 the two maintenance-capable people exactly
  filled the workshop and the two supply-capable exactly filled the kitchen, so
  the generalists never reached the player's priority — the control was inert
  before a line of code ran. Duties outrank intent in the selection ladder, so
  capacity, not priority, was deciding everything.
- **Work arrivals.** No document specifies where work comes from. Without a
  demand source there is nothing for priority to allocate, so a fixed cadence was
  added: maintenance every 24 ticks, meals every 8. Derived from the facility
  service ceilings so each job is individually serviceable while the pair
  overcommits the workforce. This is the plan's own invention and the largest
  undocumented assumption in the stage; both numbers are documented in
  `ROADMAP.md` and are the only lever.
- **Arrival jitter was proposed, measured, and removed.** The trade-off comes
  from the throughput-versus-demand mismatch, not arrival timing, and with jitter
  disabled the results are identical. Removing it means nothing draws during a
  tick at all: `rngCursor` is **7** after `createRun` and stays 7 forever. The
  seed now varies the roster names but not the outcome — correct behaviour, and
  it makes the balance provable rather than luck-dependent.
- **`pending` is spent when a worker claims an order, not when it finishes.**
  Decrementing on completion lets several workers claim the same single order
  and drives the backlog negative — phantom work. Covered by a regression test.

### Fixed during implementation

- **`tools/headless.test.ts` could hang forever.** `runCli` used `execFileSync`
  with no timeout, so one stalled child blocked the suite indefinitely — enough
  to wedge the phone on a sequence of eight `node`+`tsx` spawns. Now bounded at
  60s, with a clear failure message.
- **Roster names were identical for every seed.** Ranking sorted before mapping,
  which discarded which person held which rank. Fixed, and ties now produce a
  permutation rather than a collision.
- Two of the master plan's own reference figures were wrong when first written
  (see `docs/plans/STAGE2_MASTER_PLAN.md` §11A). Corrected before implementation
  and reproduced exactly by the build.

### What remains unverified

- **The Stage 1 phone gate has still never been performed.**
- **The Stage 2 manual gate has not been performed.** The Day 4–5 protocol is in
  `docs/plans/STAGE2_MASTER_PLAN.md` §8.2: predict, change the priority, and
  check the backlog moved. The automated gate proves the control is *not inert*
  and that the difference is *causally attributable*. It cannot prove the
  difference is interesting, and only watching it can do that.
- `NOTIFY_INTERVAL_MS` render cadence at 16× is still unmeasured, and the roster
  has never been opened on a phone.

## [0.1.0] — Stage 1: state advances

The first code in the project. A clock that ticks, deterministic, headless, with
no gameplay. Exit gate: watch the clock advance and understand the numbers.

### Added

**Simulation (`src/sim/`, pure — no React, DOM, browser globals, wall clock, or
`Math.random()`)**

- `time.ts` — day, period, minute and hour derived from `tick`. Tick 0 is Day 1;
  a day is 1,440 ticks; periods are Night/Morning/Afternoon/Evening.
- `rng.ts` — Mulberry32, seeded, one entry point (`rand`). The cursor counts draws
  taken, so a run that has drawn nothing reads `0`.
- `events.ts` — append-only event log with significance tiers and causal
  references. `state.log` is the only copy.
- `commands.ts` — the pending-command queue. `enqueue` adds, `tick` drains.
- `state.ts` — the authoritative state object, JSON-serializable, one owner per
  field.
- `tick.ts` — the tick sequence: advance clock, check rollover, drain commands.
  Phase 0 only; later phases are absent rather than stubbed.

**Controller (`src/controller/`)**

- `timeline.ts` — pure wall-clock accumulation. Elapsed time is never discarded;
  a per-frame cap defers work without losing it; pause freezes the accumulator.
- `controller.ts` — owns the clock, speed, pause/resume, and UI notification.

**Interface**

- A single panel showing day and period, tick, seed, RNG cursor, elapsed in-game
  minutes, events this tick, and log length, with Pause / 1× / 4× / 16× controls.

**Tooling**

- `tools/headless.ts` — runs N ticks in plain Node and prints a summary or JSON.
  The permanent enforcement mechanism for the pure-simulation rule.
- `.github/workflows/ci.yml` — typecheck, tests, build, headless smoke test.
- `docs/plans/STAGE1_PLAN_v4.md` — the approved Stage 1 plan, now tracked so the
  implementation specification is version-controlled rather than living in a chat
  log.

### Decisions reached during implementation

- **`tick(state)` takes no commands argument.** An earlier design passed commands
  both as an argument and through `state.pendingCommands`, so a caller doing both
  would have had a command applied twice. The queue is the only source of truth,
  and it is the version that survives a save.
- **Day rollover is checked immediately after the clock advances**, before
  commands, because it depends only on time. Tick 0 emits none: a start is not a
  completion.
- **Derived values are never stored.** Readiness and `resources` do not exist in
  state at all, so nothing can read a stale copy and mistake a summary for a cause.

### Fixed during implementation

- The RNG initially ignored `seed`, so every seed produced an identical stream
  and `seed` was decorative. Caught by a test comparing two seeds; the seed is now
  mixed into the generator state while the cursor still rests at 0.
- npm scripts invoke each tool through `node <path>` rather than the bare command.
  Termux has no `/usr/bin/env`, so the usual `node_modules/.bin` shims fail with
  "bad interpreter". See `scripts/TERMUX.md`.

### Known gaps

- No gameplay: no personnel, jobs, needs, facilities, resources or equipment.
  Stage 1 is a technical foundation only (`ROADMAP.md` §Stage 1).
- No save/load UI. The serialization constraint it depends on is already enforced.
- The interface has not been verified on a phone yet; that is the Stage 1 manual
  gate.
