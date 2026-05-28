@echo off
chcp 65001 >nul
title 学术论文双语翻译

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════╗
echo ║     📄 学术论文双语翻译 — 启动中...      ║
echo ╚══════════════════════════════════════════╝
echo.

:: ngrok 路径
set "NGROK=C:\Users\111\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

:: 检查 node_modules
if not exist "node_modules\" (
    echo [1/3] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
) else (
    echo [1/3] 依赖已就绪
)

:: 启动 Next.js 开发服务器（后台）
echo [2/3] 启动翻译服务...
start "NextJS Server" /min cmd /c "npx next dev -H 0.0.0.0 -p 3000"
echo    等待服务就绪...
timeout /t 5 /nobreak >nul

:: 启动 ngrok 公网隧道
echo [3/3] 启动公网隧道...
start "ngrok" /min cmd /c ""%NGROK%" http 3000 --log=stdout > ngrok-url.txt 2>&1"
timeout /t 3 /nobreak >nul

:: 从 ngrok API 获取公网地址
echo    正在获取公网地址...
curl -s http://127.0.0.1:4040/api/tunnels > ngrok-tmp.json 2>nul
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:4040/api/tunnels > ngrok-tmp.json 2>nul

:: 解析公网 URL
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content ngrok-tmp.json -Raw | ConvertFrom-Json).tunnels[0].public_url" 2^>nul') do set PUBLIC_URL=%%i

echo.
echo ╔══════════════════════════════════════════╗
if not "%PUBLIC_URL%"=="" (
    echo ║  🌍 公网地址: %PUBLIC_URL%
) else (
    echo ║  正在获取公网地址...
    echo ║  请稍后查看 ngrok 窗口
)
echo ║  🏠 本机访问: http://localhost:3000
echo ╚══════════════════════════════════════════╝
echo.
echo 关闭此窗口将停止所有服务。
echo.

if not "%PUBLIC_URL%"=="" start "" "%PUBLIC_URL%"

start http://localhost:3000
pause

:: 关闭 ngrok
taskkill /f /im ngrok.exe >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq NextJS Server" >nul 2>&1
