#!/usr/bin/env bash
# BizOS — one-time server setup (Docker edition)
# ─────────────────────────────────────────────────────────────────────────────
# Run ONCE on the Hostinger VPS as root (or with sudo):
#   chmod +x deploy/setup.sh
#   sudo ./deploy/setup.sh bizos.YOURDOMAIN.COM
#
# Prerequisites: Ubuntu 20.04/22.04, SSH access
# PostgreSQL is NOT installed here — Docker Compose handles it in a container.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="${1:?Usage: sudo ./setup.sh bizos.YOURDOMAIN.COM}"

echo "============================================="
echo "  BizOS Server Setup — $DOMAIN"
echo "============================================="

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/5] Installing system packages..."
apt-get update -qq
apt-get install -y -q nginx certbot python3-certbot-nginx curl git

# ── 2. Docker ─────────────────────────────────────────────────────────────────
echo "[2/5] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
# Allow running docker without sudo (re-login required for this to take effect)
usermod -aG docker "${SUDO_USER:-$(whoami)}" 2>/dev/null || true

# ── 3. Nginx config ───────────────────────────────────────────────────────────
echo "[3/5] Installing nginx config..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx/bizos.conf"

if [ -f "$NGINX_CONF" ]; then
    sed "s/bizos.YOURDOMAIN.COM/$DOMAIN/g" "$NGINX_CONF" \
        > /etc/nginx/sites-available/bizos
    ln -sf /etc/nginx/sites-available/bizos /etc/nginx/sites-enabled/bizos
    nginx -t && systemctl reload nginx
    echo "  Nginx config installed for $DOMAIN"
else
    echo "  WARNING: $NGINX_CONF not found — install nginx config manually"
fi

# ── 4. SSL certificate ────────────────────────────────────────────────────────
echo "[4/5] Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email "admin@$(echo "$DOMAIN" | cut -d. -f2-)"

# ── 5. Create log directory ───────────────────────────────────────────────────
echo "[5/5] Creating log directory..."
mkdir -p /var/log/bizos

echo ""
echo "============================================="
echo "  Setup complete!"
echo "============================================="
echo ""
echo "NEXT STEPS:"
echo "  1. Copy .env.docker.example → .env  (repo root) and fill in all values"
echo "  2. Copy bizos-backend/.env.production.example → bizos-backend/.env"
echo "     and fill in SECRET_KEY, CORS_ORIGINS, token expiry values"
echo "     (DATABASE_URL is overridden by docker-compose — leave the placeholder)"
echo "  3. Run: ./deploy/deploy.sh"
echo ""
echo "  NOTE: Log out and back in (or run 'newgrp docker') so your user"
echo "        can run docker without sudo."
echo ""
