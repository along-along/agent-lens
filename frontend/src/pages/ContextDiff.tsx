import { useState, useEffect } from "react";
import {
  fetchRequestContext,
  fetchRequests,
  type ContextResponse,
  type RequestSummary,
} from "../api/client";
import { fmtK } from "../lib/utils";
import { Plus, Minus, Pencil, Scissors, GitCompare, CheckCircle } from "lucide-react";

interface Props {
  selectedId: number | null;
}

interface DiffItem {
  type: "added" | "removed" | "modified" | "truncated";
  label: string;
  detail: string;
}

export default function ContextDiff({ selectedId }: Props) {
  const [currentCtx, setCurrentCtx] = useState<ContextResponse | null>(null);
  const [prevCtx, setPrevCtx] = useState<ContextResponse | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);

  useEffect(() => {
    fetchRequests().then((d) => setRequests(d.requests));
  }, []);

  useEffect(() => {
    if (!selectedId || requests.length === 0) return;
    fetchRequestContext(selectedId).then(setCurrentCtx);
    const sorted = [...requests].sort((a, b) => a.id - b.id);
    const currentIndex = sorted.findIndex((r) => r.id === selectedId);
    if (currentIndex > 0) {
      fetchRequestContext(sorted[currentIndex - 1].id).then(setPrevCtx);
    } else {
      setPrevCtx(null);
    }
  }, [selectedId, requests]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        选择左侧请求查看上下文变化
      </div>
    );
  }

  if (!currentCtx) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        加载中...
      </div>
    );
  }

  const computeDiff = (): DiffItem[] => {
    if (!prevCtx) return [];
    const diff: DiffItem[] = [];
    const currBd = currentCtx.breakdown;
    const prevBd = prevCtx.breakdown;

    // CLAUDE.md
    if (currBd.claude_md && !prevBd.claude_md) {
      diff.push({ type: "added", label: "+ CLAUDE.md", detail: currBd.claude_md.path.split(/[/\\]/).pop() || "" });
    } else if (!currBd.claude_md && prevBd.claude_md) {
      diff.push({ type: "removed", label: "- CLAUDE.md", detail: prevBd.claude_md.path.split(/[/\\]/).pop() || "" });
    } else if (currBd.claude_md && prevBd.claude_md && currBd.claude_md.content !== prevBd.claude_md.content) {
      diff.push({ type: "modified", label: "~ CLAUDE.md 内容变化", detail: `${fmtK(Math.round(prevBd.claude_md.chars / 4))} → ${fmtK(Math.round(currBd.claude_md.chars / 4))} tokens` });
    }

    // Memory
    if (currBd.memory && !prevBd.memory) {
      diff.push({ type: "added", label: "+ 记忆", detail: currBd.memory.path.split(/[/\\]/).pop() || "" });
    } else if (!currBd.memory && prevBd.memory) {
      diff.push({ type: "removed", label: "- 记忆", detail: prevBd.memory.path.split(/[/\\]/).pop() || "" });
    } else if (currBd.memory && prevBd.memory && currBd.memory.content !== prevBd.memory.content) {
      diff.push({ type: "modified", label: "~ 记忆内容变化", detail: `${fmtK(Math.round(prevBd.memory.chars / 4))} → ${fmtK(Math.round(currBd.memory.chars / 4))} tokens` });
    }

    // Skills
    const newSkills = currBd.skills.filter((s) => !prevBd.skills.includes(s));
    const removedSkills = prevBd.skills.filter((s) => !currBd.skills.includes(s));
    newSkills.forEach((s) => diff.push({ type: "added", label: "+ 技能", detail: s }));
    removedSkills.forEach((s) => diff.push({ type: "removed", label: "- 技能", detail: s }));

    // Rules
    const currPaths = currBd.rules.map((r) => r.path);
    const prevPaths = prevBd.rules.map((r) => r.path);
    currBd.rules.filter((r) => !prevPaths.includes(r.path)).forEach((r) =>
      diff.push({ type: "added", label: "+ 规则", detail: r.path.split(/[/\\]/).pop() || "" })
    );
    prevBd.rules.filter((r) => !currPaths.includes(r.path)).forEach((r) =>
      diff.push({ type: "removed", label: "- 规则", detail: r.path.split(/[/\\]/).pop() || "" })
    );

    // Context size
    const tokensDelta = currentCtx.total_tokens_estimate - prevCtx.total_tokens_estimate;
    if (tokensDelta > 1000) {
      diff.push({ type: "modified", label: "~ 上下文增长", detail: `+${fmtK(tokensDelta)} tokens` });
    } else if (tokensDelta < -1000) {
      diff.push({ type: "truncated", label: "✂ 上下文缩减", detail: `${fmtK(Math.abs(tokensDelta))} tokens 被移除` });
    }

    // History turns
    if (currBd.history_turns !== prevBd.history_turns) {
      const delta = currBd.history_turns - prevBd.history_turns;
      diff.push({ type: "modified", label: "~ 对话轮数", detail: `${prevBd.history_turns} → ${currBd.history_turns} 轮 (${delta >= 0 ? "+" : ""}${delta})` });
    }

    return diff;
  };

  const diff = computeDiff();

  const diffIcon = (type: string) => {
    switch (type) {
      case "added": return <Plus className="w-3.5 h-3.5 text-app-green" />;
      case "removed": return <Minus className="w-3.5 h-3.5 text-app-red" />;
      case "modified": return <Pencil className="w-3.5 h-3.5 text-app-amber" />;
      case "truncated": return <Scissors className="w-3.5 h-3.5 text-orange-500" />;
    }
  };

  const diffBg = (type: string) => {
    switch (type) {
      case "added": return "bg-green-50 border-green-200";
      case "removed": return "bg-red-50 border-red-200";
      case "modified": return "bg-amber-50 border-amber-200";
      case "truncated": return "bg-orange-50 border-orange-200";
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold mb-1 text-app-text">上下文对比</h2>
        <p className="text-[12px] text-app-muted">当前请求 vs 上一请求</p>
      </div>

      {!prevCtx && (
        <div className="flex items-center justify-center py-16 text-app-muted text-[13px]">
          <div className="text-center">
            <GitCompare className="w-6 h-6 mx-auto mb-2 text-app-subtle" />
            没有上一请求，当前请求为该会话第一个请求
          </div>
        </div>
      )}

      {prevCtx && diff.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-app-card rounded-lg border border-app-border text-[13px] text-app-muted">
          <CheckCircle className="w-4 h-4 text-app-green" />
          无变化 — 上下文与上一请求一致
        </div>
      )}

      {prevCtx && diff.length > 0 && (
        <div className="space-y-2">
          {diff.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${diffBg(item.type)}`}>
              <div className="mt-0.5">{diffIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-app-text">{item.label}</div>
                <div className="text-[12px] text-app-muted mt-0.5">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {prevCtx && (
        <div className="mt-6 grid grid-cols-2 gap-2 text-[12px]">
          <div className="px-3 py-2 bg-app-card rounded-lg border border-app-border">
            <div className="text-app-muted text-[11px]">总 Tokens 变化</div>
            <div className="font-mono text-app-text font-medium mt-0.5">
              {fmtK(prevCtx.total_tokens_estimate)} → {fmtK(currentCtx.total_tokens_estimate)}
            </div>
          </div>
          <div className="px-3 py-2 bg-app-card rounded-lg border border-app-border">
            <div className="text-app-muted text-[11px]">对话轮数</div>
            <div className="font-mono text-app-text font-medium mt-0.5">
              {prevCtx.breakdown.history_turns} → {currentCtx.breakdown.history_turns} 轮
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
