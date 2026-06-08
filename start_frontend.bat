@echo off
title RoadScan - Frontend :3000
echo Starting frontend on http://localhost:3000
echo.
cd /d "%~dp0frontend"
npm run dev
pause
