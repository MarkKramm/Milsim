# Working Agreement

How this project is maintained. Read this before changing anything.

---

## The rule

> **If it is not in a file, it does not exist.**

Our conversations are ephemeral. ChatGPT has no memory of this project between
sessions. Any other assistant picking this up sees only what is written down.
So:

1. Anything worth remembering goes into `docs/` first.
2. Then it gets synced to shared storage.
3. Then it gets shared with whoever needs it.

If a decision was made in conversation but not written down, it was not made.

---

## Where things live

| Location | Role |
|---|---|
| `~/military-base-sim-dev/docs/` | **Source of truth.** All documentation. Edit here. |
| `~/military-base-sim-dev/` | Code. Fast, git-friendly, file watching works. |
| `/storage/emulated/0/Download/military-base-sim/` | **Read-only mirror** for phone reading. Never edit directly. |
| Git | Local history. One machine, so it is a backup, not a collaboration tool. |

The mirror is a copy. If you edit there, your change is lost the next time
`sync` runs.

---

## Syncing docs to the phone

After editing anything in `docs/`:

```bash
cp -f docs/*.md /storage/emulated/0/Download/military-base-sim/
chmod 644 /storage/emulated/0/Download/military-base-sim/*.md
```

Then commit. Ask and it will be done for you.

---

## Sharing with another assistant

Pick by what you need:

| File | Send when |
|---|---|
| `AGENTS.md` | Continuing work with a coding assistant. |
| `docs/STATUS_HANDOFF.md` | Asking another model for opinions or new ideas. Self-contained. |
| `docs/QUESTIONS_FOR_REVIEW.md` | **Asking another model to actually think about the design.** Send with the handoff. |
| `docs/STATUS_HANDOFF.md` §3–§5 | Only, if context is tight. The highest-value sections. |
| `docs/PROJECT_SUMMARY.md` | A quick orientation rather than a full briefing. |

Send the **file**, not a summary of it. A model reasoning from the actual
document will give better answers than one reasoning from a description of it.

**When asking another assistant for ideas:** also send `docs/LONG_TERM_DESIGN.md`
and `docs/AUDIT_AND_RECOMMENDATIONS.md`, so they know what is already planned
and what has already been criticised. Without that context they will happily
propose things that were already considered and rejected.

---

## When to update what

| Change | Update |
|---|---|
| A design decision is made or reversed | `LOCKED_DECISIONS.md`, then `AGENTS.md` |
| Another assistant answers `QUESTIONS_FOR_REVIEW.md` | `OPEN_QUESTIONS_FOR_REVIEW.md`, then act on it |
| The build moves to a new stage | `ROADMAP.md`, `PROJECT_SUMMARY.md`, `AGENTS.md` checkpoint |
| A new system is designed | `LONG_TERM_DESIGN.md` |
| An architectural rule changes | `ARCHITECTURE.md`, then `AGENTS.md` |
| You want outside input | `STATUS_HANDOFF.md` |
| Code structure changes | `README.md` layout section |

**Update `AGENTS.md` in the same session.** It is the checkpoint file. A stale
checkpoint is worse than no checkpoint, because it is trusted.

---

## Commit conventions

Plain, descriptive messages. Reference the stage when relevant:

```
Stage 1: add tick loop and seeded RNG

Stage 2: autonomous job selection with visible reasons

Revise production layer design after factory-souls-it trap review
```

Commit when a stage's build is coherent, not after every file.

---

## Things not to do

- **Do not edit the Download mirror.** Edit `docs/`, then sync.
- **Do not put code or the mirror in git.** `.gitignore` handles `node_modules`
  and saves; the mirror lives outside the repo entirely.
- **Do not put the repo on shared storage.** Git and `node_modules` are painfully
  slow on the FUSE mount and file watching breaks there.
- **Do not silently expand scope.** Propose it in writing with the cost stated,
  then decide.
- **Do not advance past a gate.** The gates in `ROADMAP.md` are the whole reason
  this project does not drift.