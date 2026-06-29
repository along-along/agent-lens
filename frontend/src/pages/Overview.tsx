import { useState, useEffect } from "react";
import { fetchRequestContext, type ContextResponse } from "../api/client";
import { fmtK } from "../lib/utils";
import { AlertTriangle, CheckCircle, XCircle, FileText, Brain, Zap, Wrench, BookOpen } from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";

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

// ── Page ──

export default function Overview({ selectedId }: Props) {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetchRequestContext(selectedId)
      .then(setContext)
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-6">
          {/* Brand — compact */}
          <h1 className="text-[36px] font-bold tracking-tight text-app-text dark:text-slate-100 mb-2">
            Agent<span className="text-app-accent dark:text-blue-400">Lens</span>
          </h1>
          <p className="text-[16px] text-app-muted dark:text-slate-400 mb-1">
            See what your AI Agent actually sees.
          </p>
          <p className="text-[14px] text-app-subtle dark:text-slate-500 mb-8">
            看见 Agent 实际拿到的上下文，而不是猜测。
          </p>

          {/* Quick status */}
          <div className="inline-flex items-center gap-4 px-4 py-2.5 bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg mb-8 text-[13px]">
            <span className="flex items-center gap-1.5 text-app-green dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              服务已连接
            </span>
            <span className="text-app-border dark:text-slate-600">|</span>
            <span className="text-app-muted dark:text-slate-400">
              等待请求数据...
            </span>
          </div>

          {/* Action hint */}
          <p className="text-[13px] text-app-subtle dark:text-slate-500 mb-4">
            ← 选择左侧请求开始分析
          </p>

          {/* TODO: 填写B站视频URL */}
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-accent dark:hover:text-blue-400 transition-colors"
          >
            📺 2 分钟了解 AgentLens
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ContentSkeleton rows={4} />;
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
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
      source: bd.skills.length > 0 ? `${bd.skills.length} 个: ${bd.skills.slice(0, 5).map((s) => s.name).join(", ")}${bd.skills.length > 5 ? "…" : ""}` : "—",
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
  if (bd.tool_calls.length > 5) {
    warnings.push(`本请求调用了 ${bd.tool_calls.length} 次工具，可能影响响应速度`);
  }
  if (bd.thinking_count > 0) {
    warnings.push(`包含 ${bd.thinking_count} 段思考过程，上下文消耗较大`);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "loaded":
        return <CheckCircle className="w-4 h-4 text-app-green" />;
      case "truncated":
        return <AlertTriangle className="w-4 h-4 text-app-amber" />;
      default:
        return <XCircle className="w-4 h-4 text-app-subtle dark:text-slate-500" />;
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
    <div className="p-6 max-w-3xl pb-12">
      {/* Conversation Summary */}
      <div className="mb-6 p-4 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[13px] font-semibold text-app-text dark:text-slate-100">对话摘要</span>
          <span className="text-[11px] text-app-muted dark:text-slate-400">
            {bd.history_turns} 轮 · {bd.tool_calls.length} 次工具调用 · {bd.thinking_count > 0 ? `${bd.thinking_count} 次思考` : ""}
          </span>
        </div>
        {/* User question */}
        {context.sections.some((s) => s.role === "user" && !s.label.includes("上下文") && !s.label.includes("工具结果") && !s.label.includes("Recap")) && (
          <div className="text-[12px] text-app-text dark:text-slate-200 mb-2">
            💬 {context.sections.find((s) => s.role === "user" && !s.label.includes("上下文") && !s.label.includes("工具结果") && !s.label.includes("Recap"))?.label.replace("[user] ", "")}
          </div>
        )}
        {/* Tools called */}
        {bd.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {bd.tool_calls.map((tc, i) => (
              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-mono">
                {tc.name}
              </span>
            ))}
          </div>
        )}
        {/* Response preview */}
        {bd.response_text && (
          <div className="text-[12px] text-app-muted dark:text-slate-400 truncate">
            {bd.response_text.slice(0, 120)}{bd.response_text.length > 120 ? "…" : ""}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-[15px] font-semibold mb-1 text-app-text dark:text-slate-100">已加载上下文</h2>
        <p className="text-[12px] text-app-muted dark:text-slate-400">AI 到底拿到了什么？</p>
      </div>

      {/* Loaded Items */}
      <div className="grid gap-2 mb-8">
        {loadedItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 px-4 py-3 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600 overflow-hidden"
          >
            <div className="text-app-muted dark:text-slate-400 shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-app-text dark:text-slate-100">{item.name}</div>
              <div className="text-[12px] text-app-muted dark:text-slate-400 truncate" title={item.source}>{item.source}</div>
            </div>
            <div className="text-[12px] text-app-muted dark:text-slate-400 font-mono shrink-0">
              {item.status === "loaded" ? `${fmtK(item.tokens)} tokens` : "—"}
            </div>
            <div className="shrink-0">{statusIcon(item.status)}</div>
          </div>
        ))}
      </div>

      {/* Context Usage */}
      <div className="mb-8">
        <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">上下文占用</h3>
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-600 mb-3">
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
                <span className="text-app-muted dark:text-slate-400">{item.label}</span>
              </div>
              <span className="text-app-muted dark:text-slate-400 font-mono">
                ~{fmtK(item.tokens)} tokens ({item.pct.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[12px] text-app-subtle dark:text-slate-500 text-right">
          总计 ~{fmtK(context.total_tokens_estimate)} tokens
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold mb-3 text-app-amber dark:text-amber-400">警告</h3>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[12px] text-app-amber dark:text-amber-400"
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
