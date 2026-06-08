@echo off
title RoadScan - Backend :8000
set PYTHON=C:\Users\baqda\AppData\Local\Python\bin\python.exe
echo Starting backend on http://localhost:8000
echo.
cd /d "%~dp0backend"
"%PYTHON%" -m uvicorn app.main:app --reload --port 8000
pause
