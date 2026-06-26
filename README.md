# AgentLens

> The DevTools for AI Agents.
> See prompts, context, tools, memory, and execution flows in one place.

**AI Agent 可观测性工具。让开发者看见 Agent 的上下文、工具调用、记忆注入和执行链路。**

中文产品名：**AI探针**

## 解决什么问题

- Agent 为什么变笨了？→ 看上下文是不是被撑爆了
- CLAUDE.md / Rules 到底生效了吗？→ 在 System Prompt 里一目了然
- Skill 到底塞哪里了？→ 展开 Messages 就看到
- Memory 到底注入了什么？→ 上下文分布一览无余
- MCP 工具到底传了什么？→ Tools 区完整展示
- 上下文到底用了多少？→ 可视化 Bar 直接看分布
- 一个问题为什么调了这么多次 API？→ 请求类型标签告诉你
- 执行链路是怎样的？→ 思考→调用工具→获取结果→生成回答，全流程可见

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
浏览器 — React SPA 四页面（总览 / 提示词 / 对比 / 链路）

前端技术栈：React 19 + TypeScript + Vite + TailwindCSS
构建产物：static/（Vite build → Flask 直接 serve）
```

## 快速开始

```powershell
# 1. 安装 Python 依赖
pip install -r requirements.txt

# 2. 构建前端（首次需要 Node.js，后续 server.py 直接 serve 静态产物）
cd frontend && npm install && npm run build && cd ..

# 3. 启动 Web UI（一个终端）
python server.py

# 4. 启动代理（另一个终端，指定你的真实 API 地址）
$env:PROXY_TARGET="https://api.deepseek.com/anthropic"
python proxy.py

# 5. 配置 Claude Code 走代理
$env:ANTHROPIC_BASE_URL="http://localhost:8899"
claude

# 6. 浏览器打开
http://localhost:8900
```

**前端开发模式**（修改 UI 时用，热更新）：

```bash
cd frontend && npm run dev    # Vite 开发服务器，自动代理 /api 到 Flask
```

Linux/Mac 用 `export` 替代 `$env:`。

## 功能

四个页面，一个侧边栏：

### 总览 — 一眼看清上下文

- **已加载上下文**：CLAUDE.md / 记忆 / 技能 / 规则 / MCP 工具，每项显示 ✓/✗ 状态、Token 数、来源路径
- **上下文占用**：横向分布图，直观看到每部分占比
- **警告**：对话历史膨胀、上下文接近上限、缺失关键配置等智能提示

### 提示词 — 最终 Prompt 组成

- **左侧树**：系统 / 消息 / 工具 三组可折叠，每项独立节点
  - 系统提示词：计费标记、身份声明、核心指令（固定模板标注）
  - 消息：CLAUDE.md / 记忆 / 规则 / 技能 / 对话历史 / 工具结果 逐条拆开
  - 工具：完整 MCP 工具定义列表
- **右侧内容**：点击节点查看完整内容，带行号，JSON 自动格式化，超长内容可折叠

### 对比 — 请求间上下文变化

- 当前请求 vs 上一请求的结构化 Diff
- 新增 / 删除 / 修改 / 截断 四类变化，类似 Git Diff
- CLAUDE.md / 记忆 / 技能 / 规则 逐项对比

### 链路 — 执行流程（即将上线）

- User → 思考 → 调用工具 → 结果 → 回复 全链路可视化
- 点击节点查看输入 / 输出 / 耗时

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
| PROXY_TARGET | https://api.deepseek.com/anthropic | 转发目标（改成你的实际 API） |
| VIEWER_PORT | 8900 | Web UI 端口 |

## 已知问题

- Windows 上 `.py` 文件可能被 TortoiseSVN/Git diff hook 加 TSD 头——如果遇到，用 `shutil.copy2` 从 `.txt` 复制过去
- 代理转发目标必须通过 `PROXY_TARGET` 环境变量指定，默认是 Anthropic 官方地址

## 下一步

- [x] 多页面 SPA 架构（React + Vite + TypeScript + TailwindCSS）
- [x] Context Diff — 请求间上下文变化对比
- [ ] 按会话分组折叠
- [ ] 搜索功能（在所有请求中搜索特定内容）
- [ ] SSE 实时推送（替代 3 秒轮询）
- [ ] Token 使用趋势图
- [ ] Execution Flow 完整实现
- [ ] PyPI 包发布 (`pip install agentlens`)
- [ ] 正向代理模式（支持 Qoder CLI / Cursor CLI 等）
