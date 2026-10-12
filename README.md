# Military Base Simulator

A living military base simulation. Personnel act autonomously, interconnected
systems create persistent consequences, and the player commands **by
exception** — setting policy, inspecting, and intervening only when it matters.

**Status:** planning complete, implementation not started.
**Next step:** Stage 1 — a simulation that ticks. See `docs/ROADMAP.md`.

---

## Quick start

```bash
# (once the project is scaffolded)
pkg install nodejs-lts
npm install
npm run dev     # then open the printed URL in your phone browser
```

Headless simulation, no browser required:

```bash
npm run headless -- --ticks 1440 --seed 12345
```

---

## Project layout

```
military-base-sim-dev/
  docs/            all planning documents — start at PROJECT_SUMMARY.md
  src/
    sim/           the simulation. PURE. no UI, no DOM.
    ui/            React components. no rules.
    controller/    clock, speed, command dispatch
  tools/
    headless.ts    runs N ticks with no UI — the architecture smoke test
```

---

## The one rule

> The simulation contains no UI code. If a React component contains a rule
> about how the world works, that is a bug.

Enforced by `tools/headless.ts`, which must keep working forever.

---

## Documentation

Full map in `docs/PROJECT_SUMMARY.md`. The essentials:

| Document | What it covers |
|---|---|
| `PROJECT_SUMMARY.md` | **Start here** — orientation and status |
| `LOCKED_DECISIONS.md` | The settled design decisions, with corrections from external review |
| `OPEN_QUESTIONS.md` | Genuinely unresolved questions |
| `ROADMAP.md` | Build order and gates |
| `ARCHITECTURE.md` | Technical foundation |
| `LONG_TERM_DESIGN.md` | What the full game eventually becomes |
| `REVIEW_BRIEF.md` | **The one file to send another assistant** — self-contained, includes 10 open questions |

---

## Environment notes

- Development on an Android phone in Termux; the game is played in the phone
  browser.
- **Code lives here in Termux home, not on shared storage.** Shared storage is a
  FUSE mount where `node_modules` is slow and file watching breaks.
- Docs are mirrored to `/storage/emulated/0/Download/military-base-sim/` for
  reading in any editor app.