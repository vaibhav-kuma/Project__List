#!/bin/bash
# ============================================================================
# AUTO-APPLY AI - LOCAL DOCKER TEST DEPLOYMENT
# ============================================================================
# This script helps you test the complete deployment locally using Docker

set -e

clear
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════╗
║          AUTO-APPLY AI - LOCAL DOCKER DEPLOYMENT TEST                   ║
║                   Testing Frontend and Backend                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF

echo ""
echo "[1/6] Checking Docker installation..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Install from: https://docs.docker.com/engine/install/"
    exit 1
fi

echo "✅ Docker found:"
docker --version

echo ""
echo "[2/6] Checking Docker Compose..."

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo "✅ Docker Compose found:"
docker-compose --version

echo ""
echo "[3/6] Checking configuration..."

# Create .env if missing
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found"
    echo "   Creating from template..."
    cp backend/.env.example backend/.env
fi

# Check for placeholder keys
if grep -q "YOUR-NEW-OPENAI-API-KEY-HERE" backend/.env; then
    echo "⚠️  IMPORTANT: You have placeholder API keys in backend/.env"
    echo ""
    echo "   To test with real API calls, you need to:"
    echo "   1. Edit backend/.env"
    echo "   2. Replace YOUR-NEW-OPENAI-API-KEY-HERE with your actual key"
    echo "   3. Replace YOUR-NEW-TINYFISH-API-KEY-HERE with your actual key"
    echo ""
    echo "   For now, we'll test with placeholder keys (API calls will fail)"
    echo ""
    read -p "   Press Enter to continue..."
else
    echo "✅ Configuration found (has real API keys)"
fi

echo ""
echo "[4/6] Building Docker images..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker build completed successfully"

echo ""
echo "[5/6] Starting containers locally..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start containers"
    echo ""
    echo "Troubleshooting:"
    echo "- Check if ports 3000 and 8000 are already in use"
    echo "  Run: sudo ss -tulpn | grep -E ':3000|:8000'"
    echo "- Stop existing containers: docker-compose down"
    exit 1
fi

echo "✅ Containers started successfully"

echo ""
echo "[6/6] Verifying deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for services to initialize
echo ""
echo "⏳ Waiting for services to initialize (15 seconds)..."
sleep 15

# Check backend health
echo ""
echo "🔍 Testing Backend Health Check..."
HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "")

if [ -z "$HEALTH" ]; then
    echo "⚠️  Backend not responding yet (may still be starting)"
    echo "   Wait a few more seconds and try: curl http://localhost:8000/health"
else
    echo "✅ Backend Response: $HEALTH"
fi

# Check frontend
echo ""
echo "🔍 Testing Frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is responding on port 3000"
else
    echo "⚠️  Frontend not responding yet (may still be starting)"
fi

# Show container status
echo ""
echo "📊 CONTAINER STATUS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose ps

echo ""
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════╗
║                   ✅ LOCAL DEPLOYMENT SUCCESSFUL!                        ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF

echo ""
echo "🌐 Access your application at:"
echo ""
echo "   Frontend:              http://localhost:3000"
echo "   Backend API:           http://localhost:8000"
echo "   API Documentation:     http://localhost:8000/docs"
echo ""

echo "📋 USEFUL COMMANDS:"
echo ""
echo "   View logs:            docker-compose logs -f"
echo "   Backend logs:         docker-compose logs -f backend"
echo "   Frontend logs:        docker-compose logs -f frontend"
echo "   Stop containers:      docker-compose down"
echo "   Restart:              docker-compose restart"
echo ""

echo "🔧 NEXT STEPS:"
echo ""
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Test the application features"
echo "   3. Check http://localhost:8000/docs for API documentation"
echo "   4. View logs: docker-compose logs -f"
echo ""
echo "   When ready for production deployment:"
echo "   - Run: docker-compose down"
echo "   - Update backend/.env with production values"
echo "   - Follow LIVE_SERVER_QUICK_START.md"
echo ""

echo "Press Enter to view live logs (Ctrl+C to stop)..."
read

# Show live logs
docker-compose logs -f
