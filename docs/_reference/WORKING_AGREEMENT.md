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
| `~/military-base-sim-dev/docs/` | **Source of truth.** Current documentation. Edit here. |
| `~/military-base-sim-dev/` | Code. Fast, git-friendly, file watching works. |
| `docs/_reference/` | Current, but not needed for external review |
| `docs/_archive/` | Superseded originals. Kept for audit. **Never send to another assistant** |
| `/storage/emulated/0/Download/military-base-sim/` | **Read-only mirror** for phone reading. Never edit directly. |
| Git | Local history. One machine, so it is a backup, not a collaboration tool. |

The mirror is a copy. If you edit there, your change is lost the next time
`sync` runs.

---

## Syncing docs to the phone

After editing anything in `docs/`:

```bash
tools/sync-docs.sh
```

That copies the three-tier layout to the mirror, writes `INDEX.md` so the
folder explains itself, and refreshes Android's media index. Add
`--no-scan` to skip the index refresh.

**Why the index refresh is needed.** Shared storage is a FUSE mount, so
overwriting a file does not reliably invalidate Android's cached listing.
The bytes are correct immediately; only the timestamp and thumbnail that a file
picker displays go stale. The rescan is a read-only broadcast and cannot modify
a file. If an app still shows old versions, close it fully first — otherwise it
re-reads its own cache — or copy-paste from a text editor, which reads the real
file.

Then commit. Ask and it will be done for you.

---

## Sharing with another assistant

Pick by what you need:

| File | Send when |
|---|---|
| `AGENTS.md` | Continuing work with a coding assistant. |
| `docs/REVIEW_BRIEF.md` | **Asking another model for opinions or ideas.** Fully self-contained — project context, all decisions, architecture, roadmap, risks, both reviews, and 19 open questions in one file. Send this and nothing else. |
| `docs/REVIEW_BRIEF.md` §3, §5, §9 | Only, if context is tight. Decisions, roadmap, and questions. |
| `docs/_reference/PROJECT_SUMMARY.md` | A quick orientation rather than a full briefing. |
| `docs/GAME_DESIGN_BLUEPRINT.md` | When depth is wanted on specific systems. |

Send the **file**, not a summary of it. A model reasoning from the actual
document will give better answers than one reasoning from a description of it.

**When asking another assistant for ideas:** the brief already records what was
proposed, accepted, declined, and why. Add `docs/REVIEW_REPLIES.md` if they need
the reasoning behind those choices — it names the traps that were already
identified, which is the context that stops them proposing things already
considered and rejected.

**Never send `docs/_archive/`.** Those files predate both external reviews and
contain older answers to questions since resolved differently. Given a current
document and a superseded one, a model will merge them and report that a
consistent design is self-contradictory.

---

## When to update what

| Change | Update |
|---|---|
| A design decision is made or reversed | `LOCKED_DECISIONS.md`, then `AGENTS.md` |
| Another assistant reviews `REVIEW_BRIEF.md` | `REVIEW_REPLIES.md`, then act on it and update the affected documents |
| The build moves to a new stage | `ROADMAP.md`, `PROJECT_SUMMARY.md`, `AGENTS.md` checkpoint |
| A new system is designed | `LONG_TERM_DESIGN.md` |
| An architectural rule changes | `ARCHITECTURE.md`, then `AGENTS.md` |
| You want outside input | `REVIEW_BRIEF.md` |
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