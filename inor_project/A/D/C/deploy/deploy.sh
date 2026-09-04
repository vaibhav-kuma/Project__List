#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# YouTube Clone — Production Deployment Script
# ─────────────────────────────────────────────
# Run on a fresh Ubuntu 22.04+ VPS as root or sudo.
# Usage:
#   export DOMAIN=ytclone.example.com
#   export REPO_URL=https://github.com/you/ytclone.git
#   bash deploy.sh
# ─────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

DOMAIN="${DOMAIN:-ytclone.example.com}"
REPO_URL="${REPO_URL:-}"
APP_DIR="/opt/ytclone"
ENV_FILE="${APP_DIR}/.env"

# ── Phase 1: System deps ────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

log "Installing Docker + Compose..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable --now docker
fi

if ! docker compose version &>/dev/null 2>&1; then
    DOCKER_CONFIG="${DOCKER_CONFIG:-/usr/local/lib/docker/cli-plugins}"
    mkdir -p "$DOCKER_CONFIG"
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o "$DOCKER_CONFIG/docker-compose"
    chmod +x "$DOCKER_CONFIG/docker-compose"
fi

log "Installing Node.js 20..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

log "Installing tools: nginx, certbot, ffmpeg, pm2..."
apt-get install -y nginx certbot python3-certbot-nginx ffmpeg
npm install -g pm2 tsx

# ── Phase 2: Get code ────────────────────────
if [ ! -d "$APP_DIR" ]; then
    [ -n "$REPO_URL" ] || err "Set REPO_URL or manually copy files to $APP_DIR"
    log "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ── Phase 3: Environment file ────────────────
if [ ! -f "$ENV_FILE" ]; then
    warn "No .env found — creating template..."
    cp deploy/.env.production.example "$ENV_FILE"
    sed -i "s/ytclone\.example\.com/$DOMAIN/g" "$ENV_FILE"
    err "→ Edit $ENV_FILE with real secrets, then re-run this script."
fi

set -a; source "$ENV_FILE"; set +a

# ── Phase 4: Infra containers ────────────────
log "Starting PostgreSQL, Redis, Meilisearch, MinIO..."
docker compose up -d postgres redis meilisearch minio

log "Waiting for PostgreSQL..."
until docker exec yt-postgres pg_isready -U postgres &>/dev/null; do sleep 2; done
log "PostgreSQL ready."

# ── Phase 5: Build ───────────────────────────
log "Installing npm dependencies..."
npm install --legacy-peer-deps

log "Generating Prisma client..."
npx prisma generate

log "Running migrations..."
npx prisma migrate deploy

log "Seeding..."
npx prisma db seed

log "Writing web .env.local for build..."
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_SOCKET_URL=https://${DOMAIN}
NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN:-}
NEXT_PUBLIC_ENABLE_SHORTS=true
NEXT_PUBLIC_ENABLE_LIVE=true
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
EOF

log "Building with Turborepo..."
npm run build

# ── Phase 6: Start processes ─────────────────
log "Starting API (PM2)..."
pm2 delete yt-api 2>/dev/null || true
pm2 start apps/api/dist/index.js \
    --name "yt-api" -i max --max-memory-restart "1G"

log "Starting Web (PM2)..."
pm2 delete yt-web 2>/dev/null || true
pm2 start apps/web/node_modules/.bin/next \
    --name "yt-web" -- start --port 3000 \
    -i max --max-memory-restart "1G"

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ── Phase 7: Nginx + SSL ─────────────────────
log "Configuring Nginx..."
sed "s/yourdomain\.com/$DOMAIN/g" deploy/nginx.conf > /etc/nginx/sites-available/ytclone
ln -sf /etc/nginx/sites-available/ytclone /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "Getting SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" || warn "SSL failed — run: certbot --nginx -d $DOMAIN"

# ── Done ─────────────────────────────────────
echo ""
log "═══════════════════════════════════════════"
log "  https://${DOMAIN}"
log "  API: https://${DOMAIN}/api/health"
log "═══════════════════════════════════════════"
echo ""
log "Commands:"
log "  pm2 logs yt-api  — API logs"
log "  pm2 logs yt-web  — Web logs"
log "  pm2 monit        — Monitor"
log "  docker compose ps — Containers"
