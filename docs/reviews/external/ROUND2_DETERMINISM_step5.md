# Milsim — Round 2: Determinism & State-Transition Boundaries

**Repo found and verified:** `/data/data/com.termux/files/home/military-base-sim-dev` — remote `MarkKramm/Milsim`, branch `main`, clean at `88dbe92`. Nothing in the repo was modified.

**Verified at HEAD:** `npm test` → 95 pass / 0 fail. `npm run headless -- --ticks 5000 --seed 42` run twice → byte-identical output.

## 1. Simulation tick trace

```
Controller.step(deltaMs)               src/controller/controller.ts:146
  advance() wall-clock ms → tick count src/controller/timeline.ts:61
  loop: this.state = tick(...)         controller.ts:154-156
      tick(state) → SimState           src/sim/tick.ts:29
        draftOf(state)                  src/sim/state.ts:80  ← copies arrays, SHARES events
        1  next.tick = state.tick + 1   tick.ts:33
        2  isDayRollover → emit         tick.ts:42 → events.ts:67
        3  applyCommands → emit         tick.ts:51 → commands.ts:47
        4  intent — deliberate no-op    tick.ts:54 (Stage 2 work)
```

- Randomness: `rand()` → `mulberry32(seed, draws)` (`src/sim/rng.ts:49`) — pure 32-bit integer math plus one division by 2^32, so engine-portable and replay-stable. No `Math.random()` or clock read under `src/sim` (static guard: `architecture.test.ts:65-88`).
- Ownership holds: only `emit()` writes `log`/`nextEventId`; only `rng.ts` moves `rngCursor`; commands live only in `state.pendingCommands`. No module-level mutable state, no Map/Set/object-key iteration.
- Probes (run outside the repo) confirmed: split-run == whole-run; resumed-from-JSON == uninterrupted run; 5000 draws reproducible.

## 2. Strongest concern — the serialization boundary strips event immutability

`emit()` freezes every event at creation (`events.ts:68-76`) for one stated reason: so `draftOf` can *share* event objects between input and output instead of deep-cloning a growing log (`state.ts:70-89`). That protection exists only in memory.

**Probed:** after `JSON.parse(JSON.stringify(state))`, `restored.log[0].data.day = 999` **succeeds silently**. Same for the event object itself and the `subjects`/`causeEventIds` arrays. Every runtime immutability guarantee in the log is gone.

Why it matters once load exists (D12 already promises it):

- `draftOf(restored)` shares those now-mutable events.
- The exact write that commit `e86113e` fixed — writing through `draft.log[i].data` and silently rewriting the **caller's** history — becomes reachable again for any restored state.
- "Same seed + same commands = same log" becomes a property of the in-memory path only. A run resumed from disk can diverge from the same run never saved.

The current suite cannot catch it: the round-trip test (`tick.test.ts:143`) asserts only `statesEqual`, which compares JSON text and is equal before any mutation.

## 3. Defect classification

**Verified defect — latent, no live divergence today.** Confidence: high (directly reproducible, shown above). Nothing writes through an event yet and `readonly` blocks the ordinary path, so current impact is zero. It is not "not a problem": the invariant both the code and `events.ts` call load-bearing is false across a boundary Stage 3 depends on.

## 4. Proposed regression test

New file `src/sim/events.test.ts`. **Setup:** `const s = run(createRun(DEFAULT_SEED), 1440)`, then `const restored = JSON.parse(JSON.stringify(s))`. **Action:** `assert.throws(() => { restored.log[0]!.data.day = 999 }, TypeError)` (cast needed — the field is `readonly`), then tick and compare. **Expected:** both writes throw and `statesEqual(tick(restored), tick(s))`. **Invariant protected:** an event is immutable once appended, whether the state came from memory or disk — history cannot be rewritten and replays are exact. **Why it catches it:** the identical assertion at `tick.test.ts:132` passes on an in-memory event and fails on a restored one; that asymmetry *is* the bug. Companion worth adding: continue a restored multi-day state and compare to the uninterrupted run (my probes A/B — not committed today).

## 5. Best next action

Keep the documented order: the Stage 1 phone gate is still unrun and `AGENTS.md` makes it the gate before Stage 2. While the phone is in hand, add that test plus a `rehydrate` function that re-freezes `log` on load — `emit()` cannot fix an old log, so load time is the only correct place.

## 6. Deliberately not investigated

Browser/UI behaviour (no browser in Termux; the phone UI is still unverified at HEAD). Also excluded: Stage 2+ blueprint correctness, and `npm run build` — I ran tests and the headless runner only.

---

## Plain-language explanation

Think of the event log as a diary. Every entry is wrapped in glass so nobody can scribble on it. That matters because each tick makes a *copy* of the state to work on, and to stay fast that copy shares the diary pages instead of photocopying all of them — sharing is only safe if the pages are uneditable.

The bug: saving and loading the game makes photocopies, and a photocopy is not in glass. So a run loaded from a file has an editable diary. If anything ever writes to it, what looked like recorded history quietly changes under you, and two players with the same seed end up with different histories. Nothing writes through an event yet, so it is latent rather than broken — but the guarantee is gone exactly where the promised save/load feature needs it. A test and a one-line fix now beat a mystery bug in Stage 4.
