# Milsim Final Model Showdown — Round 2

**Repo:** `~/military-base-sim-dev` (`origin` = `MarkKramm/Milsim`, branch `main`, HEAD `88dbe92`)
**Verification:** `npm test` → 95 tests, 95 pass, 0 fail (observed, not assumed).

## 1. Simulation tick trace

Everything below the controller is pure.

1. `src/ui/App.tsx` (`useEffect`) → `controller.start()`.
2. `Controller.start()` (`src/controller/controller.ts`) records `lastFrameMs = now()`, schedules `frame` via injected `schedule` (defaults to `requestAnimationFrame`).
3. `Controller.frame(timeMs)` computes `deltaMs`, calls `this.step(deltaMs)`, emits a snapshot, reschedules.
4. `Controller.step(deltaMs)` calls `advance()` from `src/controller/timeline.ts` → `{ticksToRun, accumulatedMs, backlogTicks}`, then loops `this.state = tick(this.state)`. `eventsThisTick` is derived from `log.length` growth — no second event channel.
5. `tick(state)` — `src/sim/tick.ts`:
   - `draftOf(state)` (`src/sim/state.ts`) copies scalars and shallow-copies the three arrays.
   - **Step 1:** `next.tick = state.tick + 1`.
   - **Step 2:** `isDayRollover(next.tick)` (`src/sim/time.ts`, `TICKS_PER_DAY = 1440`) → `emit(next, {type: DAY_ROLLOVER, data:{day}})`.
   - **emit()`** (`src/sim/events.ts`) freezes and appends the event at `id = draft.nextEventId`, then increments it. Events are `readonly` + `Object.freeze`.
   - **Step 3:** `applyCommands(next)` (`src/sim/commands.ts`) drains `pendingCommands` FIFO, emits `command_rejected` for each, then empties the queue.
   - **Step 4:** intent is a deliberate no-op (`src/sim/intent.ts`).
6. **RNG:** `rand()` (`src/sim/rng.ts`) is **never called at Stage 1** — `rngCursor` stays 0 for any run length. `mulberry32(seed, draws)` is pure and folds the seed in as `seed + draws * INCREMENT`.

`run(state, count)` in `tick.ts` loops `tick()` sequentially for headless runs.

## 2. Strongest technical concern

**A queued command carries no record of the tick on which it was issued.**

Evidence, all verified by reading HEAD:

- `src/sim/commands.ts`: `export type Command = never;` — the command type has **no fields at all**.
- `src/sim/state.ts`: `pendingCommands: Command[]` — a bare queue with no ordering or timing key.
- `src/sim/events.ts` `emit()`: `tick: draft.tick` — the event is stamped with the **drain** tick, not an issue tick.
- `src/controller/controller.ts` `step()`: `ticksToRun` is derived from `advance(...)` on wall-clock `deltaMs`. The controller exposes **no `enqueue` method**, and `grep` shows `enqueue` has zero call sites outside `commands.ts` and its own tests.

Consequence: by the time a command is drained, the only thing the log knows is *which frame boundary it happened to land on*. `docs/ARCHITECTURE.md:103` asserts "A command issued last tick takes effect now, deterministically" — but nothing in the implementation enforces or records that "last tick". The player's action is quantised to frame pacing.

## 3. Classification and confidence

**Plausible but unverified risk — high confidence (structural), medium confidence (impact).**

- It is **not a verified defect**: `Command = never`, so today the only observable effect is a `command_rejected` event whose `tick` equals `currentTick + 1`. Within a synchronous test harness that is deterministic, and the existing tests pass.
- It is **not "not a problem"**: the gap is real and structural. The moment Stage 2 adds a real command, that command can only be applied "whenever the next tick happened to run". Replay from a recorded command log would require replaying the wall clock, which the architecture explicitly forbids (`ARCHITECTURE.md:133`).

## 4. Proposed regression test

**"Command timing is pacing-independent"** (`src/controller/controller.test.ts`).

- **Setup:** two `Controller`s, `speed: '1x'`, `seed: DEFAULT_SEED`, both stepped to tick 8 — one via a single `step(1000)`, one via eight `step(125)` calls.
- **Action:** enqueue the same fake command into both at tick 8 (requires adding the missing enqueue seam to the controller). Step both by `step(1000)`.
- **Expected:** both controllers reach tick 16 with byte-identical state — including the `tick` field of the `command_rejected` event.
- **Invariant protected:** a command's effect is bound to simulation time, not to the host's frame pacing.
- **Why it catches the issue:** the current design carries no issue tick, so the test can only ever assert whatever the drain tick happened to be; it forces the missing `issuedTick` field into the open the moment the command type grows one field.

## 5. Best next action

Do **not** build Stage 2 yet. Record in the Stage 2 plan (not in code): every command variant must carry `issuedTick: number`, and `applyCommands` must copy it into the event's `data`. That is a one-line design decision now and a painful save-file migration later.

## 6. Deliberately not investigated

Stage 2+ system design — autonomous jobs, needs, decisions — and the 11 systems with no cross-system chain recorded in `docs/AUDIT_FINDINGS.md` §3. Out of scope for a determinism pass.