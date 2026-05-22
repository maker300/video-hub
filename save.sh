#!/usr/bin/env bash
# save.sh — stage everything, auto-generate a commit message, and push to GitHub.
set -e

cd "$(dirname "$0")"

# ── Check there is something to commit ────────────────────────────────────────
git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit — working tree is clean."
  exit 0
fi

# ── Build a commit message from the staged diff ───────────────────────────────
STAT=$(git diff --cached --stat | tail -1)          # e.g. "3 files changed, 42 insertions(+)"
FILES=$(git diff --cached --name-only)              # list of changed file paths
COUNT=$(echo "$FILES" | wc -l | tr -d ' ')

# Categorise the change by looking at which files were touched
has() { echo "$FILES" | grep -q "$1"; }

if   has "lib/courseData";     then SCOPE="course content"
elif has "components/";        then SCOPE="UI components"
elif has "app/api/";           then SCOPE="API routes"
elif has "app/";               then SCOPE="app pages"
elif has "remotion/";          then SCOPE="Remotion video"
elif has "lib/";               then SCOPE="library code"
elif has "scripts/";           then SCOPE="scripts"
elif has "public/";            then SCOPE="static assets"
else                                SCOPE="project files"
fi

# Pick a verb based on whether files are new, modified, or deleted
ADDED=$(git diff --cached --diff-filter=A --name-only | wc -l | tr -d ' ')
DELETED=$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')

if   [ "$ADDED"   -gt 0 ] && [ "$DELETED" -eq 0 ]; then VERB="add"
elif [ "$DELETED" -gt 0 ] && [ "$ADDED"   -eq 0 ]; then VERB="remove"
elif [ "$ADDED"   -gt 0 ] && [ "$DELETED" -gt 0 ]; then VERB="update"
else                                                     VERB="update"
fi

# If only one file changed, name it directly
if [ "$COUNT" -eq 1 ]; then
  FNAME=$(basename "$FILES")
  MSG="${VERB} ${FNAME}"
else
  MSG="${VERB} ${SCOPE} (${COUNT} files — ${STAT})"
fi

# ── Commit ────────────────────────────────────────────────────────────────────
echo ""
echo "  Committing: $MSG"
echo ""
git commit -m "$MSG"

# ── Push ──────────────────────────────────────────────────────────────────────
REMOTE=$(git remote 2>/dev/null | head -1)
if [ -z "$REMOTE" ]; then
  echo ""
  echo "  No remote configured yet."
  echo "  Add one with:"
  echo "    git remote add origin https://github.com/maker300/forex-course.git"
  echo "  Then re-run ./save.sh"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Pushing to $REMOTE/$BRANCH …"
git push "$REMOTE" "$BRANCH"
echo ""
echo "  Done. Changes are live on GitHub."
