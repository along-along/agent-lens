# AI Agent Explorer

> The DevTools for AI Agents
> See how Claude Code actually plans, calls tools, and builds answers.

**看见 AI Agent 真正的思考、调用和决策过程。**

## 解决什么问题

- Claude 为什么变笨了？→ 看上下文是不是被撑爆了
- CLAUDE.md 到底生效了吗？→ 在 System Prompt 里一目了然
- Skill 到底塞哪里了？→ 展开 Messages 就看到
- MCP 工具到底传了什么？→ Tools 区完整展示
- 上下文到底用了多少？→ 可视化 Bar 直接看分布
- 一个问题为什么调了这么多次 API？→ 请求类型标签告诉你

## 架构

```
Claude Code
    ↓
proxy.py (localhost:8899) — 拦截、记录、透明转发（支持 SSE 流式）
    ↓
目标 API（DeepSeek / Anthropic / 任意兼容接口）

data/requests.jsonl — 每行一条完整记录（request + response）

server.py (localhost:8900) — REST API + 静态前端
    ↓
浏览器 — 实时查看、3秒自动刷新
```

## 快速开始

```powershell
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动 Web UI（一个终端）
python server.py

# 3. 启动代理（另一个终端，指定你的真实 API 地址）
$env:PROXY_TARGET="https://api.deepseek.com/anthropic"
python proxy.py

# 4. 配置 Claude Code 走代理
$env:ANTHROPIC_BASE_URL="http://localhost:8899"
claude

# 5. 浏览器打开
http://localhost:8900
```

Linux/Mac 用 `export` 替代 `$env:`。

## 功能

### 请求列表（左侧面板）

- **请求类型标签**：🔵 主请求 / 🔍 工具调用 / 📋 Recap
- **用户消息预览**：直接显示"今天厦门天气如何"而不只是"1 msgs"
- **会话颜色区分**：不同 Session-Id 用不同颜色圆点标识
- **Token / 耗时 / 模型** 一目了然

### 请求详情（右侧面板）

- **上下文可视化条形图**：直观看到每个部分占了多少
- **智能标签**：System Prompt 分段标注（Billing / Identity / Core Instructions）
- **Messages 语义识别**：CLAUDE.md + Memory + Rules / Agent Types + Skills / Tool Result
- **Tools 完整列表**：所有注册的工具定义

### Response 查看

- 流式 SSE 响应逐事件展示（thinking / text / tool_use）
- 非流式响应 JSON 格式化

## 一个问题到底调了几次 API？

以"今天厦门天气如何"为例，Claude Code 实际发了 3 次 API 调用：

```
[🔵 主请求]  用户问题 + 完整上下文 → Claude 决定调 WebSearch
[🔍 工具调用] 精简 prompt + web_search 工具 → 执行搜索
[🔵 主请求]  搜索结果塞回 messages → Claude 生成最终回答
```

这就是 Agent Loop 的运作方式——之前完全看不到，现在一清二楚。

## 数据存储

不用数据库。一个 JSONL 文件。

```
data/requests.jsonl
```

每行：
```json
{"id":1,"timestamp":"...","model":"...","request_type":"main","request":{...},"response":{...}}
```

优点：零依赖、容易调试、容易分享、容易导出。

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| PROXY_PORT | 8899 | 代理监听端口 |
| PROXY_TARGET | https://api.anthropic.com | 转发目标（改成你的实际 API） |
| VIEWER_PORT | 8900 | Web UI 端口 |

## 已知问题

- Windows 上 `.py` 文件可能被 TortoiseSVN/Git diff hook 加 TSD 头——如果遇到，用 `shutil.copy2` 从 `.txt` 复制过去
- 代理转发目标必须通过 `PROXY_TARGET` 环境变量指定，默认是 Anthropic 官方地址

## 下一步

- [ ] 按会话分组折叠
- [ ] 上下文分布饼图（CLAUDE.md / History / Skill / MCP 各占多少）
- [ ] 搜索功能（在所有请求中搜索特定内容）
- [ ] Token 使用趋势图
