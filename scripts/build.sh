#!/bin/bash
set -e

echo "============================================"
echo "  AgentLens - Build Portable Package"
echo "============================================"
echo ""

# 回到项目根目录
cd "$(dirname "$0")/.."

# 检查依赖
command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js not found."; exit 1; }
command -v python3 >/dev/null 2>&1 && PYTHON=python3 || PYTHON=python

# Step 1: 构建前端
echo "[1/3] Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..
echo "[OK] Frontend built to static/"

# Step 2: 组装分发目录
echo "[2/3] Assembling distribution..."
rm -rf dist
mkdir -p dist/agentlens/data

cp server.py dist/agentlens/
cp proxy.py dist/agentlens/
cp requirements.txt dist/agentlens/
cp README.md dist/agentlens/
cp -r static dist/agentlens/

# 生成启动脚本
cat > dist/agentlens/start.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "  AgentLens (AI探针) v1.0"
echo "  The DevTools for AI Agents."
echo "============================================"
echo ""

python3 -c "import flask" 2>/dev/null || {
    echo "[INFO] Installing dependencies..."
    pip3 install -r "$SCRIPT_DIR/requirements.txt" --quiet
}

python3 "$SCRIPT_DIR/proxy.py" &
PROXY_PID=$!
sleep 1

python3 "$SCRIPT_DIR/server.py" &
SERVER_PID=$!
sleep 1

echo ""
echo "[OK] Proxy  运行在 http://localhost:8899"
echo "[OK] Web UI 运行在 http://localhost:8900"
echo ""
echo "使用方法:"
echo "  export ANTHROPIC_BASE_URL=http://localhost:8899"
echo "  claude / cline / cursor"
echo ""
echo "按 Ctrl+C 关闭"

trap "kill $PROXY_PID $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
EOF
chmod +x dist/agentlens/start.sh

# Windows 启动脚本
cat > dist/agentlens/start.bat << 'EOF'
@echo off
chcp 65001 >nul
echo ============================================
echo   AgentLens (AI探针) v1.0
echo   The DevTools for AI Agents.
echo ============================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing dependencies...
    pip install -r "%~dp0requirements.txt" --quiet
)

start "AgentLens-Proxy" /min cmd /c "python "%~dp0proxy.py""
timeout /t 1 /nobreak >nul

start "AgentLens-WebUI" /min cmd /c "python "%~dp0server.py""
timeout /t 2 /nobreak >nul

start http://localhost:8900

echo.
echo [OK] Proxy  运行在 http://localhost:8899
echo [OK] Web UI 运行在 http://localhost:8900
echo.
echo 使用方法:
echo   set ANTHROPIC_BASE_URL=http://localhost:8899
echo   claude / cline / cursor
echo.
echo 按任意键关闭所有服务...
pause >nul

taskkill /fi "WINDOWTITLE eq AgentLens-Proxy" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq AgentLens-WebUI" /f >nul 2>&1
EOF

# Step 3: 压缩
echo "[3/3] Creating archive..."
cd dist
tar -czf agentlens-v1.0-portable.tar.gz agentlens
cd ..

echo ""
echo "============================================"
echo "  Build Complete!"
echo ""
echo "  文件夹: dist/agentlens/"
echo "  压缩包: dist/agentlens-v1.0-portable.tar.gz"
echo ""
echo "  用户拿到后:"
echo "    1. 解压"
echo "    2. ./start.sh 或双击 start.bat"
echo "    3. 自动安装依赖 + 启动服务"
echo "============================================"
