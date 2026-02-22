#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENGINE_DIR="${ROOT_DIR}/ekg_engine"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [ ! -d "${ENGINE_DIR}" ]; then
  echo "❌ Embedded EKG engine directory not found: ${ENGINE_DIR}"
  exit 1
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "❌ Python executable not found: ${PYTHON_BIN}"
  exit 1
fi

echo "🔧 Setting up embedded EKG engine Python environment..."
"${PYTHON_BIN}" -m venv "${ENGINE_DIR}/.venv"
"${ENGINE_DIR}/.venv/bin/python" -m pip install --upgrade pip
"${ENGINE_DIR}/.venv/bin/python" -m pip install -e "${ENGINE_DIR}"

echo "✅ Embedded EKG engine setup completed."
echo "   Python: ${ENGINE_DIR}/.venv/bin/python"
