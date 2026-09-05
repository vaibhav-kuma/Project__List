@echo off
setlocal enabledelayedexpansion

echo.
echo 🚀 AutoApply AI - Starting Development Server
echo.

REM Check if backend .env exists
if not exist "backend\.env" (
    echo ⚠️  backend\.env not found!
    echo Creating from template...
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env
    echo.
    echo ⚠️  IMPORTANT: Edit backend\.env and add your OPENAI_API_KEY
    exit /b 1
)

REM Check if API key is set
findstr /M "sk-your-api-key-here" backend\.env >nul
if !errorlevel! equ 0 (
    echo ❌ Please update OPENAI_API_KEY in backend\.env
    exit /b 1
)

echo ✅ All checks passed!
echo.
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

echo.
echo 🚀 Starting Backend (Terminal 1)...
echo.
echo In a new terminal, run:
echo   cd backend
echo   python main.py
echo.

echo ✅ When backend is running, start frontend (Terminal 2):
echo   cd frontend
echo   npm run dev
echo.

echo 🌐 Frontend will be at: http://localhost:3000
echo 🔧 Backend API at: http://localhost:8000
echo 📚 API Docs at: http://localhost:8000/docs
echo.

pause
