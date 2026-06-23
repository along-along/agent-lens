import { useState, useEffect } from "react";
import { fetchRequestContext, type ContextResponse } from "../api/client";
import { fmtK } from "../lib/utils";
import { AlertTriangle, CheckCircle, XCircle, FileText, Brain, Zap, Wrench, BookOpen, Globe, FolderOpen, ArrowRight, Bot, Link2, Plug } from "lucide-react";

interface Props {
  selectedId: number | null;
}

interface LoadedItem {
  name: string;
  status: "loaded" | "not-found" | "truncated";
  tokens: number;
  source: string;
  icon: React.ReactNode;
}

function ConceptCard({ icon, name, tag, desc, location }: {
  icon: React.ReactNode;
  name: string;
  tag: string;
  desc: string;
  location: string;
}) {
  return (
    <div className="p-4 bg-app-card rounded-lg border border-app-border hover:border-app-accent/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-app-muted">{icon}</div>
        <span className="text-[13px] font-semibold text-app-text">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-app-accent/10 text-app-accent font-medium">{tag}</span>
      </div>
      <p className="text-[11px] text-app-muted leading-relaxed mb-2">{desc}</p>
      <div className="text-[10px] text-app-subtle font-mono">{location}</div>
    </div>
  );
}

function ConceptCardWide({ icon, name, tag, desc, location }: {
  icon: React.ReactNode;
  name: string;
  tag: string;
  desc: string;
  location: string;
}) {
  return (
    <div className="p-4 bg-app-card rounded-lg border border-app-border hover:border-app-accent/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-app-muted">{icon}</div>
        <span className="text-[13px] font-semibold text-app-text">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-app-accent/10 text-app-accent font-medium">{tag}</span>
      </div>
      <p className="text-[11px] text-app-muted leading-relaxed mb-2">{desc}</p>
      <div className="text-[10px] text-app-subtle font-mono">{location}</div>
    </div>
  );
}

function ConceptCardHighlight({ icon, name, tag, desc, location }: {
  icon: React.ReactNode;
  name: string;
  tag: string;
  desc: string;
  location: string;
}) {
  return (
    <div className="p-5 bg-gradient-to-r from-app-accent/[0.03] to-transparent rounded-lg border border-app-accent/20 hover:border-app-accent/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-app-accent">{icon}</div>
        <span className="text-[14px] font-semibold text-app-text">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-app-accent text-white font-medium">{tag}</span>
      </div>
      <p className="text-[12px] text-app-muted leading-relaxed mb-2">{desc}</p>
      <div className="text-[10px] text-app-subtle font-mono">{location}</div>
    </div>
  );
}

export default function Overview({ selectedId }: Props) {
  const [context, setContext] = useState<ContextResponse | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    fetchRequestContext(selectedId).then(setContext);
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[16px] font-semibold mb-1 text-app-text">Agent Context 构成</h2>
          <p className="text-[12px] text-app-muted">
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
          <ConceptCardHighlight
            icon={<Plug className="w-4 h-4" />}
            name="MCP"
            tag="核心扩展"
            desc="Model Context Protocol — Agent 连接外部世界的桥梁。通过 MCP Server 操控浏览器、访问数据库、调用第三方 API。是 Agent 能力边界的关键扩展机制。"
            location="配置: mcp.json / ~/.claude/mcp.json"
          />
        </div>

        {/* Built-in Tools */}
        <div className="mb-6">
          <ConceptCardWide
            icon={<Wrench className="w-4 h-4" />}
            name="内置工具"
            tag="基础能力"
            desc="Agent 原生工具集（Read、Write、Bash、Grep、Glob、WebSearch…），每次请求随工具定义一起发送。"
            location="系统内置 29 个工具"
          />
        </div>

        {/* Global vs Project */}
        <div className="mb-6 p-4 bg-app-card rounded-lg border border-app-border">
          <h3 className="text-[13px] font-semibold mb-3 text-app-text">全局 vs 项目 — 作用范围</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <Globe className="w-4 h-4 text-app-muted shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] font-medium text-app-text">全局 ~/.claude/</div>
                <div className="text-[11px] text-app-muted mt-0.5">
                  用户级配置，对本机所有项目生效。
                  <br />
                  含：rules、skills、memory、MCP 配置
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <FolderOpen className="w-4 h-4 text-app-muted shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] font-medium text-app-text">项目 .claude/</div>
                <div className="text-[11px] text-app-muted mt-0.5">
                  项目级配置，仅当前项目生效，
                  <br />
                  会与全局配置合并（项目优先）
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 text-[12px] text-app-muted">
          <ArrowRight className="w-3.5 h-3.5" />
          点击左侧请求列表，查看实际上下文注入情况
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        加载中...
      </div>
    );
  }

  const bd = context.breakdown;

  const loadedItems: LoadedItem[] = [
    {
      name: "CLAUDE.md",
      status: bd.claude_md ? "loaded" : "not-found",
      tokens: bd.claude_md ? Math.round(bd.claude_md.chars / 4) : 0,
      source: bd.claude_md?.path || "—",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: "记忆",
      status: bd.memory ? "loaded" : "not-found",
      tokens: bd.memory ? Math.round(bd.memory.chars / 4) : 0,
      source: bd.memory?.path || "—",
      icon: <Brain className="w-4 h-4" />,
    },
    ...bd.rules.map((rule, idx) => ({
      name: `规则 ${idx + 1}`,
      status: "loaded" as const,
      tokens: Math.round(rule.chars / 4),
      source: rule.path || "—",
      icon: <BookOpen className="w-4 h-4" />,
    })),
    {
      name: "技能",
      status: bd.skills.length > 0 ? "loaded" : "not-found",
      tokens: 0,
      source: bd.skills.length > 0 ? `${bd.skills.length} 个: ${bd.skills.slice(0, 5).join(", ")}${bd.skills.length > 5 ? "…" : ""}` : "—",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      name: "工具",
      status: bd.tool_names.length > 0 ? "loaded" : "not-found",
      tokens: context.sections.find((s) => s.type === "tools")?.chars
        ? Math.round((context.sections.find((s) => s.type === "tools")?.chars || 0) / 4)
        : 0,
      source: bd.tool_names.length > 0 ? `${bd.tool_names.length} 个: ${bd.tool_names.slice(0, 6).join(", ")}${bd.tool_names.length > 6 ? "…" : ""}` : "—",
      icon: <Wrench className="w-4 h-4" />,
    },
  ];

  const usageItems = context.sections.map((s) => ({
    label: s.label,
    chars: s.chars,
    tokens: Math.round(s.chars / 4),
    pct: context.total_chars > 0 ? (s.chars / context.total_chars) * 100 : 0,
  }));

  const warnings: string[] = [];
  if (bd.history_turns > 5) {
    warnings.push(`对话历史已达 ${bd.history_turns} 轮，可能占用大量上下文`);
  }
  if (context.total_tokens_estimate > 180_000) {
    warnings.push(`上下文总量 ~${fmtK(context.total_tokens_estimate)} tokens，接近上限`);
  }
  if (!bd.claude_md) {
    warnings.push("未检测到 CLAUDE.md，Agent 可能缺少项目指引");
  }
  if (!bd.memory) {
    warnings.push("未检测到 Memory，Agent 可能缺少记忆上下文");
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "loaded":
        return <CheckCircle className="w-4 h-4 text-app-green" />;
      case "truncated":
        return <AlertTriangle className="w-4 h-4 text-app-amber" />;
      default:
        return <XCircle className="w-4 h-4 text-app-subtle" />;
    }
  };

  const BAR_COLORS = [
    "bg-app-accent",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold mb-1 text-app-text">已加载上下文</h2>
        <p className="text-[12px] text-app-muted">AI 到底拿到了什么？</p>
      </div>

      {/* Loaded Items */}
      <div className="grid gap-2 mb-8">
        {loadedItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 px-4 py-3 bg-app-card rounded-lg border border-app-border"
          >
            <div className="text-app-muted">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-app-text">{item.name}</div>
              <div className="text-[11px] text-app-muted truncate">{item.source}</div>
            </div>
            <div className="text-[12px] text-app-muted font-mono">
              {item.status === "loaded" ? `${fmtK(item.tokens)} tokens` : "—"}
            </div>
            <div>{statusIcon(item.status)}</div>
          </div>
        ))}
      </div>

      {/* Context Usage */}
      <div className="mb-8">
        <h3 className="text-[13px] font-semibold mb-3 text-app-text">上下文占用</h3>
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-3">
          {usageItems.map((item, i) => (
            <div
              key={i}
              className={`${BAR_COLORS[i % BAR_COLORS.length]}`}
              style={{ width: `${Math.max(item.pct, 1)}%` }}
              title={`${item.label}: ${fmtK(item.tokens)} tokens (${item.pct.toFixed(1)}%)`}
            />
          ))}
        </div>
        <div className="space-y-1">
          {usageItems.map((item, i) => (
            <div key={i} className="flex justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                <span className="text-app-muted">{item.label}</span>
              </div>
              <span className="text-app-muted font-mono">
                ~{fmtK(item.tokens)} tokens ({item.pct.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-app-subtle text-right">
          总计 ~{fmtK(context.total_tokens_estimate)} tokens
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold mb-3 text-app-amber">警告</h3>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-app-amber"
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
