# Military Base Simulator

A living military base simulation. Personnel act autonomously, interconnected
systems create persistent consequences, and the player commands **by
exception** — setting policy, inspecting, and intervening only when it matters.

**Status:** Stage 1 implemented — a simulation that ticks. Stage 2 (people and
jobs) is next. See `docs/ROADMAP.md`.

---

## Quick start

```bash
npm install
npm run dev     # then open the printed URL in your phone browser
```

Everything at once (typecheck, tests, build, headless run):

```bash
npm run verify
```

Headless simulation, no browser required:

```bash
npm run headless -- --ticks 1440 --seed 12345 [--json]
```

---

## Project layout

```
military-base-sim-dev/
  docs/            current design — start at REVIEW_BRIEF.md
  docs/_reference/ current, but not for external review
  docs/_archive/   superseded, kept for audit — do not send to other assistants
  tools/sync-docs.sh   copy docs to the phone mirror + refresh the media index
  src/
    sim/           the simulation. PURE. no UI, no DOM.
    ui/            React components. no rules.
    controller/    clock, speed, command dispatch
  tools/
    headless.ts    runs N ticks with no UI — the architecture smoke test
  scripts/TERMUX.md  why npm scripts call node explicitly

CHANGELOG.md          what changed, and when
```

---

## The one rule

> The simulation contains no UI code. If a React component contains a rule
> about how the world works, that is a bug.

Enforced by `tools/headless.ts`, which must keep working forever.

---

## Documentation

Full map in `AGENTS.md`. The essentials:

| Document | What it covers |
|---|---|
| `REVIEW_BRIEF.md` | **Start here, and the one file to send another assistant** — self-contained |
| `GAME_DESIGN_BLUEPRINT.md` | The system atlas — 24 systems, all 11 sections each |
| `LOCKED_DECISIONS.md` | The settled design decisions, with corrections from external review |
| `SYSTEM_DEPENDENCIES.md` | Ownership, tick order, cross-system chains, invariants |
| `OPEN_QUESTIONS.md` | Every open question, its status, and the stage that answers it |
| `ROADMAP.md` | Build order and gates |
| `ARCHITECTURE.md` | Technical foundation |
| `REVIEW_REPLIES.md` | All four external reviews: what was accepted, declined, and why |

`_reference/` holds current but non-essential context. `_archive/` holds the
superseded originals — **do not send those to another assistant**, since their
older answers make a current design look self-contradictory.

---

## Environment notes

- Development on an Android phone in Termux; the game is played in the phone
  browser.
- **Code lives here in Termux home, not on shared storage.** Shared storage is a
  FUSE mount where `node_modules` is slow and file watching breaks.
- Docs are mirrored to `/storage/emulated/0/Download/military-base-sim/` for
  reading in any editor app.