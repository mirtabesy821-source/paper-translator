@echo off
chcp 65001 >nul
title 学术论文双语翻译

cd /d "%~dp0paper-translator"

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

:: 启动开发服务器
echo [2/2] 启动翻译服务...
echo.
start http://localhost:3000
npx next dev -p 3000

pause
