@echo off
REM ============================================================================
REM AUTO-APPLY AI - LOCAL DOCKER TEST DEPLOYMENT
REM ============================================================================
REM This script helps you test the complete deployment locally using Docker

setlocal enabledelayedexpansion

title Auto-Apply AI - Local Deployment Test

echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║          AUTO-APPLY AI - LOCAL DOCKER DEPLOYMENT TEST                   ║
echo ║                   Testing Frontend and Backend                          ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.

REM Check if Docker is installed
echo [1/6] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not in PATH
    echo    Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo ✅ Docker found: 
docker --version

echo.
echo [2/6] Checking Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed
    pause
    exit /b 1
)
echo ✅ Docker Compose found:
docker-compose --version

REM Check if .env file has placeholder keys
echo.
echo [3/6] Checking configuration...
if not exist "backend\.env" (
    echo ⚠️  backend\.env not found
    echo    Creating from template...
    copy backend\.env.example backend\.env >nul
)

REM Check for placeholder keys
findstr /M "YOUR-NEW-OPENAI-API-KEY-HERE" backend\.env >nul 2>&1
if errorlevel 0 (
    echo ⚠️  IMPORTANT: You have placeholder API keys in backend\.env
    echo.
    echo    To test with real API calls, you need to:
    echo    1. Open backend\.env
    echo    2. Replace YOUR-NEW-OPENAI-API-KEY-HERE with your actual OpenAI key
    echo    3. Replace YOUR-NEW-TINYFISH-API-KEY-HERE with your actual TinyFish key
    echo.
    echo    For now, we'll test with placeholder keys (API calls will fail but container will run)
    echo.
    pause
) else (
    echo ✅ Configuration found (has real API keys)
)

echo.
echo [4/6] Building Docker images...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
docker-compose build
if errorlevel 1 (
    echo ❌ Docker build failed
    pause
    exit /b 1
)
echo ✅ Docker build completed successfully

echo.
echo [5/6] Starting containers locally...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
docker-compose up -d

if errorlevel 1 (
    echo ❌ Failed to start containers
    echo.
    echo Troubleshooting:
    echo - Check if ports 3000 and 8000 are already in use
    echo   Run: netstat -ano ^| findstr :3000
    echo - Stop existing containers: docker-compose down
    pause
    exit /b 1
)

echo ✅ Containers started successfully

echo.
echo [6/6] Verifying deployment...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Wait for services to startup
echo.
echo ⏳ Waiting for services to initialize (15 seconds)...
timeout /t 15 /nobreak >nul

REM Check backend health
echo.
echo 🔍 Testing Backend Health Check...
for /f "tokens=*" %%a in ('curl -s http://localhost:8000/health 2^>nul') do set "HEALTH=%%a"
if "!HEALTH!"=="" (
    echo ⚠️  Backend not responding yet (may still be starting)
    echo    Wait a few more seconds and try: curl http://localhost:8000/health
) else (
    echo ✅ Backend Response: !HEALTH!
)

REM Check frontend
echo.
echo 🔍 Testing Frontend...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 0 (
    echo ✅ Frontend is responding on port 3000
) else (
    echo ⚠️  Frontend not responding yet (may still be starting)
)

REM Show status
echo.
echo 📊 CONTAINER STATUS:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
docker-compose ps

echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║                   ✅ LOCAL DEPLOYMENT SUCCESSFUL!                        ║
echo ╚══════════════════════════════════════════════════════════════════════════╝

echo.
echo 🌐 Access your application at:
echo.
echo    Frontend:         http://localhost:3000
echo    Backend API:      http://localhost:8000
echo    API Documentation: http://localhost:8000/docs
echo.

echo 📋 USEFUL COMMANDS:
echo.
echo    View logs:         docker-compose logs -f
echo    Backend logs:      docker-compose logs -f backend
echo    Frontend logs:     docker-compose logs -f frontend
echo    Stop containers:   docker-compose down
echo    Restart:           docker-compose restart
echo.

echo 🔧 NEXT STEPS:
echo.
echo    1. Open http://localhost:3000 in your browser
echo    2. Test the application features
echo    3. Check http://localhost:8000/docs for API documentation
echo    4. View logs: docker-compose logs -f
echo.
echo    When ready for production deployment:
echo    - Run: docker-compose down
echo    - Update backend\.env with production values
echo    - Follow LIVE_SERVER_QUICK_START.md
echo.

echo Press any key to continue (containers will keep running)...
pause

REM Optional: show logs
echo.
echo Showing live logs (Press Ctrl+C to stop):
docker-compose logs -f
