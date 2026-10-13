#!/data/data/com.termux/files/usr/bin/bash
# Build the single-file project bundles.
#
# Purpose: other assistants cap how many files you can attach. Rather than
# hand-picking a subset that goes stale the moment anything changes, generate
# the bundle so it is always exactly the current documents.
#
#   tools/build-master.sh          build both bundles
#
# Outputs (generated - never edit them by hand):
#   docs/PROJECT_MASTER.md   everything. ~176 KB. Upload this.
#   docs/PROJECT_CORE.md     the essentials. ~50 KB. Fallback if MASTER is
#                            rejected for size.
#
# Both carry a version stamp so a stale copy is visible at a glance.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO/docs"

REV=$(git rev-parse --short HEAD 2>/dev/null || echo "uncommitted")
WHEN=$(date '+%Y-%m-%d %H:%M')

# Emit a document with a separator banner and a top-level heading.
emit() {
  local file="$1" title="$2" file="$3"
  echo ""
  echo "<!-- ══════════════════════════════════════════════════════════════ -->"
  echo ""
  echo "# ── ${file}"
  echo ""
  echo "<!-- source: docs/${file} · do not edit here, edit the source -->"
  echo ""
  sed -e '1{/^<!-- SYNCSTAMP -->/d}' -e '1{/^<!-- v/d}' "$file"
}

header() {
  local title="$1" scope="$2"
  cat <<EOF
<!-- SYNCSTAMP -->
<!-- v${REV} | $(date +%s) | built ${WHEN} -->

# Military Base Simulator — ${title}

**${scope}**

> **Generated file. Do not edit.** Rebuild with \`tools/build-master.sh\`.
> Edit the source documents in \`docs/\` and re-run; this bundle is replaced
> wholesale. Source of truth: \`~/military-base-sim-dev/docs/\`.
>
> **Version stamp:** the line above records the commit this bundle was built
> from. If an assistant quotes a decision you don't recognise, check that
> version first — it may be reasoning from an older copy.

## Contents

| # | Document | What it is |
|---|---|---|
EOF
}

# ---------------------------------------------------------------- MASTER ---
{
  header "Complete Design" \
    "Every current design document in one file. Upload this and nothing else."

  cat <<'EOF'
| 1 | `REVIEW_BRIEF.md` | **Start here.** Self-contained checkpoint: history, decisions, architecture, roadmap, risks |
| 2 | `LOCKED_DECISIONS.md` | Every settled decision with rationale and corrections |
| 3 | `ARCHITECTURE.md` | Technical foundation — layering, state, tick order, testing |
| 4 | `SYSTEM_DEPENDENCIES.md` | Field ownership, phases, services, chains, invariants |
| 5 | `GAME_DESIGN_BLUEPRINT.md` | The System Atlas — 24 systems, plus the equipment contract |
| 6 | `ROADMAP.md` | 10 stages, evidence gates, stage contracts |
| 7 | `OPEN_QUESTIONS.md` | Open questions and the stage that answers each |
| 8 | `AUDIT_FINDINGS.md` | Completeness audit — what the later stages still lack |
| 9 | `REVIEW_REPLIES.md` | All three external reviews: accepted, declined, why |

**Not included:** `docs/_archive/` — 11 superseded documents that predate the
reviews. They contain older answers to questions since resolved differently and
will make a consistent design look self-contradictory.

---

EOF

  emit x "checkpoint" REVIEW_BRIEF.md
  emit x "decisions" LOCKED_DECISIONS.md
  emit x "architecture" ARCHITECTURE.md
  emit x "dependencies" SYSTEM_DEPENDENCIES.md
  emit x "blueprint" GAME_DESIGN_BLUEPRINT.md
  emit x "roadmap" ROADMAP.md
  emit x "questions" OPEN_QUESTIONS.md
  emit x "audit" AUDIT_FINDINGS.md
  emit x "reviews" REVIEW_REPLIES.md

  cat <<'EOF'

---

## How to use this bundle

**To review the design:** read section 1. It is self-contained. Sections 2–9 add
depth, not new conclusions.

**To continue development:** sections 1, 2, 3 and 6 are what an implementer needs.

**To challenge the design:** sections 4, 7 and 8 are where the unresolved
contradictions live. Section 8 is an internal audit that found gaps in these
documents — treat its findings as claims to be tested, not accepted.
EOF
} > PROJECT_MASTER.md

# ------------------------------------------------------------------ CORE ---
{
  header "Core Design" \
    "The essentials in one small file. Use when the full bundle is rejected for size."

  cat <<'EOF'
| 1 | `REVIEW_BRIEF.md` | **Start here.** Self-contained checkpoint — decisions, architecture, roadmap and risks summarised |
| 2 | `SYSTEM_DEPENDENCIES.md` | Field ownership, phases, chains, invariants — the architecture's enforcement layer |
| 3 | `AUDIT_FINDINGS.md` | What the later stages still lack, measured |

**Omitted:** the full blueprint, the review history, and the open-questions list.
The blueprint is available separately as `GAME_DESIGN_BLUEPRINT.md` if a
question needs system-level depth.

---

EOF

  emit x "checkpoint" REVIEW_BRIEF.md
  emit x "dependencies" SYSTEM_DEPENDENCIES.md
  emit x "audit" AUDIT_FINDINGS.md

  cat <<'EOF'

---

_Bundle built from commit above. For the complete design, send
`PROJECT_MASTER.md`._
EOF
} > PROJECT_CORE.md

SIZE_M=$(wc -c < PROJECT_MASTER.md | tr -d ' ')
SIZE_C=$(wc -c < PROJECT_CORE.md | tr -d ' ')
echo "built PROJECT_MASTER.md ($SIZE_M bytes)"
echo "built PROJECT_CORE.md   ($SIZE_C bytes)"