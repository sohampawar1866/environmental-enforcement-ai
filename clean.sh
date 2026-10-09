#!/usr/bin/env bash
set -euo pipefail

# Locate repository root regardless of where the script is called from
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🧹 [CivicClean] Starting fresh cleanup..."

# 1. Clean Incidents Database (incidents & video_jobs)
if [ -f "data/incidents.db" ]; then
  sqlite3 data/incidents.db "DELETE FROM incidents; DELETE FROM video_jobs; VACUUM;"
  echo "  ✓ Wiped incidents & video_jobs in data/incidents.db"
fi

# 2. Clean Evidence directory
mkdir -p evidence
rm -rf evidence/*
echo "  ✓ Cleared evidence/ directory"

# 3. Clean Uploads directory
mkdir -p data/uploads
rm -rf data/uploads/*
echo "  ✓ Cleared data/uploads/ directory"

# 4. Clean Outputs directory
mkdir -p outputs
rm -rf outputs/*
echo "  ✓ Cleared outputs/ directory"

# 5. Verify Auth Database is preserved
if [ -f "data/auth.db" ]; then
  USER_COUNT=$(sqlite3 data/auth.db "SELECT count(*) FROM user;" 2>/dev/null || echo "0")
  echo "  ✓ Auth credentials PRESERVED in data/auth.db ($USER_COUNT official accounts active)"
else
  echo "  ℹ Note: data/auth.db will be initialized upon application startup."
fi

# 6. Verify Sample Demo Video is intact
if [ -f "data/sample_videos/pedestrian_littering_cam04.mp4" ]; then
  echo "  ✓ Demo sample video ready at data/sample_videos/pedestrian_littering_cam04.mp4"
fi

echo ""
echo "✨ System reset complete! You are ready for a fresh demo run."
