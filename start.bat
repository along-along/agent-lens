@echo off
chcp 65001 >nul
echo ============================================
echo   AI Agent Explorer - Starting...
echo ============================================
echo.

:: 启动代理（后台）
start "CCV-Proxy" cmd /c "python proxy.py"

:: 等待1秒
timeout /t 1 /nobreak >nul

:: 启动 Web UI
start "CCV-WebUI" cmd /c "python server.py"

:: 等待1秒
timeout /t 1 /nobreak >nul

:: 打开浏览器
start http://localhost:8900

echo.
echo [OK] Proxy 运行在 http://localhost:8899
echo [OK] Web UI 运行在 http://localhost:8900
echo.
echo 使用方法:
echo   set ANTHROPIC_BASE_URL=http://localhost:8899
echo   claude
echo.
echo 按任意键关闭所有服务...
pause >nul

taskkill /fi "WINDOWTITLE eq CCV-Proxy" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq CCV-WebUI" /f >nul 2>&1
