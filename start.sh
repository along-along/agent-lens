#!/bin/bash
echo "============================================"
echo "  AI Agent Explorer - Starting..."
echo "============================================"
echo ""

# 启动代理（后台）
python proxy.py &
PROXY_PID=$!

sleep 1

# 启动 Web UI（后台）
python server.py &
SERVER_PID=$!

sleep 1

echo ""
echo "[OK] Proxy  运行在 http://localhost:8899"
echo "[OK] Web UI 运行在 http://localhost:8900"
echo ""
echo "使用方法:"
echo "  export ANTHROPIC_BASE_URL=http://localhost:8899"
echo "  claude"
echo ""
echo "按 Ctrl+C 关闭所有服务"

# 优雅退出
trap "kill $PROXY_PID $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
