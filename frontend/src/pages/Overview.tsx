import { useState, useEffect } from "react";
import { fetchRequestContext, type ContextResponse } from "../api/client";
import { fmtK } from "../lib/utils";
import { AlertTriangle, CheckCircle, XCircle, FileText, Brain, Zap, Wrench, BookOpen } from "lucide-react";

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

export default function Overview({ selectedId }: Props) {
  const [context, setContext] = useState<ContextResponse | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    fetchRequestContext(selectedId).then(setContext);
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        选择左侧请求查看总览
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
      source: bd.claude_md?.path?.split(/[/\\]/).pop() || "—",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: "记忆",
      status: bd.memory ? "loaded" : "not-found",
      tokens: bd.memory ? Math.round(bd.memory.chars / 4) : 0,
      source: bd.memory?.path?.split(/[/\\]/).pop() || "—",
      icon: <Brain className="w-4 h-4" />,
    },
    {
      name: "技能",
      status: bd.skills.length > 0 ? "loaded" : "not-found",
      tokens: 0,
      source: bd.skills.length > 0 ? `${bd.skills.length} 个技能` : "—",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      name: "规则",
      status: bd.rules.length > 0 ? "loaded" : "not-found",
      tokens: bd.rules.reduce((sum, r) => sum + Math.round(r.chars / 4), 0),
      source: bd.rules.length > 0 ? `${bd.rules.length} 条规则` : "—",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      name: "MCP 工具",
      status: context.sections.some((s) => s.type === "tools") ? "loaded" : "not-found",
      tokens: context.sections.find((s) => s.type === "tools")?.chars
        ? Math.round((context.sections.find((s) => s.type === "tools")?.chars || 0) / 4)
        : 0,
      source: context.sections.find((s) => s.type === "tools")?.tool_names?.length
        ? `${context.sections.find((s) => s.type === "tools")!.tool_names!.length} 个工具`
        : "—",
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
