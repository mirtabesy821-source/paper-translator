@echo off
title Paper Translator - Public Share

cd /d "%~dp0"

echo Starting services...

:: Start dev server
start "DevServer" cmd /c "npx next dev -H 0.0.0.0 -p 3000"
timeout /t 5 /nobreak >nul

:: Start ngrok (proxy must be OFF for this to work)
start "ngrok" ngrok http 3000

echo.
echo ========================================
echo   Check the ngrok window for the URL
echo   Share that URL with others
echo ========================================
echo.
start http://localhost:3000
pause
