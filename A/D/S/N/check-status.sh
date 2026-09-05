#!/usr/bin/env bash
# SUPER QUICK CHECKLIST - Next 30 Seconds
# Copy-paste these commands to check your status

echo "🔍 CHECKING DEPLOYMENT STATUS..."
echo ""

echo "✅ Step 1: Docker Running?"
docker ps 2>&1 | head -3

echo ""
echo "✅ Step 2: Images Built?"
docker images | grep -E "backend|frontend" || echo "   (Still building...)"

echo ""
echo "✅ Step 3: Containers Up?"
docker-compose ps 2>&1 | tail -3 || echo "   (Not started yet)"

echo ""
echo "✅ Step 4: Backend Health?"
curl -s http://localhost:8000/health 2>/dev/null || echo "   (Not responding yet)"

echo ""
echo "✅ Step 5: Frontend Ready?"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null && echo "(responding)" || echo "   (Not responding yet)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 QUICK DIAGNOSTICS:"
echo ""

# Check if Docker is actually building
echo "🔨 Is Docker building right now?"
ps aux | grep -i docker-compose | grep -v grep || echo "   (No active build)"

echo ""
echo "💾 Disk Space Available?"
df -h | grep -E "/$|C:" | awk '{print "   " $4 " free"}'

echo ""
echo "📊 Status Summary:"
RUNNING=$(docker ps -q 2>/dev/null | wc -l)
echo "   Containers running: $RUNNING"

if [ $RUNNING -eq 2 ]; then
    echo "   ✅ Both services are UP! Deployment successful!"
    echo ""
    echo "   🌐 Access at:"
    echo "      • Frontend: http://localhost:3000"
    echo "      • Backend:  http://localhost:8000"
    echo "      • API Docs: http://localhost:8000/docs"
elif [ $RUNNING -eq 1 ]; then
    echo "   ⏳ One service up, one still starting..."
elif [ $RUNNING -eq 0 ]; then
    echo "   ⏳ Build still in progress..."
    echo ""
    echo "   Monitor with: docker-compose logs -f"
fi
