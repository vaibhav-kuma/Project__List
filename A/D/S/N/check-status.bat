@echo off
REM SUPER QUICK CHECKLIST - Next 30 Seconds
REM Quick commands to check your status

cls
echo.
echo 🔍 CHECKING DEPLOYMENT STATUS...
echo.

echo ✅ Step 1: Docker Running?
docker ps 2>&1 | findstr /V "CONTAINER\|TIME" >nul && echo.    Docker is running || echo.    Docker not available

echo.
echo ✅ Step 2: Images Built?
docker images 2>&1 | findstr "backend\|frontend" || echo.    ^(Still building...^)

echo.
echo ✅ Step 3: Containers Up?
docker-compose ps 2>&1 | findstr "backend\|frontend" || echo.    ^(Not started yet^)

echo.
echo ✅ Step 4: Backend Health?
for /f %%i in ('curl -s http://localhost:8000/health 2^>nul') do (
    if not "%%i"=="" (
        echo.    Response: %%i
    ) else (
        echo.    ^(Not responding yet^)
    )
)

echo.
echo ✅ Step 5: Frontend Ready?
curl -s http://localhost:3000 >nul 2>&1 && echo.    Frontend responding! || echo.    ^(Not responding yet^)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📊 STATUS SUMMARY:
echo.

REM Check container count
for /f "tokens=*" %%i in ('docker ps -q 2^>nul ^| find /c /v ""') do (
    set /a RUNNING=%%i
)

if not defined RUNNING set RUNNING=0

if %RUNNING%==2 (
    echo.    ✅ BOTH SERVICES ARE UP! Deployment successful!
    echo.
    echo.    🌐 Access at:
    echo.       • Frontend: http://localhost:3000
    echo.       • Backend:  http://localhost:8000  
    echo.       • API Docs: http://localhost:8000/docs
) else if %RUNNING%==1 (
    echo.    ⏳ One service up, one still starting...
) else (
    echo.    ⏳ Build still in progress...
    echo.
    echo.    Monitor with: docker-compose logs -f
)

echo.
pause
