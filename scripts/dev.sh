#!/usr/bin/env bash
# scripts/dev.sh ? Start development server
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting dev server..."
echo "  Local: http://localhost:3000"
echo ""

npm run dev -- -H 0.0.0.0 -p 3000