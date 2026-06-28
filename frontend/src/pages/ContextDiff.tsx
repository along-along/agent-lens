import { useState, useEffect, useMemo } from "react";
import {
  fetchRequestContext,
  fetchRequests,
  type ContextResponse,
  type RequestSummary,
} from "../api/client";
import { fmtK } from "../lib/utils";
import { Plus, Minus, Pencil, Scissors, GitCompare, CheckCircle, ChevronDown, Wrench, Brain } from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";

interface Props {
  selectedId: number | null;
}

const BAR_COLORS = ["bg-app-accent", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500"];

export default function ContextDiff({ selectedId }: Props) {
  const [currentCtx, setCurrentCtx] = useState<ContextResponse | null>(null);
  const [prevCtx, setPrevCtx] = useState<ContextResponse | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchRequests().then((d) => setRequests(d.requests)); }, []);

  useEffect(() => {
    if (!selectedId || requests.length === 0) return;
    const sorted = [...requests].sort((a, b) => a.id - b.id);
    const idx = sorted.findIndex((r) => r.id === selectedId);
    setTargetId(idx > 0 ? sorted[idx - 1].id : null);
  }, [selectedId, requests]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetchRequestContext(selectedId).then(setCurrentCtx).finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (targetId === null) { setPrevCtx(null); return; }
    fetchRequestContext(targetId).then(setPrevCtx);
  }, [targetId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        选择左侧请求查看上下文变化
      </div>
    );
  }

  // ⚠️ All hooks MUST be called before any conditional return

  // ── 统计 ──
  const stats = useMemo(() => {
    if (!currentCtx || !prevCtx) return { tokenDelta: 0, turnDelta: 0, toolCallDelta: 0, thinkingDelta: 0 };
    return {
      tokenDelta: currentCtx.total_tokens_estimate - prevCtx.total_tokens_estimate,
      turnDelta: currentCtx.breakdown.history_turns - prevCtx.breakdown.history_turns,
      toolCallDelta: currentCtx.breakdown.tool_calls.length - prevCtx.breakdown.tool_calls.length,
      thinkingDelta: currentCtx.breakdown.thinking_count - prevCtx.breakdown.thinking_count,
    };
  }, [currentCtx, prevCtx]);

  const { tokenDelta, turnDelta, toolCallDelta, thinkingDelta } = stats;

  const newSections = useMemo(() => {
    if (!currentCtx || !prevCtx) return [];
    const prevLabels = new Set(prevCtx.sections.map((s) => s.label));
    return currentCtx.sections.filter((s) => !prevLabels.has(s.label));
  }, [currentCtx, prevCtx]);

  const newToolCalls = useMemo(() => {
    if (!currentCtx) return [];
    if (!prevCtx) return currentCtx.breakdown.tool_calls;
    const pb = prevCtx.breakdown;
    const cb = currentCtx.breakdown;
    const prevIds = new Set(pb.tool_calls.map((t) => t.tool_use_id));
    return cb.tool_calls.filter((t) => !prevIds.has(t.tool_use_id));
  }, [currentCtx, prevCtx]);

  const configChanges = useMemo(() => {
    const changes: { icon: React.ReactNode; label: string; detail: string }[] = [];
    if (!currentCtx || !prevCtx) return changes;
    const cb = currentCtx.breakdown;
    const pb = prevCtx.breakdown;

    if (cb.claude_md && !pb.claude_md) changes.push({ icon: <Plus className="w-3.5 h-3.5 text-app-green" />, label: "CLAUDE.md 新增", detail: cb.claude_md.path.split(/[/\\]/).pop() || "" });
    else if (!cb.claude_md && pb.claude_md) changes.push({ icon: <Minus className="w-3.5 h-3.5 text-app-red" />, label: "CLAUDE.md 移除", detail: pb.claude_md.path.split(/[/\\]/).pop() || "" });
    else if (cb.claude_md && pb.claude_md && cb.claude_md.content !== pb.claude_md.content) changes.push({ icon: <Pencil className="w-3.5 h-3.5 text-app-amber" />, label: "CLAUDE.md 修改", detail: `${fmtK(Math.round(pb.claude_md.chars/4))} → ${fmtK(Math.round(cb.claude_md.chars/4))} tokens` });

    if (cb.memory && !pb.memory) changes.push({ icon: <Plus className="w-3.5 h-3.5 text-app-green" />, label: "记忆 新增", detail: cb.memory.path.split(/[/\\]/).pop() || "" });
    else if (!cb.memory && pb.memory) changes.push({ icon: <Minus className="w-3.5 h-3.5 text-app-red" />, label: "记忆 移除", detail: pb.memory.path.split(/[/\\]/).pop() || "" });
    else if (cb.memory && pb.memory && cb.memory.content !== pb.memory.content) changes.push({ icon: <Pencil className="w-3.5 h-3.5 text-app-amber" />, label: "记忆 修改", detail: `${fmtK(Math.round(pb.memory.chars/4))} → ${fmtK(Math.round(cb.memory.chars/4))} tokens` });

    const prevSkills = new Set(pb.skills.map((s) => s.name));
    const currSkills = new Set(cb.skills.map((s) => s.name));
    cb.skills.filter((s) => !prevSkills.has(s.name)).forEach((s) => changes.push({ icon: <Plus className="w-3.5 h-3.5 text-app-green" />, label: "技能 新增", detail: s.name }));
    pb.skills.filter((s) => !currSkills.has(s.name)).forEach((s) => changes.push({ icon: <Minus className="w-3.5 h-3.5 text-app-red" />, label: "技能 移除", detail: s.name }));

    const prevRules = new Set(pb.rules.map((r) => r.path));
    cb.rules.filter((r) => !prevRules.has(r.path)).forEach((r) => changes.push({ icon: <Plus className="w-3.5 h-3.5 text-app-green" />, label: "规则 新增", detail: r.path.split(/[/\\]/).pop() || "" }));
    pb.rules.filter((r) => !prevRules.has(r.path)).forEach((r) => changes.push({ icon: <Minus className="w-3.5 h-3.5 text-app-red" />, label: "规则 移除", detail: r.path.split(/[/\\]/).pop() || "" }));

    if (cb.history_turns !== pb.history_turns) changes.push({ icon: <Pencil className="w-3.5 h-3.5 text-app-amber" />, label: "对话轮数", detail: `${pb.history_turns} → ${cb.history_turns} 轮` });
    if (tokenDelta > 500) changes.push({ icon: <Pencil className="w-3.5 h-3.5 text-app-amber" />, label: "上下文增长", detail: `+${fmtK(tokenDelta)} tokens` });
    else if (tokenDelta < -500) changes.push({ icon: <Scissors className="w-3.5 h-3.5 text-orange-500" />, label: "上下文缩减", detail: `${fmtK(Math.abs(tokenDelta))} tokens` });

    return changes;
  }, [currentCtx, prevCtx, tokenDelta]);

  const barData = useMemo(() => {
    const make = (ctx: ContextResponse) => ctx.sections.map((s, i) => ({
      label: s.label.length > 25 ? s.label.slice(0, 25) + "…" : s.label,
      chars: s.chars,
      pct: ctx.total_chars > 0 ? (s.chars / ctx.total_chars) * 100 : 0,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
    return { prev: prevCtx ? make(prevCtx) : [], cur: currentCtx ? make(currentCtx) : [] };
  }, [currentCtx, prevCtx]);

  const sortedRequests = useMemo(() => [...requests].sort((a, b) => b.id - a.id), [requests]);

  // ⚠️ Conditional returns only AFTER all hooks
  if (loading || !currentCtx) return <ContentSkeleton rows={5} />;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GitCompare className="w-5 h-5 text-app-accent dark:text-blue-400" />
        <div>
          <h2 className="text-[15px] font-semibold text-app-text dark:text-slate-100">上下文对比</h2>
          <p className="text-[12px] text-app-muted dark:text-slate-400">
            #{String(currentCtx.breakdown.model_params?.model || selectedId)} vs {prevCtx ? `#${targetId}` : "—"}
          </p>
        </div>
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
            {sortedRequests.filter((r) => r.id !== selectedId).map((r) => (
              <option key={r.id} value={r.id}>#{r.id} — {r.timestamp?.slice(11, 19)} — {r.preview?.slice(0, 40) || r.model}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted dark:text-slate-400 pointer-events-none" />
        </div>
      </div>

      {!prevCtx && (
        <div className="flex items-center justify-center py-16 text-app-muted dark:text-slate-400 text-[13px]">
          <div className="text-center">
            <GitCompare className="w-6 h-6 mx-auto mb-2 text-app-subtle dark:text-slate-600" />
            当前请求为第一个请求，无可对比的上一请求
          </div>
        </div>
      )}

      {prevCtx && (
        <>
          {/* ─── 总览卡 ─── */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <StatCard label="Tokens" value={`${fmtK(currentCtx.total_tokens_estimate)}`} delta={tokenDelta} />
            <StatCard label="对话轮数" value={`${currentCtx.breakdown.history_turns} 轮`} delta={turnDelta} />
            <StatCard label="工具调用" value={`${currentCtx.breakdown.tool_calls.length} 次`} delta={toolCallDelta} />
            <StatCard label="思考" value={`${currentCtx.breakdown.thinking_count} 次`} delta={thinkingDelta} zeroNeutral />
          </div>

          {/* ─── 新增内容 ─── */}
          {(newSections.length > 0 || newToolCalls.length > 0) && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">新增内容</h3>
              <div className="space-y-1.5">
                {newSections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Plus className="w-3.5 h-3.5 text-app-green shrink-0" />
                    <span className="text-[12px] text-app-text dark:text-slate-200 truncate">{s.label}</span>
                    <span className="text-[11px] text-app-muted dark:text-slate-400 font-mono ml-auto shrink-0">+{fmtK(Math.round(s.chars / 4))}</span>
                  </div>
                ))}
                {newToolCalls.map((t, i) => (
                  <div key={`tc-${i}`} className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Wrench className="w-3.5 h-3.5 text-app-green shrink-0" />
                    <span className="text-[12px] text-app-text dark:text-slate-200">{t.name}</span>
                    <span className="text-[10px] text-app-muted dark:text-slate-400 font-mono truncate ml-2">{t.input_preview?.slice(0, 60)}</span>
                  </div>
                ))}
                {thinkingDelta > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Brain className="w-3.5 h-3.5 text-app-green shrink-0" />
                    <span className="text-[12px] text-app-text dark:text-slate-200">思考过程</span>
                    <span className="text-[11px] text-app-muted dark:text-slate-400 ml-auto shrink-0">+{thinkingDelta} 段</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── 配置变化 ─── */}
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">
              配置变化 {configChanges.length === 0 && <span className="text-app-muted dark:text-slate-400 font-normal text-[12px]">— 无变化</span>}
            </h3>
            {configChanges.length > 0 && (
              <div className="space-y-1.5">
                {configChanges.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg">
                    {c.icon}
                    <span className="text-[12px] text-app-text dark:text-slate-200">{c.label}</span>
                    <span className="text-[11px] text-app-muted dark:text-slate-400 ml-auto">{c.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── 上下文占用对比 ─── */}
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold mb-3 text-app-text dark:text-slate-100">上下文占用对比</h3>
            {/* Previous bar */}
            <div className="mb-2">
              <div className="text-[10px] text-app-muted dark:text-slate-500 mb-1">对比目标 #{targetId} · {fmtK(prevCtx.total_tokens_estimate)} tokens</div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                {barData.prev.map((b, i) => (
                  <div key={i} className={b.color} style={{ width: `${Math.max(b.pct, 0.5)}%` }} title={`${b.label}: ${fmtK(Math.round(b.chars/4))}`} />
                ))}
              </div>
            </div>
            {/* Current bar */}
            <div>
              <div className="text-[10px] text-app-muted dark:text-slate-500 mb-1">当前请求 #{selectedId} · {fmtK(currentCtx.total_tokens_estimate)} tokens {tokenDelta !== 0 && <span className={tokenDelta > 0 ? "text-app-amber" : "text-app-green"}>({tokenDelta > 0 ? "+" : ""}{fmtK(tokenDelta)})</span>}</div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                {barData.cur.map((b, i) => (
                  <div key={i} className={b.color} style={{ width: `${Math.max(b.pct, 0.5)}%` }} title={`${b.label}: ${fmtK(Math.round(b.chars/4))}`} />
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {barData.cur.slice(0, 8).map((b, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] text-app-muted dark:text-slate-500">
                  <span className={`w-2 h-2 rounded-sm ${b.color}`} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* ─── 无变化提示 ─── */}
          {newSections.length === 0 && newToolCalls.length === 0 && configChanges.length === 0 && tokenDelta === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-app-card dark:bg-slate-700 rounded-lg border border-app-border dark:border-slate-600 text-[13px] text-app-muted dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-app-green" />
              上下文与对比目标完全一致
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, delta, zeroNeutral }: { label: string; value: string; delta: number; zeroNeutral?: boolean }) {
  const deltaCls = delta > 0 ? "text-app-amber" : delta < 0 ? "text-app-green" : zeroNeutral ? "text-app-muted" : "text-app-amber";
  return (
    <div className="px-3 py-2.5 bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg">
      <div className="text-[11px] text-app-muted dark:text-slate-400">{label}</div>
      <div className="text-[14px] font-semibold text-app-text dark:text-slate-100 mt-0.5">{value}</div>
      <div className={`text-[11px] font-mono ${deltaCls}`}>{delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "·"}</div>
    </div>
  );
}
