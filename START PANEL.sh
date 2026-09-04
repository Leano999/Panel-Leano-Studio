#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "[1/2] Mengecek dependency..."
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js belum terpasang."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm belum terpasang."
  exit 1
fi
if [ ! -f "node_modules/express/package.json" ] || [ ! -f "node_modules/node-edge-tts/package.json" ]; then
  npm install --no-fund --no-audit
fi
echo "[2/2] Menjalankan Panel Leano Studio..."
node server.js
