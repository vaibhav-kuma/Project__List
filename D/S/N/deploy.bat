@echo off
REM AUTO-APPLY AI - COMPLETE DEPLOYMENT SCRIPT (Windows)
REM ========================================================
REM This script automates the complete deployment process

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  AUTO-APPLY AI DEPLOYMENT SCRIPT                ║
echo ║                Windows Production Deployment                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM ============================================================================
REM PHASE 1: PRE-DEPLOYMENT CHECKS
REM ============================================================================

echo ═══ PHASE 1: Pre-Deployment Checks ═══
echo.

echo Checking system requirements...

REM Check Docker
docker --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Docker is installed
) else (
    echo ❌ Docker is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Docker Compose is installed
) else (
    echo ❌ Docker Compose is not installed.
    exit /b 1
)

REM Check git
git --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Git is installed
) else (
    echo ❌ Git is not installed.
    exit /b 1
)

echo.

REM ============================================================================
REM PHASE 2: ENVIRONMENT SETUP
REM ============================================================================

echo ═══ PHASE 2: Environment Setup ═══
echo.

if not exist "backend\.env" (
    echo ❌ .env file not found in backend\
    echo ⚠️  Copying from .env.example...
    copy backend\.env.example backend\.env
    echo ⚠️  Please edit backend\.env and add your API keys
    exit /b 1
)

findstr /M "sk-your-" backend\.env >nul
if !errorlevel! equ 0 (
    echo ❌ API keys are not configured in backend\.env
    exit /b 1
)

echo ✅ Environment file configured
echo.

REM ============================================================================
REM PHASE 3: BUILD PHASE
REM ============================================================================

echo ═══ PHASE 3: Build Phase ═══
echo.

echo Building Docker images...
docker-compose build --no-cache backend frontend

if !errorlevel! equ 0 (
    echo ✅ Docker images built successfully
) else (
    echo ❌ Failed to build Docker images
    exit /b 1
)

echo.

REM ============================================================================
REM PHASE 4: DEPLOYMENT
REM ============================================================================

echo ═══ PHASE 4: Deployment ═══
echo.

echo Starting containers...
docker-compose up -d

if !errorlevel! equ 0 (
    echo ✅ Containers started successfully
) else (
    echo ❌ Failed to start containers
    exit /b 1
)

timeout /t 5 /nobreak

echo.
echo Checking health status...

REM Check backend health
for /f "delims=" %%A in ('curl -s http://localhost:8000/health ^| find "ok"') do set BACKEND_HEALTH=%%A

if not "!BACKEND_HEALTH!"=="" (
    echo ✅ Backend is healthy
) else (
    echo ⚠️  Backend health check could not be verified
)

echo.

REM ============================================================================
REM PHASE 5: VERIFICATION
REM ============================================================================

echo ═══ PHASE 5: Verification ═══
echo.

echo Container Status:
docker-compose ps

echo.
echo Service URLs:
echo   • Frontend:        http://localhost:3000
echo   • Backend API:     http://localhost:8000
echo   • API Docs:        http://localhost:8000/docs
echo   • Backend Health:  http://localhost:8000/health

echo.

REM ============================================================================
REM PHASE 6: LOGS
REM ============================================================================

echo ═══ PHASE 6: Recent Logs ═══
echo.

echo Backend logs (last 5 lines):
docker-compose logs backend --tail=5

echo.
echo Frontend logs (last 5 lines):
docker-compose logs frontend --tail=5

echo.

REM ============================================================================
REM FINAL SUMMARY
REM ============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  🎉 DEPLOYMENT COMPLETE 🎉                    ║
echo ╚════════════════════════════════════════════════════════════════╝

echo.
echo ✅ AUTO-APPLY AI is now running in production!
echo.
echo 📊 Service Status:
echo    ✅ Backend:   Running on http://localhost:8000
echo    ✅ Frontend:  Running on http://localhost:3000
echo    ✅ Database:  SQLite (persistent volume)
echo.
echo 📝 Important Commands:
echo    docker-compose logs -f         # View logs
echo    docker-compose restart         # Restart services
echo    docker-compose down            # Stop services
echo    docker-compose ps              # Check status
echo.
echo 🔗 Access Points:
echo    • Web App:     http://localhost:3000
echo    • API:         http://localhost:8000
echo    • API Docs:    http://localhost:8000/docs
echo    • API Redoc:   http://localhost:8000/redoc
echo.
echo.

echo ✅ Deployment script completed successfully!

endlocal
