#!/usr/bin/env bash
# Sync documentation to the shared-storage mirror, then refresh Android's media
# index so file pickers (ChatGPT, Acode) show current timestamps.
#
# Usage:
#   tools/sync-docs.sh          sync + rescan
#   tools/sync-docs.sh --no-scan   sync only
#
# The mirror is a COPY. Never edit files there; edit in docs/ and re-run.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIRROR="/storage/emulated/0/Download/military-base-sim"

[ -d "$MIRROR" ] || { echo "mirror missing: $MIRROR"; exit 1; }

cd "$REPO"

# --- clear the mirror so deleted or renamed docs cannot linger -------------
find "$MIRROR" -name '*.md' -delete 2>/dev/null || true
rm -rf "$MIRROR/_archive" "$MIRROR/_reference" 2>/dev/null || true

# --- copy, preserving the three-tier layout --------------------------------
cp docs/*.md "$MIRROR/"
cp AGENTS.md README.md "$MIRROR/"
[ -d docs/_reference ] && cp -r docs/_reference "$MIRROR/"
[ -d docs/_archive ] && cp -r docs/_archive "$MIRROR/"

# --- generate the mirror index so the folder explains itself -------------
ACTIVE=$(cd docs && ls -1 *.md)
{
  echo "# Military Base Simulator — docs"
  echo
  echo "Mirror of the project's documentation. Generated — do not edit."
  echo "Source of truth: \`~/military-base-sim-dev/docs/\`"
  echo
  echo "## Current — these are the design"
  echo
  echo "| File | What it is |"
  echo "|---|---|"
  echo "| \`REVIEW_BRIEF.md\` | **Start here.** The whole project, self-contained |"
  echo "| \`GAME_DESIGN_BLUEPRINT.md\` | System Atlas — 24 systems, 11 sections each |"
  echo "| \`LOCKED_DECISIONS.md\` | The 12 decisions, with rationale |"
  echo "| \`SYSTEM_DEPENDENCIES.md\` | Data ownership, tick order, 15 invariants |"
  echo "| \`OPEN_QUESTIONS.md\` | 19 questions and the stage that answers each |"
  echo "| \`ROADMAP.md\` | 10 stages, evidence gates, conditional markers |"
  echo "| \`REVIEW_REPLIES.md\` | Both external reviews: accepted, declined, why |"
  echo "| \`ARCHITECTURE.md\` | Technical foundation — layering, tick order, testing |"
  echo
  echo "## To send another assistant"
  echo
  echo "Upload \`REVIEW_BRIEF.md\` first; it is self-contained. Add"
  echo "\`GAME_DESIGN_BLUEPRINT.md\` when depth is wanted. The rest on request."
  echo
  echo "## \_reference — current, not for external review"
  echo
  echo "\`PROJECT_SUMMARY.md\`, \`WORKING_AGREEMENT.md\` — plus \`README.md\` and"
  echo "\`AGENTS.md\` in this folder's root (the latter is instructions for coding"
  echo "agents)."
  echo
  echo "## \_archive — superseded, kept for audit"
  echo
  echo "Predate both external reviews. **Do not send to another assistant:**"
  echo "they contain older answers to questions since resolved differently, and"
  echo "will make a current design look self-contradictory."
  echo
  echo "| File | Superseded by |"
  echo "|---|---|"
  echo "| \`LONG_TERM_DESIGN.md\` | \`GAME_DESIGN_BLUEPRINT.md\` |"
  echo "| \`AUDIT_AND_RECOMMENDATIONS.md\` | corrections applied in \`LOCKED_DECISIONS.md\` |"
  echo "| \`DECISIONS_TO_APPROVE.md\` / \`DECISIONS_ANSWERED.md\` | \`LOCKED_DECISIONS.md\` |"
  echo "| \`GAME_VISION.md\`, \`CORE_LOOP.md\`, \`PROTOTYPE_SPEC.md\` | \`REVIEW_BRIEF.md\` |"
  echo "| \`FOUNDATION_DECISIONS.md\`, \`IMPLEMENTATION_STAGES.md\` | \`LOCKED_DECISIONS.md\`, \`ROADMAP.md\` |"
  echo "| \`MASTER_PROMPT.md\` | — |"
  echo "| \`ORIGINAL_PLANNING_PACK.md\` | everything above |"
  echo
  echo "---"
  echo
  echo "_Last synced: $(date '+%Y-%m-%d %H:%M %Z'). Files are current if the"
  echo "content matches the repository; Android may display a stale timestamp._"
} > "$MIRROR/INDEX.md"

chmod 644 "$MIRROR"/*.md "$MIRROR"/_reference/*.md "$MIRROR"/_archive/*.md 2>/dev/null || true

count=$(find "$MIRROR" -name '*.md' | wc -l | tr -d ' ')
echo "synced $count files to $MIRROR"

# --- refresh the media index ------------------------------------------------
# Shared storage is a FUSE mount, so overwriting a file does not reliably
# invalidate Android's cached listing. This is a read-only broadcast: it can
# only update the index, never modify a file.
if [ "${1:-}" != "--no-scan" ]; then
  cd "$MIRROR"
  n=0
  while IFS= read -r f; do
    am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
      -d "file://$MIRROR/$f" >/dev/null 2>&1 && n=$((n + 1))
  done < <(find . -name '*.md' -printf '%P\n')
  echo "rescanned $n files"
  echo "hint: fully close the app using the picker before reopening it,"
  echo "      or it may re-read its own stale cache."
fi