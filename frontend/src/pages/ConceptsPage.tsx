import { FileText, Brain, Zap, Wrench, BookOpen, Bot, Link2, Plug, Globe, FolderOpen } from "lucide-react";

// ── 复用 Overview 的卡片组件（内联一份）──

function ConceptCard({
  icon, name, tag, desc, location,
  variant = "default",
}: {
  icon: React.ReactNode;
  name: string;
  tag: string;
  desc: string;
  location: string;
  variant?: "default" | "wide" | "highlight";
}) {
  const isHighlight = variant === "highlight";
  const isWide = variant === "wide";
  return (
    <div
      className={`p-4 bg-app-card dark:bg-slate-700 rounded-lg border transition-colors ${
        isHighlight
          ? "border-app-accent/20 dark:border-blue-500/20 bg-gradient-to-r from-app-accent/[0.03] dark:from-blue-500/[0.03] to-transparent"
          : "border-app-border dark:border-slate-600 hover:border-app-accent/20 dark:hover:border-blue-500/20"
      } ${isWide ? "col-span-2" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={isHighlight ? "text-app-accent dark:text-blue-400" : "text-app-muted dark:text-slate-400"}>
          {icon}
        </div>
        <span className={`font-semibold text-app-text dark:text-slate-100 ${isHighlight ? "text-[14px]" : "text-[13px]"}`}>
          {name}
        </span>
        <span
          className={`text-[12px] px-1.5 py-0.5 rounded-full font-medium ${
            isHighlight
              ? "bg-app-accent dark:bg-blue-600 text-white"
              : "bg-app-accent/10 dark:bg-blue-500/10 text-app-accent dark:text-blue-400"
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="text-app-muted dark:text-slate-400 leading-relaxed mb-2 text-[12px]">{desc}</p>
      <div className="text-[12px] text-app-subtle dark:text-slate-500 font-mono">{location}</div>
    </div>
  );
}

// ── Page ──

export default function ConceptsPage() {
  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[16px] font-semibold mb-1 text-app-text dark:text-slate-100">Agent Context 构成</h2>
        <p className="text-[12px] text-app-muted dark:text-slate-400">
          AI Agent 的上下文由这些部分组成。每次请求，它们被打包进 System Prompt 发送给模型。
        </p>
      </div>

      {/* Concept Cards — 2x3 grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <ConceptCard
          icon={<FileText className="w-4 h-4" />}
          name="CLAUDE.md"
          tag="项目指引"
          desc="项目根目录入口文件，定义背景、架构、约定。Agent 首先读取它。"
          location="项目: ./CLAUDE.md"
        />
        <ConceptCard
          icon={<BookOpen className="w-4 h-4" />}
          name="Rules"
          tag="行为规则"
          desc="Markdown 规则文件，约束 Agent 行为、编码风格和工作方式。"
          location="全局: ~/.claude/rules/ | 项目: .claude/rules/"
        />
        <ConceptCard
          icon={<Brain className="w-4 h-4" />}
          name="Memory"
          tag="持久化记忆"
          desc="跨会话记忆存储，Agent 自动检索相关上下文注入。"
          location="项目: ./MEMORY.md"
        />
        <ConceptCard
          icon={<Zap className="w-4 h-4" />}
          name="Skills"
          tag="技能模块"
          desc="可复用技能包，封装特定工作流（PDF、PPT、飞书操作等）。"
          location="全局: ~/.claude/skills/ | 项目: .claude/skills/"
        />
        <ConceptCard
          icon={<Bot className="w-4 h-4" />}
          name="Agent"
          tag="智能体"
          desc="Agent 类型与子 Agent 配置。定义谁在干活（主 Agent / Browser / CodeReview…）。"
          location="系统配置 + 请求时声明"
        />
        <ConceptCard
          icon={<Link2 className="w-4 h-4" />}
          name="Hooks"
          tag="执行钩子"
          desc="生命周期拦截点：pre-tool / post-tool / notification 等，可编程修改 Agent 行为。"
          location="全局: ~/.claude/hooks/ | 项目: .claude/hooks/"
        />
      </div>

      {/* MCP — highlight card */}
      <div className="mb-6">
        <ConceptCard
          variant="highlight"
          icon={<Plug className="w-4 h-4" />}
          name="MCP"
          tag="核心扩展"
          desc="Model Context Protocol — Agent 连接外部世界的桥梁。通过 MCP Server 操控浏览器、访问数据库、调用第三方 API。是 Agent 能力边界的关键扩展机制。"
          location="配置: mcp.json / ~/.claude/mcp.json"
        />
      </div>

      {/* Built-in Tools */}
      <div className="mb-6">
        <ConceptCard
          variant="wide"
          icon={<Wrench className="w-4 h-4" />}
          name="内置工具"
          tag="基础能力"
          desc="Agent 原生工具集（Read、Write、Bash、Grep、Glob、WebSearch…），每次请求随工具定义一起发送。"
          location="系统内置 29 个工具"
        />
      </div>

      {/* Global vs Project */}
      <div className="mb-6 p-4 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
        <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">全局 vs 项目 — 作用范围</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <Globe className="w-4 h-4 text-app-muted dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-medium text-app-text dark:text-slate-100">全局 ~/.claude/</div>
              <div className="text-[12px] text-app-muted dark:text-slate-400 mt-0.5">
                用户级配置，对本机所有项目生效。
                <br />
                含：rules、skills、memory、MCP 配置
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <FolderOpen className="w-4 h-4 text-app-muted dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-medium text-app-text dark:text-slate-100">项目 .claude/</div>
              <div className="text-[12px] text-app-muted dark:text-slate-400 mt-0.5">
                项目级配置，仅当前项目生效，
                <br />
                会与全局配置合并（项目优先）
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
