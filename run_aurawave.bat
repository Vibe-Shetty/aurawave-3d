@echo off
title AuraWave 3D Launcher
echo ============================================================
echo   Launching AuraWave 3D - Three.js AI Music Experience
echo ============================================================
echo.

cd /d "%~dp0"

:: Start browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8001"

:: Start Python server
python server.py

pause
