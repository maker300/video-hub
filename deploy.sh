#!/bin/bash

echo ""
echo "ForexCourse — Save and Deploy"
echo "─────────────────────────────"
echo ""

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
  echo "No changes to deploy."
  echo "Your live site is already up to date."
  exit 0
fi

# Show what changed
echo "Changes to deploy:"
git diff --stat
git diff --staged --stat
echo ""

# Ask for description
echo "Describe what you changed (press Enter for auto-message):"
read msg

if [ -z "$msg" ]; then
  msg="update: $(date '+%Y-%m-%d %H:%M')"
fi

# Stage, commit and push
git add .
git commit -m "$msg"
git push origin main

echo ""
echo "✅ Pushed to GitHub!"
echo "Hostinger is now rebuilding your live site."
echo "Your site will be updated in ~2-3 minutes."
echo ""
