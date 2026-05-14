#!/usr/bin/env bash
# BizOS — Free hosting deploy (Fly.io backend + Vercel frontend)
# ─────────────────────────────────────────────────────────────────────────────
# Prerequisites (install once):
#   curl -L https://fly.io/install.sh | sh
#   npm install -g vercel
#
# First time:
#   ./deploy/free-deploy.sh init
#
# Updates:
#   ./deploy/free-deploy.sh          (deploy both)
#   ./deploy/free-deploy.sh backend  (backend only)
#   ./deploy/free-deploy.sh frontend (frontend only)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TARGET="${1:-all}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

deploy_backend() {
    echo "--- [Backend] Deploying to Fly.io ---"
    cd "$REPO_DIR/bizos-backend"
    fly deploy --remote-only
    echo "Backend deployed."
}

deploy_frontend() {
    echo "--- [Frontend] Deploying to Vercel ---"
    cd "$REPO_DIR/bizos-frontend"
    vercel --prod
    echo "Frontend deployed."
}

case "$TARGET" in
    init)
        echo "=== First-time setup ==="

        echo ""
        echo "--- [Backend] Fly.io init ---"
        cd "$REPO_DIR/bizos-backend"
        fly launch --no-deploy --copy-config
        echo ""
        echo "Now set your backend secrets (replace values):"
        cat <<'EOF'
  fly secrets set \
    SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')" \
    DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/bizos_db?sslmode=require" \
    CORS_ORIGINS="https://YOUR-APP.vercel.app" \
    ALGORITHM="HS256" \
    ACCESS_TOKEN_EXPIRE_MINUTES="15" \
    REFRESH_TOKEN_EXPIRE_DAYS="7"
EOF
        echo ""
        echo "--- [Frontend] Vercel init ---"
        cd "$REPO_DIR/bizos-frontend"
        vercel
        echo ""
        echo "Set these in your Vercel project dashboard (Settings → Environment Variables):"
        echo "  NEXT_PUBLIC_API_URL  = https://bizos-api.fly.dev/api/v1"
        echo "  ANTHROPIC_API_KEY    = sk-ant-..."
        echo "  GROQ_API_KEY         = gsk_..."
        echo ""
        echo "Then run: ./deploy/free-deploy.sh"
        ;;

    backend)  deploy_backend  ;;
    frontend) deploy_frontend ;;
    all)      deploy_backend && deploy_frontend ;;
    *)
        echo "Usage: $0 [init|backend|frontend|all]"
        exit 1
        ;;
esac

echo ""
echo "Done."
