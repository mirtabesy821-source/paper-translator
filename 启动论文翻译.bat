@echo off
title Paper Translator

cd /d "%~dp0"

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Building for production...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Starting server...
start "Server" cmd /c "npx next start -H 0.0.0.0 -p 3000"
timeout /t 3 /nobreak >nul

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP: =%

echo.
echo ==========================================
echo   Local:  http://localhost:3000
if not "%IP%"=="" echo   LAN:    http://%IP%:3000
echo ==========================================
echo.
start http://localhost:3000
pause
