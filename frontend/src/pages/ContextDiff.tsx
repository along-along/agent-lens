import { useState, useEffect, useMemo } from "react";
import {
  fetchRequestContext,
  fetchRequests,
  type ContextResponse,
  type ContextSection,
  type RequestSummary,
} from "../api/client";
import { fmtK } from "../lib/utils";
import { Plus, Minus, Pencil, Scissors, GitCompare, CheckCircle, ChevronDown } from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";

interface Props {
  selectedId: number | null;
}

interface DiffItem {
  type: "added" | "removed" | "modified" | "truncated";
  label: string;
  detail: string;
}

interface SectionDiff {
  label: string;
  type: string;
  currentChars: number;
  prevChars: number;
  delta: number;
}

export default function ContextDiff({ selectedId }: Props) {
  const [currentCtx, setCurrentCtx] = useState<ContextResponse | null>(null);
  const [prevCtx, setPrevCtx] = useState<ContextResponse | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Load request list
  useEffect(() => {
    fetchRequests().then((d) => setRequests(d.requests));
  }, []);

  // Auto-set target to previous request when selectedId changes
  useEffect(() => {
    if (!selectedId || requests.length === 0) return;
    const sorted = [...requests].sort((a, b) => a.id - b.id);
    const currentIndex = sorted.findIndex((r) => r.id === selectedId);
    if (currentIndex > 0) {
      setTargetId(sorted[currentIndex - 1].id);
    } else {
      setTargetId(null);
    }
  }, [selectedId, requests]);

  // Load current context
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetchRequestContext(selectedId)
      .then(setCurrentCtx)
      .finally(() => setLoading(false));
  }, [selectedId]);

  // Load target context
  useEffect(() => {
    if (targetId === null) {
      setPrevCtx(null);
      return;
    }
    fetchRequestContext(targetId).then(setPrevCtx);
  }, [targetId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        选择左侧请求查看上下文变化
      </div>
    );
  }

  if (loading || !currentCtx) {
    return <ContentSkeleton rows={5} />;
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

  // Compute section-level deltas
  const sectionDiffs = useMemo<SectionDiff[]>(() => {
    if (!prevCtx || !currentCtx) return [];

    const currSections = currentCtx.sections;
    const prevSections = prevCtx.sections;

    // Match sections by label prefix
    const diffs: SectionDiff[] = [];
    const matchedPrev = new Set<number>();

    for (const cs of currSections) {
      // Find best match in prev
      const prevIdx = prevSections.findIndex(
        (ps, i) => !matchedPrev.has(i) && ps.type === cs.type && ps.label === cs.label
      );
      const prevChars = prevIdx >= 0 ? prevSections[prevIdx].chars : 0;
      if (prevIdx >= 0) matchedPrev.add(prevIdx);
      diffs.push({
        label: cs.label,
        type: cs.type,
        currentChars: cs.chars,
        prevChars,
        delta: cs.chars - prevChars,
      });
    }

    // Add removed sections
    for (let i = 0; i < prevSections.length; i++) {
      if (!matchedPrev.has(i)) {
        diffs.push({
          label: prevSections[i].label,
          type: prevSections[i].type,
          currentChars: 0,
          prevChars: prevSections[i].chars,
          delta: -prevSections[i].chars,
        });
      }
    }

    return diffs.filter((d) => Math.abs(d.delta) > 10); // Filter noise
  }, [currentCtx, prevCtx]);

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
      case "added": return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "removed": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "modified": return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "truncated": return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    }
  };

  // Sorted requests for dropdown (newest first)
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => b.id - a.id),
    [requests]
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold mb-1 text-app-text dark:text-slate-100">上下文对比</h2>
        <p className="text-[12px] text-app-muted dark:text-slate-400">
          当前请求 #{selectedId} vs 对比目标
        </p>
      </div>

      {/* Target selector */}
      <div className="mb-6">
        <label className="text-[12px] text-app-muted dark:text-slate-400 block mb-1.5">对比目标</label>
        <div className="relative">
          <select
            value={targetId ?? ""}
            onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
            className="w-full appearance-none px-3 py-2 pr-8 text-[13px] bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg text-app-text dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-app-accent/30 cursor-pointer"
          >
            <option value="">自动（上一请求）</option>
            {sortedRequests
              .filter((r) => r.id !== selectedId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.timestamp?.slice(11, 19)} — {r.preview?.slice(0, 40) || r.model}
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted dark:text-slate-400 pointer-events-none" />
        </div>
      </div>

      {!prevCtx && (
        <div className="flex items-center justify-center py-16 text-app-muted dark:text-slate-400 text-[13px]">
          <div className="text-center">
            <GitCompare className="w-6 h-6 mx-auto mb-2 text-app-subtle dark:text-slate-600" />
            当前请求为第一个请求，无可对比的上一个请求
          </div>
        </div>
      )}

      {prevCtx && diff.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600 text-[13px] text-app-muted dark:text-slate-400">
          <CheckCircle className="w-4 h-4 text-app-green" />
          无变化 — 上下文与对比目标一致
        </div>
      )}

      {prevCtx && diff.length > 0 && (
        <div className="space-y-2">
          {diff.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${diffBg(item.type)}`}>
              <div className="mt-0.5">{diffIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-app-text dark:text-slate-100">{item.label}</div>
                <div className="text-[12px] text-app-muted dark:text-slate-400 mt-0.5">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {prevCtx && (
        <>
          {/* Token & Turn Summary */}
          <div className="mt-6 grid grid-cols-2 gap-2 text-[12px]">
            <div className="px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
              <div className="text-app-muted dark:text-slate-400 text-[12px]">总 Tokens 变化</div>
              <div className="font-mono text-app-text dark:text-slate-100 font-medium mt-0.5">
                {fmtK(prevCtx.total_tokens_estimate)} → {fmtK(currentCtx.total_tokens_estimate)}
                <span className={`ml-2 text-[12px] ${currentCtx.total_tokens_estimate - prevCtx.total_tokens_estimate >= 0 ? "text-app-amber" : "text-app-green"}`}>
                  ({currentCtx.total_tokens_estimate - prevCtx.total_tokens_estimate >= 0 ? "+" : ""}
                  {fmtK(currentCtx.total_tokens_estimate - prevCtx.total_tokens_estimate)})
                </span>
              </div>
            </div>
            <div className="px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600">
              <div className="text-app-muted dark:text-slate-400 text-[12px]">对话轮数</div>
              <div className="font-mono text-app-text dark:text-slate-100 font-medium mt-0.5">
                {prevCtx.breakdown.history_turns} → {currentCtx.breakdown.history_turns} 轮
              </div>
            </div>
          </div>

          {/* Section-level char diff */}
          {sectionDiffs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">
                Sections 字符变化
              </h3>
              <div className="space-y-1">
                {sectionDiffs.map((sd, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          sd.type === "system"
                            ? "bg-gray-400"
                            : sd.type === "message"
                            ? "bg-app-accent"
                            : "bg-app-purple"
                        }`}
                      />
                      <span className="text-app-muted dark:text-slate-400 truncate">{sd.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-app-subtle dark:text-slate-500">
                        {fmtK(sd.prevChars)} → {fmtK(sd.currentChars)}
                      </span>
                      <span
                        className={`${
                          sd.delta > 0
                            ? "text-app-amber dark:text-amber-400"
                            : sd.delta < 0
                            ? "text-app-green dark:text-green-400"
                            : "text-app-muted dark:text-slate-400"
                        }`}
                      >
                        {sd.delta > 0 ? "+" : ""}
                        {fmtK(sd.delta)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
