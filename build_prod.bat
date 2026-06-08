@echo off
set PYTHON=C:\Users\baqda\AppData\Local\Python\bin\python.exe

echo ========================================
echo   RoadScan - Production Build
echo ========================================

echo.
echo [1/4] Building frontend...
cd /d "%~dp0frontend"
npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

echo.
echo [2/4] Copying dist to backend/static...
if exist "%~dp0backend\static" rmdir /s /q "%~dp0backend\static"
mkdir "%~dp0backend\static"
xcopy /s /q "%~dp0frontend\dist\*" "%~dp0backend\static\"
if errorlevel 1 (
    echo ERROR: Copy failed
    pause
    exit /b 1
)

echo.
echo [3/4] Installing backend dependencies...
cd /d "%~dp0backend"
"%PYTHON%" -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed
    pause
    exit /b 1
)

echo.
echo [4/4] Starting production server...
echo.
echo ========================================
echo  App is running at: http://localhost:8000
echo  API Docs:          http://localhost:8000/api/docs
echo ========================================
echo.
"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
