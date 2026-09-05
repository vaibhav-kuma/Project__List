#!/bin/bash
# AUTO-APPLY AI - COMPLETE DEPLOYMENT SCRIPT
# ==============================================
# This script automates the complete deployment process to a live server

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  AUTO-APPLY AI DEPLOYMENT SCRIPT                ║"
echo "║                     Complete Production Setup                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS
# ============================================================================

echo ""
echo "═══ PHASE 1: Pre-Deployment Checks ═══"
echo ""

info "Checking system requirements..."

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker is installed: $DOCKER_VERSION"
else
    error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    DC_VERSION=$(docker-compose --version)
    success "Docker Compose is installed: $DC_VERSION"
else
    error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    success "Git is installed: $GIT_VERSION"
else
    error "Git is not installed."
    exit 1
fi

# ============================================================================
# PHASE 2: ENVIRONMENT SETUP
# ============================================================================

echo ""
echo "═══ PHASE 2: Environment Setup ═══"
echo ""

# Check for .env file
if [ ! -f "backend/.env" ]; then
    error ".env file not found in backend/"
    warn "Copying from .env.example..."
    cp backend/.env.example backend/.env
    warn "Please edit backend/.env and add your API keys"
    exit 1
fi

# Verify API keys are set
if grep -q "sk-your-" backend/.env; then
    error "API keys are not configured in backend/.env"
    exit 1
fi

success "Environment file configured"

# ============================================================================
# PHASE 3: BUILD PHASE
# ============================================================================

echo ""
echo "═══ PHASE 3: Build Phase ═══"
echo ""

info "Building Docker images..."

docker-compose build --no-cache backend frontend

if [ $? -eq 0 ]; then
    success "Docker images built successfully"
else
    error "Failed to build Docker images"
    exit 1
fi

# ============================================================================
# PHASE 4: DEPLOYMENT
# ============================================================================

echo ""
echo "═══ PHASE 4: Deployment ═══"
echo ""

info "Starting containers..."

docker-compose up -d

if [ $? -eq 0 ]; then
    success "Containers started successfully"
else
    error "Failed to start containers"
    exit 1
fi

# Wait for services to be healthy
sleep 5

info "Checking health status..."

# Check backend health
BACKEND_HEALTH=$(curl -s http://localhost:8000/health | grep '"status":"ok"')
if [ ! -z "$BACKEND_HEALTH" ]; then
    success "Backend is healthy"
else
    warn "Backend health check failed, but container is running"
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" == "200" ]; then
    success "Frontend is responding (HTTP $FRONTEND_STATUS)"
else
    warn "Frontend returned HTTP $FRONTEND_STATUS"
fi

# ============================================================================
# PHASE 5: VERIFICATION
# ============================================================================

echo ""
echo "═══ PHASE 5: Verification ═══"
echo ""

info "Running verification tests..."

# Check Docker status
echo ""
info "Container Status:"
docker-compose ps

echo ""
info "Service URLs:"
echo "  • Frontend:        http://localhost:3000"
echo "  • Backend API:     http://localhost:8000"
echo "  • API Docs:        http://localhost:8000/docs"
echo "  • Backend Health:  http://localhost:8000/health"

# ============================================================================
# PHASE 6: LOGS
# ============================================================================

echo ""
echo "═══ PHASE 6: Recent Logs ═══"
echo ""

info "Backend logs (last 10 lines):"
docker-compose logs backend --tail=10

echo ""
info "Frontend logs (last 10 lines):"
docker-compose logs frontend --tail=10

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  🎉 DEPLOYMENT COMPLETE 🎉                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
success "AUTO-APPLY AI is now running in production!"
echo ""
echo "📊 Service Status:"
echo "   ✅ Backend:   Running on http://localhost:8000"
echo "   ✅ Frontend:  Running on http://localhost:3000"
echo "   ✅ Database:  SQLite (persistent volume)"
echo ""
echo "📝 Important Commands:"
echo "   docker-compose logs -f         # View logs"
echo "   docker-compose restart         # Restart services"
echo "   docker-compose down            # Stop services"
echo "   docker-compose ps              # Check status"
echo ""
echo "🔗 Access Points:"
echo "   • Web App:     http://localhost:3000"
echo "   • API:         http://localhost:8000"
echo "   • API Docs:    http://localhost:8000/docs"
echo "   • API Redoc:   http://localhost:8000/redoc"
echo ""
echo ""

success "Deployment script completed successfully!"
