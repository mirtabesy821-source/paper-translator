@echo off
chcp 65001 >nul
title 学术论文双语翻译

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════╗
echo ║     📄 学术论文双语翻译 — 启动中...      ║
echo ╚══════════════════════════════════════════╝
echo.

:: 检查 node_modules
if not exist "node_modules\" (
    echo [1/2] 首次运行，正在安装依赖，请稍候...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
) else (
    echo [1/2] 依赖已就绪
)

:: 获取本机 IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

:: 启动开发服务器（绑定所有网卡，局域网可访问）
echo [2/2] 启动翻译服务...
echo.
echo    本机访问: http://localhost:3000
if not "%LOCAL_IP%"=="" echo    局域网访问: http://%LOCAL_IP%:3000
echo.
start http://localhost:3000
npx next dev -H 0.0.0.0 -p 3000

pause
