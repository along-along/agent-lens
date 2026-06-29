import { useState, useEffect, useMemo } from "react";
import {
  fetchRequestContext,
  type ContextResponse,
  type ContextSection,
  type ContextBreakdown,
} from "../api/client";
import { fmtK } from "../lib/utils";
import { FileText, ChevronDown, ChevronRight, Minimize2, Maximize2 } from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";

interface Props {
  selectedId: number | null;
}

type TreeNode = {
  key: string;
  label: string;
  tokens?: number;
  isFixed?: boolean;
  source?: string;
  content?: string;
};

const GROUP_META: Record<string, { label: string; icon: string }> = {
  system:   { label: "系统", icon: "⚙️" },
  messages: { label: "消息", icon: "💬" },
  skills:   { label: "技能", icon: "⚡" },
  tools:    { label: "工具", icon: "🔧" },
};

export default function PromptInspector({ selectedId }: Props) {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["system", "messages", "skills", "tools"])
  );

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setSelectedNode(null);
    fetchRequestContext(selectedId)
      .then(setContext)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const tree = useMemo(() => {
    if (!context) return { system: [], messages: [], skills: [], tools: [] } as Record<string, TreeNode[]>;

    const bd = context.breakdown;
    const sections = context.sections;

    // ── 系统 ──
    const systemNodes: TreeNode[] = sections
      .filter((s) => s.type === "system")
      .map((s, i) => ({
        key: `sys-${i}`,
        label: s.label,
        tokens: Math.round(s.chars / 4),
        isFixed: s.is_fixed,
        content: s.content,
      }));

    // ── 消息 ──
    const msgNodes: TreeNode[] = [];

    if (bd.claude_md) {
      msgNodes.push({
        key: "msg-claude-md",
        label: `CLAUDE.md · ${bd.claude_md.path.split(/[/\\]/).pop()}`,
        tokens: Math.round(bd.claude_md.chars / 4),
        content: bd.claude_md.content,
      });
    }

    if (bd.memory) {
      msgNodes.push({
        key: "msg-memory",
        label: `记忆 · ${bd.memory.path.split(/[/\\]/).pop()}`,
        tokens: Math.round(bd.memory.chars / 4),
        content: bd.memory.content,
      });
    }

    bd.rules.forEach((rule) => {
      msgNodes.push({
        key: `msg-rule-${rule.path}`,
        label: `规则 · ${rule.path.split(/[/\\]/).pop()}`,
        tokens: Math.round(rule.chars / 4),
        content: rule.content,
      });
    });

    if (bd.history_turns > 0) {
      msgNodes.push({
        key: "msg-history",
        label: `对话历史 · ${bd.history_turns} 轮`,
      });
    }

    bd.tool_results.forEach((tr) => {
      msgNodes.push({
        key: `msg-tr-${tr.tool_use_id}`,
        label: `工具结果 · ${tr.tool_use_id.slice(0, 8)}`,
        content: tr.preview,
      });
    });

    // ── 技能 ──
    const skillNodes: TreeNode[] = bd.skills.map((s) => ({
      key: `skill-${s.name}`,
      label: s.name,
      content: s.description || undefined,
    }));

    // ── 工具 ──
    const toolsNodes: TreeNode[] = [];
    if (bd.tool_names.length > 0) {
      const toolsSection = sections.find((s) => s.type === "tools");
      let toolDefs: Record<string, unknown>[] = [];
      if (toolsSection?.content) {
        try {
          toolDefs = JSON.parse(toolsSection.content);
        } catch {}
      }
      bd.tool_names.forEach((name) => {
        const def = toolDefs.find((t: Record<string, unknown>) => t.name === name);
        toolsNodes.push({
          key: `tool-${name}`,
          label: name,
          content: def ? JSON.stringify(def, null, 2) : undefined,
        });
      });
    }

    return {
      system: systemNodes,
      messages: msgNodes,
      skills: skillNodes,
      tools: toolsNodes,
    };
  }, [context]);

  const formatContent = (raw: string): { text: string; isJson: boolean } => {
    try {
      const parsed = JSON.parse(raw);
      return { text: JSON.stringify(parsed, null, 2), isJson: true };
    } catch {
      return { text: raw, isJson: false };
    }
  };

  const renderContent = (content: string | undefined) => {
    if (!content) return null;

    const { text, isJson } = formatContent(content);
    const lines = text.split("\n");
    const limit = collapsed ? 50 : lines.length;
    const visible = lines.slice(0, limit);
    const hidden = lines.length - limit;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-semibold text-app-muted dark:text-slate-400 uppercase tracking-wider">
            内容 {isJson && <span className="text-app-accent dark:text-blue-400">· JSON</span>}
          </h3>
          {lines.length > 50 && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-1 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 transition-colors"
            >
              {collapsed ? (
                <><Maximize2 className="w-3 h-3" /> 展开全部（{lines.length} 行）</>
              ) : (
                <><Minimize2 className="w-3 h-3" /> 收起</>
              )}
            </button>
          )}
        </div>
        <div className="bg-[#fafaf9] dark:bg-slate-800 border border-app-border dark:border-slate-600 rounded-md overflow-auto max-h-[60vh]">
          <table className="w-full text-[12px] leading-relaxed font-mono">
            <tbody>
              {visible.map((line, i) => (
                <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20">
                  <td className="line-number py-px select-none w-[3.5rem] align-top">{i + 1}</td>
                  <td className="py-px pr-3 text-app-text dark:text-slate-300 whitespace-pre-wrap break-words overflow-hidden">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <div className="px-4 py-2 text-[12px] text-app-muted dark:text-slate-400 border-t border-app-border dark:border-slate-600 bg-gray-50 dark:bg-slate-900">
              ... 还有 {hidden} 行（{fmtK(text.length)} 字符）
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        选择左侧请求查看提示词组成
      </div>
    );
  }

  if (loading) {
    return <ContentSkeleton rows={8} />;
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: Tree */}
      <div className="w-64 min-w-[200px] shrink-0 border-r border-app-border dark:border-slate-700 overflow-y-auto bg-app-sidebar/50 dark:bg-slate-800/50">
        {(Object.keys(tree) as (keyof typeof tree)[]).map((group) => {
          const nodes = tree[group];
          if (nodes.length === 0) return null;
          const meta = GROUP_META[group] || { label: group, icon: "" };
          const isExpanded = expandedGroups.has(group);

          return (
            <div key={group} className="mb-1">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-app-text dark:text-slate-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-app-muted dark:text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-app-muted dark:text-slate-400 shrink-0" />
                )}
                <span className="text-[13px]">{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-[11px] text-app-subtle dark:text-slate-500 font-normal ml-auto">
                  {nodes.length}
                </span>
              </button>
              {isExpanded && (
                <div>
                  {nodes.map((node) => (
                    <button
                      key={node.key}
                      onClick={() => setSelectedNode(node)}
                      className={`w-full flex items-center gap-1.5 pl-9 pr-3 py-1.5 text-[13px] transition-colors text-left ${
                        selectedNode?.key === node.key
                          ? "bg-blue-50 dark:bg-blue-900/20 text-app-accent dark:text-blue-400 font-medium"
                          : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="shrink-0 text-app-subtle dark:text-slate-500 text-[11px]">
                        {node.isFixed ? "●" : "○"}
                      </span>
                      <span className="flex-1 truncate">{node.label}</span>
                      {node.tokens !== undefined && (
                        <span className="text-[11px] text-app-subtle dark:text-slate-500 font-mono shrink-0">
                          {fmtK(node.tokens)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-app-bg dark:bg-slate-900">
        {selectedNode ? (
          <div>
            <div className="mb-6">
              <h2 className="text-[16px] font-semibold text-app-text dark:text-slate-100 mb-3">
                {selectedNode.label}
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                {selectedNode.tokens !== undefined && (
                  <div className="px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
                    <div className="text-app-muted dark:text-slate-400 text-[12px]">Tokens</div>
                    <div className="font-mono text-app-text dark:text-slate-100 font-medium mt-0.5">
                      ~{fmtK(selectedNode.tokens)}
                    </div>
                  </div>
                )}
                {selectedNode.content && (
                  <div className="px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
                    <div className="text-app-muted dark:text-slate-400 text-[12px]">字符</div>
                    <div className="font-mono text-app-text dark:text-slate-100 font-medium mt-0.5">
                      {fmtK(selectedNode.content.length)}
                    </div>
                  </div>
                )}
                {selectedNode.source && (
                  <div className="px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600 col-span-2">
                    <div className="text-app-muted dark:text-slate-400 text-[12px]">来源</div>
                    <div className="font-mono text-app-text dark:text-slate-100 font-medium text-[12px] truncate mt-0.5">
                      {selectedNode.source}
                    </div>
                  </div>
                )}
                {selectedNode.isFixed && (
                  <div className="mt-1 text-[12px] text-app-muted dark:text-slate-400 col-span-2">
                    此内容为固定模板，每次请求均包含
                  </div>
                )}
              </div>
            </div>

            {renderContent(selectedNode.content)}

            {!selectedNode.content && (
              <div className="flex items-center justify-center py-16 text-app-muted dark:text-slate-400 text-[13px]">
                <div className="text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-app-subtle dark:text-slate-600" />
                  此节点无详细内容
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
            <div className="text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-app-subtle dark:text-slate-600" />
              点击左侧节点查看提示词内容
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
