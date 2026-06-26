@echo off
REM Quick start script for Windows ? installs deps and starts dev server
cd /d "%~dp0"

echo Paper Translator - Starting...
echo.

if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 ( pause & exit /b 1 )
)

echo [2/2] Starting dev server...
echo.
echo ==========================================
echo   Local: http://localhost:3000
echo ==========================================
echo.

npx next dev -H 0.0.0.0 -p 3000
pause