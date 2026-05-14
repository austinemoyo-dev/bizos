#!/usr/bin/env bash
# BizOS — deploy / redeploy (Docker edition)
# ─────────────────────────────────────────────────────────────────────────────
# Usage (from the repo root):
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh           # first deploy or full rebuild
#   ./deploy/deploy.sh backend   # rebuild + restart backend only
#   ./deploy/deploy.sh frontend  # rebuild + restart frontend only
#
# Requires: .env at repo root (copy from .env.docker.example)
#           bizos-backend/.env  (copy from .env.production.example)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TARGET="${1:-all}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_DIR"

# Preflight checks
if [ ! -f ".env" ]; then
    echo "ERROR: .env not found at repo root."
    echo "  Copy .env.docker.example → .env and fill in all values."
    exit 1
fi

if [ ! -f "bizos-backend/.env" ]; then
    echo "ERROR: bizos-backend/.env not found."
    echo "  Copy bizos-backend/.env.production.example → bizos-backend/.env"
    exit 1
fi

echo "============================================="
echo "  BizOS Deploy — target: $TARGET"
echo "============================================="

case "$TARGET" in
    backend)
        docker compose build backend
        docker compose up -d --no-deps backend
        ;;
    frontend)
        docker compose build frontend
        docker compose up -d --no-deps frontend
        ;;
    all)
        docker compose build
        docker compose up -d
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

# Give containers a moment to start
sleep 5

echo ""
echo "--- Container status ---"
docker compose ps

echo ""
echo "--- Backend health check ---"
curl -sf http://127.0.0.1:8001/health && echo " OK" || {
    echo " FAILED — check logs: docker compose logs backend"
    exit 1
}

echo ""
echo "============================================="
echo "  Deploy complete!"
echo "============================================="
echo ""
echo "Useful commands:"
echo "  docker compose logs -f backend    # stream backend logs"
echo "  docker compose logs -f frontend   # stream frontend logs"
echo "  docker compose ps                 # container status"
echo "  docker compose down               # stop everything (data is preserved)"
echo ""
