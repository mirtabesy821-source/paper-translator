#!/usr/bin/env bash
# scripts/build.sh ? Production build + start
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Building for production..."
npm run build

echo ""
echo "Starting production server..."
echo "  Local: http://localhost:3000"
echo ""

npx next start -H 0.0.0.0 -p 3000