@echo off
chcp 65001 >nul
echo ============================================
echo   AgentLens - Build Portable Package
echo ============================================
echo.

:: 回到项目根目录
cd /d "%~dp0.."

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python first.
    pause
    exit /b 1
)

:: Step 1: 构建前端
echo [1/3] Building frontend...
pushd frontend
call npm install --silent
call npm run build
popd
echo [OK] Frontend built to static/

:: Step 2: 组装分发目录
echo [2/3] Assembling distribution...
if exist dist rmdir /s /q dist
mkdir dist\agentlens
mkdir dist\agentlens\data

copy server.py dist\agentlens\ >nul
copy proxy.py dist\agentlens\ >nul
copy requirements.txt dist\agentlens\ >nul
copy README.md dist\agentlens\ >nul
xcopy static dist\agentlens\static\ /s /e /q >nul

:: 生成一键启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo echo ============================================
echo echo   AgentLens ^(AI探针^) v1.0
echo echo   The DevTools for AI Agents.
echo echo ============================================
echo echo.
echo.
echo where python ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     echo [ERROR] Python not found!
echo     echo Please install Python 3.8+ from https://python.org
echo     pause
echo     exit /b 1
echo ^)
echo.
echo python -c "import flask" 2^>nul
echo if %%errorlevel%% neq 0 ^(
echo     echo [INFO] Installing dependencies...
echo     pip install -r "%%~dp0requirements.txt" --quiet
echo ^)
echo.
echo start "AgentLens-Proxy" /min cmd /c "python "%%~dp0proxy.py""
echo timeout /t 1 /nobreak ^>nul
echo.
echo start "AgentLens-WebUI" /min cmd /c "python "%%~dp0server.py""
echo timeout /t 2 /nobreak ^>nul
echo.
echo start http://localhost:8900
echo.
echo echo.
echo echo [OK] Proxy  运行在 http://localhost:8899
echo echo [OK] Web UI 运行在 http://localhost:8900
echo echo.
echo echo 使用方法:
echo echo   set ANTHROPIC_BASE_URL=http://localhost:8899
echo echo   claude / cline / cursor
echo echo.
echo echo 按任意键关闭所有服务...
echo pause ^>nul
echo.
echo taskkill /fi "WINDOWTITLE eq AgentLens-Proxy" /f ^>nul 2^>^&1
echo taskkill /fi "WINDOWTITLE eq AgentLens-WebUI" /f ^>nul 2^>^&1
) > dist\agentlens\start.bat

:: 生成 Linux/Mac 启动脚本
(
echo #!/bin/bash
echo SCRIPT_DIR="$^(cd "$^(dirname "${BASH_SOURCE[0]}"^)" ^&^& pwd^)"
echo echo "============================================"
echo echo "  AgentLens ^(AI探针^) v1.0"
echo echo "  The DevTools for AI Agents."
echo echo "============================================"
echo echo ""
echo python3 -c "import flask" 2^>/dev/null ^|^| pip3 install -r "$SCRIPT_DIR/requirements.txt" --quiet
echo python3 "$SCRIPT_DIR/proxy.py" ^&
echo PROXY_PID=$!
echo sleep 1
echo python3 "$SCRIPT_DIR/server.py" ^&
echo SERVER_PID=$!
echo sleep 1
echo echo "[OK] Proxy  运行在 http://localhost:8899"
echo echo "[OK] Web UI 运行在 http://localhost:8900"
echo echo "按 Ctrl+C 关闭"
echo trap "kill $PROXY_PID $SERVER_PID 2^>/dev/null; exit 0" SIGINT SIGTERM
echo wait
) > dist\agentlens\start.sh

:: Step 3: 压缩（文件名带时间戳）
echo [3/3] Creating zip archive...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set D=%%a%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set T=%%a%%b
set ZIPNAME=agentlens-v1.0-%D%-%T%-portable.zip
powershell -Command "Compress-Archive -Path 'dist\agentlens\*' -DestinationPath 'dist\%ZIPNAME%' -Force"
echo [OK] Package: dist\%ZIPNAME%

echo.
echo ============================================
echo   Build Complete!
echo.
echo   文件夹: dist\agentlens\
echo   压缩包: dist\%ZIPNAME%
echo.
echo   用户拿到后:
echo     1. 解压
echo     2. 双击 start.bat
echo     3. 自动安装依赖 + 启动服务 + 打开浏览器
echo ============================================
pause
