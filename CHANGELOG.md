# Changelog

Notable changes to the project. Design history lives in `docs/` — this file
records what actually changed in the repository.

Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow
[semantic versioning](https://semver.org/). The project is pre-1.0, so `0.x.y`.

## [Unreleased]

## [0.3.0] — Stage 3: needs, rest, food, and consequence

The base now has a day. People get hungry, get tired, stop working and sleep,
and eat when there is anything to eat. There is a larder, it can empty, and the
effect of that is traceable back to why.

Exit gate: **not yet passed.** The automated half is green; the manual
observation — that this is more interesting than nonstop work — needs a human.

### Added

**Simulation (`src/sim/`, still pure)**

- `needs.ts` — hunger and fatigue in [0,1], rest, eating, and the refusal
  ceiling. Two needs, because a third behaving like the first two would be a
  meter without a consequence.
- `storage.ts` — **bulk** food and maintenance supplies, and the only writer of
  them. Not Stage 7: that is individual items, condition and loadouts, and D21
  is untouched.
- `resources.ts` — the consumption and production *rules*. No state, by design.
- `delivery.ts` — supplies on a 1,200-tick schedule, phase 2.
- `readiness.ts` — derived summary, computed in the controller and stored
  nowhere, so no system can read it (invariant 12).
- `tick.ts` gained phases 2 (delivery), 3 (resources), 4 (needs) and 9 (derived),
  plus selection rule 2 — recovery, which outranks duty.

**Interface** — need bars per person, a resting state, an exhausted marker, base
readiness with its causes, the larder with its target, and a target control.

**Headless** — `npm run headless -- --ticks 7200 --priority <setting>` prints the
roster with hunger and fatigue, the stock, and readiness.

### Two document conflicts, resolved

1. **`SYSTEM_DEPENDENCIES.md` put `storage[]` at Stage 7 while `resources` — a
   derived aggregate over storage — sat at Stage 3.** Resources would have derived
   from a system that did not exist, and `ROADMAP.md` §Stage 3 requires food
   consumption and resource contention. A **minimal bulk Storage** was brought
   forward. **This does not move Stage 7** — bulk food counts and individual
   weapons are different systems. D21 remains guaranteed.
2. **`persons[].schedule` was listed at Stage 2; the blueprint puts schedules at
   Stage 3.** Stage 2 correctly shipped none. The calendar is now explicitly
   **deferred to Stage 5**; needs-driven rest delivers the rest part at Stage 3,
   and a rhythm emerges from the workforce's condition rather than a rota.

### A contradiction in the plan, resolved narrowly

The plan's Step 5 said a maintenance job "still completes the work" without
supplies, while the roadmap requires scarcity to *change outcomes*. Completing at
normal speed makes supplies decorative; blocking the job makes the base dead
until the next delivery and turns a shortage into a cliff.

**A shortage is therefore a cost, not a gate:** an unsupplied repair takes twice
as long, still finishes, and records a `supplies_short` event saying why. Work is
never permanently blocked and supplies are never pointless.

### Stage 2 reference figures — superseded

Stage 3 replaces fixed meal arrivals with need-driven production and adds a
fatigue ceiling, so **Stage 2's figures no longer hold.** They were not preserved
by weakening anything; the Stage 2 gate was rewritten as `stage3-gate.test.ts`
and re-measured from the implementation.

| Setting | Stage 2 (superseded) | Stage 3 |
|---|---|---|
| Balanced | 267 / 866, backlog 30 / 30 | 194 / 478, backlog 164 / 60, **food 0** |
| Maintenance-first | 297 / 777, backlog 0 / 119 | 192 / 487, backlog 168 / 60, **food 0** |
| Meals-first | 257 / 896, backlog 40 / 0 | 170 / 585, backlog 190 / 3, **food 57** |

The *shape* of the gate is unchanged — absolute floors, directional ordering,
non-dominance, a causal reason histogram — because that shape is what caught the
Stage 2 problems. Non-dominance still holds, in a different currency: **neither
setting is better.** Maintenance-first starves people (food 0, six of seven
hungry); meals-first keeps everyone fed and lets the workshop rot (backlog 190).

Recovery was verified: running maintenance-first for three days drains the larder
to 10, and switching to meals-first recovers it to 57 by day 5. A player can undo
a bad call — `OPEN_QUESTIONS.md` Q18.

### The immutable-state rule

The Stage 2 audit's follow-up proved `history` and its `TaskRecord` entries were
shared and mutable — a push through a draft lengthened the original's history,
and an entry write changed its `tick`. `ActiveTask` had been frozen in Stage 2;
the same rule now covers history, needs and storage, and is written into
`draftOf` rather than left as a convention:

> Everything reachable inside `SimState` is either frozen at creation or rebuilt
> immutably on every write. No object or array placed in state is ever mutated in
> place.

Three separate defects have now come from breaking it, which is why it is stated.

### Architecture guards

- Only `personnel.ts` may construct a person field; only `storage.ts` may declare
  storage holdings.
- No runtime import cycle among `src/sim` modules.

Both were requested by the audit. The ownership guard is deliberately narrow: an
earlier attempt matched `conditionOf(needs: Needs)`, a *parameter*, and another
matched an event payload's `supplies:` key. Three false positives is enough to
know grep cannot do this job, so the guard checks only what is genuinely
checkable and the state-isolation tests prove the property that matters.

### Two runaway loops found by measuring, not by reading

Both would have been invisible in review and would have looked like "slow tests".

- **Meal orders queued one per tick** produced a **4,106-deep queue** and 4,593
  events over five days. The order book is now *the shortfall*, so it cannot
  outgrow the gap it exists to close.
- **An empty larder emitted `no_food_available` every tick** for every hungry
  person — hundreds of thousands of log entries, which was what wedged the test
  runner. It is now reported once per hunger cycle. A five-day log is 2,707 events.

### Verified by hand — the developer played it on an Android phone

The developer opened the running app on their phone and observed:

- The mobile interface was **readable**, and the per-person hunger and fatigue
  bars were visible.
- Personnel **rested at similar times at first**, then developed **staggered rest
  patterns over several days** — the emergence the stage was meant to produce,
  arriving on its own rather than being scheduled.
- In **Balanced**, food **began dropping around day 10**, and the developer
  **switched to Meals first** to recover it.

These are encouraging signs that the simulation is becoming engaging. They are
recorded as **manual observation of the Stage 3 experience**, not as proof that
every formal acceptance criterion was met.

### Still to verify by hand

- **The Stage 1 phone gate** — never performed.
- **The Stage 2 Day 4–5 gate** — never performed. Neither is discharged by the
  Stage 3 observation above; both are separate checks with their own questions.
- **Stage 3's formal gate** — the observation above is real evidence, but the
  formal question is whether the answer to *"would you keep watching?"* is a
  yes, and that has not been put to a cold player.
- The roster and need bars have now been seen on one phone at one width. Other
  widths, and the Day 4–5 report, remain unexamined.

### Fixed after the final acceptance audit

**The readiness card could contradict the roster beside it.** `readinessCauses()`
hard-coded `0.5` for both needs and never consulted `restUntilTick`, so it could
report *"everyone fed and rested"* in two situations where that was not true:

- while someone was **asleep** — someone resting is by definition not yet
  rested. Measured against the old predicate over three settings and 4,320 ticks,
  this happened in **3,718 frames**. One screenshot showed one instance of a
  constant problem.
- while someone was **eating** — the literal 0.5 ignored the band between
  `HUNGER_EAT_THRESHOLD` (0.4) and 0.5, so a person actively eating a meal was
  not counted as hungry. Observed in 7 frames.

The thresholds now come from the model's own constants, resting is reported as its
own state, and the fallback is the neutral **"No immediate concerns"**. **The
readiness calculation is untouched** — `conditionOf` and `baseReadiness` are
unchanged, and a test pins both. Four regression tests added, all verified to
fail against the previous predicate before being fixed.

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
