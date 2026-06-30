/**
 * 中文标注映射表
 * key: JSON 路径或字段名的匹配规则
 * value: 中文说明
 *
 * 匹配优先级：精确路径 > 字段名 > 值片段匹配
 */

// ── System Prompt 段落标注 ──
export const SYSTEM_SECTION_LABELS: Record<string, string> = {
  "# Harness": "工具运行规则 — Agent 如何输出、如何调用工具",
  "# Session-specific guidance": "会话特定指引 — 当前会话的特殊行为",
  "# Memory": "记忆系统 — 持久化文件记忆的读写规则",
  "# Environment": "运行环境信息 — 工作目录、平台、模型等",
  "# Context management": "上下文管理策略 — 上下文过长时如何摘要",
  "# Git": "Git 操作规则 — 提交、分支、PR 相关约束",
};

// ── System Prompt 整块标注（按 text 内容片段匹配）──
export const SYSTEM_BLOCK_LABELS: { match: string; label: string; desc: string }[] = [
  {
    match: "x-anthropic-billing-header",
    label: "计费标记",
    desc: "每次请求附带的计费信息头，包含 CLI 版本和入口点",
  },
  {
    match: "You are Claude Code, Anthropic's official CLI",
    label: "身份声明",
    desc: "声明自己是 Claude Code（Anthropic 官方 CLI 工具）",
  },
  {
    match: "You are an interactive agent that helps users",
    label: "核心指令",
    desc: "Agent 的完整行为规范：工具使用、安全策略、记忆、环境等",
  },
  {
    match: "performing a web search",
    label: "工具辅助指令",
    desc: "子 Agent 的精简指令（如 Web 搜索 Agent）",
  },
];

// ── Tools 工具名 → 中文说明 ──
export const TOOL_LABELS: Record<string, string> = {
  Agent: "启动子 Agent 执行多步复杂任务",
  AskUserQuestion: "向用户提问，等待选择或输入",
  Bash: "执行 Shell 命令（Git Bash）",
  CronCreate: "创建定时/循环任务",
  CronDelete: "删除定时任务",
  CronList: "列出所有定时任务",
  DesignSync: "同步设计系统项目",
  Edit: "文件内容精确替换编辑",
  EnterPlanMode: "进入计划模式（先规划再实现）",
  EnterWorktree: "创建隔离的 Git Worktree",
  ExitPlanMode: "退出计划模式，提交方案供审批",
  ExitWorktree: "退出 Worktree，恢复原目录",
  Glob: "文件路径模式匹配搜索",
  Grep: "文件内容正则搜索（ripgrep）",
  NotebookEdit: "编辑 Jupyter Notebook 单元格",
  Read: "读取本地文件内容",
  ScheduleWakeup: "安排下次唤醒时间（/loop 模式）",
  SendMessage: "向其他 Agent 发送消息",
  Skill: "调用技能（/斜杠命令）",
  TaskCreate: "创建结构化任务列表",
  TaskGet: "获取任务详情",
  TaskList: "列出所有任务",
  TaskOutput: "获取后台任务输出",
  TaskStop: "停止后台任务",
  TaskUpdate: "更新任务状态/内容",
  WebFetch: "抓取网页并提问",
  WebSearch: "Web 搜索",
  Workflow: "执行多 Agent 工作流脚本",
  Write: "写入/创建文件",
};

// ── Request 顶层字段标注 ──
export const REQUEST_FIELD_LABELS: Record<string, string> = {
  model: "模型名称",
  messages: "对话消息列表",
  system: "系统提示词（固定模板）",
  tools: "可用工具定义列表",
  metadata: "元数据（用户ID、会话ID等）",
  max_tokens: "最大输出 Token 数",
  thinking: "思考模式配置",
  context_management: "上下文管理配置",
  output_config: "输出配置（effort 等）",
  stream: "是否流式输出",
  headers: "请求头",
  body: "请求体",
};

// ── Response 顶层字段标注 ──
export const RESPONSE_FIELD_LABELS: Record<string, string> = {
  id: "响应唯一ID",
  type: "消息类型",
  role: "角色（assistant）",
  model: "使用的模型",
  content: "响应内容（文本/思考/工具调用）",
  stop_reason: "停止原因（end_turn/tool_use/max_tokens）",
  stop_sequence: "触发停止的序列",
  usage: "Token 用量统计",
  input_tokens: "输入 Token 数",
  output_tokens: "输出 Token 数",
  cache_creation_input_tokens: "缓存创建消耗的输入 Token",
  cache_read_input_tokens: "缓存命中的输入 Token",
  service_tier: "服务等级",
  status: "HTTP 状态码",
  headers: "响应头",
  body: "响应体",
  _streaming: "是否流式响应",
  events: "SSE 事件列表",
};

// ── Headers 常见字段标注 ──
export const HEADER_LABELS: Record<string, string> = {
  "User-Agent": "客户端标识（Claude CLI 版本）",
  "X-Claude-Code-Session-Id": "会话 ID",
  "Anthropic-Beta": "启用的 Beta 功能列表",
  "Anthropic-Version": "API 版本",
  "Anthropic-Dangerous-Direct-Browser-Access": "允许浏览器直接访问",
  "X-Stainless-Os": "操作系统",
  "X-Stainless-Arch": "CPU 架构",
  "X-Stainless-Lang": "SDK 语言",
  "X-Stainless-Runtime": "运行时（Node.js）",
  "X-Stainless-Runtime-Version": "运行时版本",
  "X-Stainless-Package-Version": "SDK 包版本",
  "X-Stainless-Timeout": "超时时间（秒）",
  "X-Stainless-Retry-Count": "已重试次数",
  "X-App": "应用标识",
  "Content-Type": "请求体格式",
  "Content-Length": "请求体大小（字节）",
  "Accept": "期望的响应格式",
  "Accept-Encoding": "支持的压缩格式",
  "Connection": "连接方式",
  "Host": "目标主机",
  Authorization: "认证信息（已脱敏）",
  Server: "服务端标识",
  "Transfer-Encoding": "传输编码",
  "Cache-Control": "缓存策略",
  "Strict-Transport-Security": "HTTPS 强制策略",
  "X-Content-Type-Options": "内容类型嗅探保护",
  "x-ds-trace-id": "请求追踪 ID",
};

// ── Messages 角色/类型标注 ──
export const MESSAGE_LABELS: Record<string, string> = {
  user: "用户消息",
  assistant: "助手回复",
  system: "系统消息（Agent 类型 & Skills 列表）",
};

// ── Content Block 类型标注 ──
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  text: "文本内容",
  thinking: "思考过程（内部推理）",
  tool_use: "工具调用",
  tool_result: "工具返回结果",
  image: "图片内容",
};

// ── 深层字段标注 ──
export const DEEP_FIELD_LABELS: Record<string, string> = {
  cache_control: "缓存控制策略",
  ephemeral: "临时缓存（会话内有效）",
  input_schema: "工具输入参数的 JSON Schema",
  description: "描述/说明",
  properties: "对象属性定义",
  required: "必填字段列表",
  additionalProperties: "是否允许额外属性",
  "$schema": "JSON Schema 版本声明",
  enum: "枚举可选值",
  minItems: "数组最少元素数",
  maxItems: "数组最多元素数",
  minLength: "字符串最短长度",
  maxLength: "字符串最大长度",
  minimum: "数值最小值",
  maximum: "数值最大值",
  exclusiveMinimum: "数值排他最小值",
  pattern: "正则匹配模式",
  format: "格式约束（如 uri）",
  default: "默认值",
  anyOf: "满足任一条件",
  // thinking / output_config
  effort: "推理努力程度（low/medium/high）",
  adaptive: "自适应思考模式",
  // context_management
  edits: "上下文编辑规则",
  keep: "保留策略",
  clear_thinking_20251015: "清除旧思考内容",
  // Anthropic-Beta flags
  "claude-code-20250219": "Claude Code 能力集",
  "interleaved-thinking-2025-05-14": "交错思考（思考穿插工具调用）",
  "redact-thinking-2026-02-12": "隐藏思考内容（脱敏）",
  "thinking-token-count-2026-05-13": "统计思考 Token 数",
  "context-management-2025-06-27": "上下文自动管理",
  "prompt-caching-scope-2026-01-05": "Prompt 缓存作用域",
  "mid-conversation-system-2026-04-07": "对话中途插入系统消息",
  "effort-2025-11-24": "推理 effort 控制",
  // SSE events
  message_start: "消息开始",
  content_block_start: "内容块开始",
  content_block_delta: "内容块增量",
  content_block_stop: "内容块结束",
  message_delta: "消息增量",
  message_stop: "消息结束",
  ping: "心跳保活",
  // stop_reason values
  end_turn: "正常结束",
  tool_use: "需要调用工具",
  max_tokens: "达到最大 Token 限制",
  // message fields
  signature: "思考签名（用于验证）",
  user_id: "用户标识",
  device_id: "设备 ID",
  account_uuid: "账户 UUID",
  session_id: "会话 ID",
};

/**
 * 根据 JSON 路径和值，查找对应的中文标注
 */
export function getAnnotation(path: string[], key: string, value: unknown): string | null {
  const pathStr = path.join(".");

  // request.body 顶层字段
  if (pathStr === "body" || pathStr === "request.body" || pathStr === "request" || pathStr === "") {
    if (REQUEST_FIELD_LABELS[key]) return REQUEST_FIELD_LABELS[key];
  }

  // response.body 顶层字段
  if (pathStr.includes("response")) {
    if (RESPONSE_FIELD_LABELS[key]) return RESPONSE_FIELD_LABELS[key];
  }

  // headers
  if (pathStr.includes("headers") || key === "headers") {
    if (key === "headers") return "HTTP 头部";
    if (HEADER_LABELS[key]) return HEADER_LABELS[key];
  }

  // tools 数组里的 name 字段
  if (key === "name" && typeof value === "string" && TOOL_LABELS[value]) {
    return TOOL_LABELS[value];
  }

  // messages 里的 role
  if (key === "role" && typeof value === "string" && MESSAGE_LABELS[value]) {
    return MESSAGE_LABELS[value];
  }

  // content block 里的 type
  if (key === "type" && typeof value === "string" && CONTENT_TYPE_LABELS[value]) {
    return CONTENT_TYPE_LABELS[value];
  }

  // SSE event type
  if (key === "type" && typeof value === "string" && DEEP_FIELD_LABELS[value]) {
    return DEEP_FIELD_LABELS[value];
  }

  // stop_reason value
  if (key === "stop_reason" && typeof value === "string" && DEEP_FIELD_LABELS[value]) {
    return `停止原因: ${DEEP_FIELD_LABELS[value]}`;
  }

  // system prompt 块匹配
  if (key === "text" && typeof value === "string") {
    for (const block of SYSTEM_BLOCK_LABELS) {
      if (value.includes(block.match)) {
        return `${block.label} — ${block.desc}`;
      }
    }
  }

  // cache_control 相关
  if (key === "cache_control") return DEEP_FIELD_LABELS.cache_control;
  if (key === "type" && value === "ephemeral") return DEEP_FIELD_LABELS.ephemeral;

  // thinking 配置
  if (key === "type" && value === "adaptive") return DEEP_FIELD_LABELS.adaptive;

  // Anthropic-Beta 值：逗号分隔的 flag 列表，逐个翻译
  if (key === "Anthropic-Beta" && typeof value === "string") {
    const flags = value.split(",");
    const translated = flags
      .map((f) => {
        const trimmed = f.trim();
        return DEEP_FIELD_LABELS[trimmed] ? `${trimmed} → ${DEEP_FIELD_LABELS[trimmed]}` : trimmed;
      })
      .filter((f) => f.includes("→"));
    if (translated.length > 0) {
      return `Beta 功能：${translated.join("；")}`;
    }
    return "启用的 Beta 功能列表";
  }

  // 深层字段通用匹配
  if (DEEP_FIELD_LABELS[key] && !["type", "name", "text"].includes(key)) {
    return DEEP_FIELD_LABELS[key];
  }

  // input_schema / JSON Schema 字段
  if (key === "input_schema") return DEEP_FIELD_LABELS.input_schema;

  return null;
}
