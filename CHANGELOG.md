# Changelog

Notable changes to the project. Design history lives in `docs/` — this file
records what actually changed in the repository.

Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow
[semantic versioning](https://semver.org/). The project is pre-1.0, so `0.x.y`.

## [Unreleased]

Nothing yet.

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
