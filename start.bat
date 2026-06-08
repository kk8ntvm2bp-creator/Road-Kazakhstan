@echo off
title RoadScan Kazakhstan
set PYTHON=C:\Users\baqda\AppData\Local\Python\bin\python.exe

echo ========================================
echo   RoadScan Kazakhstan
echo ========================================
echo.

if not exist "%PYTHON%" (
    echo ERROR: Python not found
    pause & exit /b 1
)
echo Python: OK

echo.
echo [1/3] Backend dependencies...
cd /d "%~dp0backend"
"%PYTHON%" -m pip install -r requirements.txt --quiet
echo Backend: OK

echo.
echo [2/3] Frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Running npm install...
    npm install
) else (
    echo node_modules exists, skipping install
)
echo Frontend: OK

echo.
echo [3/3] Starting servers...
start "RoadScan Backend"  "%~dp0start_backend.bat"
ping -n 4 127.0.0.1 > nul
start "RoadScan Frontend" "%~dp0start_frontend.bat"

echo.
echo ========================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo ========================================
echo Open: http://localhost:3000
pause
