import { useState, useEffect, useMemo } from "react";
import {
  fetchRequestContext,
  fetchRequestDetail,
  type ContextResponse,
  type RequestDetail,
} from "../api/client";
import { fmtK } from "../lib/utils";
import {
  GitFork,
  User,
  Bot,
  Wrench,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  ArrowRightLeft,
} from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

interface Props {
  selectedId: number | null;
}

interface FlowNode {
  id: string;
  type: "user" | "thinking" | "tool_call" | "tool_result" | "response" | "system";
  label: string;
  detail?: string;
  chars: number;
  elapsedMs?: number;
  toolNames?: string[];
  content?: string;
}

function FlowCard({
  node,
  isLast,
}: {
  node: FlowNode;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const icon = (() => {
    switch (node.type) {
      case "user":
        return <User className="w-4 h-4 text-app-accent" />;
      case "thinking":
        return <Bot className="w-4 h-4 text-app-purple" />;
      case "tool_call":
        return <Wrench className="w-4 h-4 text-app-amber" />;
      case "tool_result":
        return <ArrowRightLeft className="w-4 h-4 text-app-green" />;
      case "response":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "system":
        return <FileText className="w-4 h-4 text-app-muted" />;
    }
  })();

  const badgeColor = (() => {
    switch (node.type) {
      case "user":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "thinking":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "tool_call":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "tool_result":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "response":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "system":
        return "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400";
    }
  })();

  const typeLabel = (() => {
    switch (node.type) {
      case "user":
        return "用户输入";
      case "thinking":
        return "思考";
      case "tool_call":
        return "工具调用";
      case "tool_result":
        return "工具结果";
      case "response":
        return "回复";
      case "system":
        return "系统";
    }
  })();

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full border-2 border-app-border dark:border-slate-600 bg-app-card dark:bg-slate-700 flex items-center justify-center">
          {icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-app-border dark:bg-slate-600 my-1" />
        )}
      </div>

      {/* Card */}
      <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
        <div
          className="rounded-lg border border-app-border dark:border-slate-600 bg-app-card dark:bg-slate-700 hover:border-app-accent/20 dark:hover:border-slate-500 transition-colors cursor-pointer"
          onClick={() => node.content && setExpanded(!expanded)}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <span
              className={`text-[12px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}
            >
              {typeLabel}
            </span>
            <span className="text-[13px] font-medium text-app-text dark:text-slate-100 flex-1 truncate">
              {node.label}
            </span>
            <div className="flex items-center gap-3 text-[12px] text-app-muted dark:text-slate-400">
              {node.elapsedMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {node.elapsedMs > 1000
                    ? `${(node.elapsedMs / 1000).toFixed(1)}s`
                    : `${node.elapsedMs}ms`}
                </span>
              )}
              <span className="font-mono">{fmtK(Math.round(node.chars / 4))} tk</span>
              {node.content && (
                <span className="text-app-subtle dark:text-slate-500">
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Tool names */}
          {node.toolNames && node.toolNames.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {node.toolNames.map((name) => (
                <span
                  key={name}
                  className="text-[12px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-app-amber dark:text-amber-300 font-mono"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          {/* Expanded content */}
          {expanded && node.content && (
            <div className="border-t border-app-border dark:border-slate-600 px-4 py-3">
              <pre className="text-[12px] font-mono text-app-muted dark:text-slate-400 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                {node.content.length > 2000
                  ? node.content.slice(0, 2000) + `\n... 还有 ${fmtK(node.content.length - 2000)} 字符`
                  : node.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExecutionFlow({ selectedId }: Props) {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const [ctx, det] = await Promise.all([
        fetchRequestContext(selectedId),
        fetchRequestDetail(selectedId),
      ]);
      setContext(ctx);
      setDetail(det);
    } catch {
      setError("无法加载执行链路数据");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedId]);

  const flowNodes = useMemo<FlowNode[]>(() => {
    if (!context || !detail) return [];

    const nodes: FlowNode[] = [];
    const sections = context.sections;

    // Parse message sections to build flow
    for (const sec of sections) {
      if (sec.type === "system") continue; // Skip system prompts in flow

      const role = sec.role || "";
      const label = sec.label || "";

      if (role === "user" && label.includes("Tool Result")) {
        nodes.push({
          id: `tr-${nodes.length}`,
          type: "tool_result",
          label: "工具结果返回",
          detail: sec.label,
          chars: sec.chars,
          content: sec.content?.length > 500 ? sec.content.slice(0, 500) + "..." : sec.content,
        });
      } else if (role === "user" && label.includes("Recap")) {
        nodes.push({
          id: `recap-${nodes.length}`,
          type: "user",
          label: "复盘请求",
          chars: sec.chars,
        });
      } else if (role === "user") {
        nodes.push({
          id: `user-${nodes.length}`,
          type: "user",
          label: sec.content
            ? sec.content.slice(0, 120).replace(/\n/g, " ") + (sec.content.length > 120 ? "..." : "")
            : "用户消息",
          chars: sec.chars,
          content: sec.content,
        });
      } else if (role === "assistant" && label.includes("Tool Call")) {
        const toolNames = extractToolNames(sec.content);
        nodes.push({
          id: `tc-${nodes.length}`,
          type: "tool_call",
          label: toolNames.length > 0 ? toolNames.join(", ") : "工具调用",
          chars: sec.chars,
          toolNames,
          content: sec.content,
        });
      } else if (role === "assistant") {
        // Add thinking if there's a thinking section
        if (detail.elapsed_ms > 2000) {
          nodes.push({
            id: `think-${nodes.length}`,
            type: "thinking",
            label: `模型思考中... (${detail.elapsed_ms > 1000 ? (detail.elapsed_ms / 1000).toFixed(1) + "s" : detail.elapsed_ms + "ms"})`,
            chars: 0,
            elapsedMs: detail.elapsed_ms,
          });
        }
        nodes.push({
          id: `resp-${nodes.length}`,
          type: "response",
          label: "生成回复",
          chars: sec.chars,
          content: sec.content,
        });
      } else if (role === "system" && label.includes("Agent 类型")) {
        nodes.push({
          id: `sys-${nodes.length}`,
          type: "system",
          label: "Agent & Skills 配置注入",
          chars: sec.chars,
        });
      }
    }

    // If no messages extracted, show summary from breakdown
    if (nodes.length === 0 && context.breakdown) {
      const bd = context.breakdown;
      nodes.push({
        id: "summary",
        type: "user",
        label: `请求 #${selectedId} — ${bd.history_turns} 轮对话, ${bd.tool_names.length} 个工具`,
        chars: context.total_chars,
        elapsedMs: detail.elapsed_ms,
      });
    }

    return nodes;
  }, [context, detail, selectedId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        <div className="text-center">
          <GitFork className="w-8 h-8 mx-auto mb-3 text-app-subtle dark:text-slate-600" />
          <p className="text-[15px] font-medium text-app-text dark:text-slate-100">执行链路</p>
          <p className="text-[12px] mt-1 text-app-muted dark:text-slate-400">选择左侧请求查看执行链路</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ContentSkeleton rows={6} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} variant="fullscreen" />;
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GitFork className="w-5 h-5 text-app-accent" />
        <div>
          <h2 className="text-[15px] font-semibold text-app-text dark:text-slate-100">执行链路</h2>
          <p className="text-[12px] text-app-muted dark:text-slate-400">
            #{detail?.id} · {detail?.model} · {detail?.elapsed_ms}ms ·{" "}
            {detail?.usage?.input_tokens ?? "?"} in / {detail?.usage?.output_tokens ?? "?"} out tokens
          </p>
        </div>
      </div>

      {/* Meta badges */}
      {detail && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          <MetaBadge label="耗时" value={`${detail.elapsed_ms}ms`} />
          <MetaBadge label="状态" value={String(detail.status)} />
          <MetaBadge label="Input Tokens" value={String(detail.usage?.input_tokens ?? "?")} />
          <MetaBadge label="Output Tokens" value={String(detail.usage?.output_tokens ?? "?")} />
        </div>
      )}

      {/* Flow nodes */}
      <div>
        {flowNodes.length === 0 && (
          <div className="text-center py-12 text-app-muted dark:text-slate-400 text-[13px]">
            <ArrowDown className="w-6 h-6 mx-auto mb-2 text-app-subtle dark:text-slate-600" />
            暂无链路数据
          </div>
        )}
        {flowNodes.map((node, i) => (
          <FlowCard
            key={node.id}
            node={node}
            isLast={i === flowNodes.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg">
      <div className="text-[12px] text-app-muted dark:text-slate-400">{label}</div>
      <div className="text-[12px] font-mono font-medium text-app-text dark:text-slate-100 mt-0.5">
        {value}
      </div>
    </div>
  );
}

/** Extract tool names from assistant tool_use content */
function extractToolNames(content: string | undefined): string[] {
  if (!content) return [];
  const names: string[] = [];
  try {
    const parsed = JSON.parse(content);
    const toolUses = Array.isArray(parsed)
      ? parsed.filter((b: Record<string, unknown>) => b.type === "tool_use")
      : parsed.type === "tool_use"
        ? [parsed]
        : [];
    for (const tu of toolUses) {
      if (tu.name) names.push(tu.name);
    }
  } catch {
    // Not JSON, try regex
    const matches = content.matchAll(/"name"\s*:\s*"([^"]+)"/g);
    for (const m of matches) {
      names.push(m[1]);
    }
  }
  return names;
}
