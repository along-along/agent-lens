import { useState, useEffect, useCallback } from "react";
import { fetchRequestDetail, type RequestDetail } from "../api/client";
import { ChevronDown, ChevronRight, Braces, Maximize2, Minimize2, Search, X, ChevronUp, ChevronDown as ChevronDownIcon, Languages } from "lucide-react";
import { ContentSkeleton } from "../components/Skeleton";
import { getAnnotation } from "../data/annotations";

interface Props {
  selectedId: number | null;
}

// ── 预设高亮关键词 ──
const PRESET_TAGS = ["messages", "tools", "usage", "headers", "content"];

// ── JSON 类型着色 ──
const TYPE_COLORS: Record<string, string> = {
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-amber-600 dark:text-amber-400",
  boolean: "text-violet-600 dark:text-violet-400",
  null: "text-app-subtle dark:text-slate-500",
  key: "text-app-accent dark:text-blue-400",
};

// ── 高亮文本渲染 ──
function HighlightedText({ text, keyword, cls }: { text: string; keyword: string; cls: string }) {
  if (!keyword) return <span className={cls + " break-all"}>{text}</span>;

  // 大小写不敏感分割
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  const parts: { text: string; hl: boolean }[] = [];
  let last = 0;

  let idx = lower.indexOf(kw, last);
  while (idx !== -1) {
    if (idx > last) parts.push({ text: text.slice(last, idx), hl: false });
    parts.push({ text: text.slice(idx, idx + kw.length), hl: true });
    last = idx + kw.length;
    idx = lower.indexOf(kw, last);
  }
  if (last < text.length) parts.push({ text: text.slice(last), hl: false });

  return (
    <span className={cls + " break-all"}>
      {parts.map((p, i) =>
        p.hl ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-700 text-inherit rounded-sm px-0.5">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

// ── 高亮 key 名 ──
function HighlightedKey({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword || !text.toLowerCase().includes(keyword.toLowerCase())) {
    return <span className={TYPE_COLORS.key + " shrink-0"}>{text}:&nbsp;</span>;
  }
  return (
    <span className="shrink-0">
      <mark className="bg-amber-200 dark:bg-amber-700 rounded-sm px-0.5">{text}</mark>
      <span className={TYPE_COLORS.key}>:&nbsp;</span>
    </span>
  );
}

function formatVal(v: unknown): { text: string; cls: string } {
  if (v === null) return { text: "null", cls: TYPE_COLORS.null };
  if (v === undefined) return { text: "undefined", cls: TYPE_COLORS.null };
  if (typeof v === "string") return { text: JSON.stringify(v), cls: TYPE_COLORS.string };
  if (typeof v === "number") return { text: String(v), cls: TYPE_COLORS.number };
  if (typeof v === "boolean") return { text: String(v), cls: TYPE_COLORS.boolean };
  return { text: String(v), cls: "" };
}

// ── 递归 JSON 节点 ──
function JsonNode({
  keyName,
  value,
  depth,
  defaultOpen,
  highlight,
  expandVersion,
  expandAllVersion = 0,
  collapseVersion = 0,
  path = [],
  showAnnotations = false,
  compact = false,
}: {
  keyName?: string;
  value: unknown;
  depth: number;
  defaultOpen?: boolean;
  highlight: string;
  expandVersion: number;
  expandAllVersion?: number;
  collapseVersion?: number;
  path?: string[];
  showAnnotations?: boolean;
  compact?: boolean;
}) {
  const isExpandable =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value as object).length > 0
      : Array.isArray(value) && (value as unknown[]).length > 0;

  const [open, setOpen] = useState(defaultOpen ?? depth < 2);
  const [expanded, setExpanded] = useState(false);

  // 展开一层 — 版本号变化时只展开前两层
  useEffect(() => {
    if (expandVersion > 0 && isExpandable && depth < 2) {
      setOpen(true);
    }
  }, [expandVersion, isExpandable, depth]);

  // 展开全部 — 版本号变化时展开所有层
  useEffect(() => {
    if (expandAllVersion > 0 && isExpandable) {
      setOpen(true);
    }
  }, [expandAllVersion, isExpandable]);

  // 收起全部 — 版本号变化时关闭所有子节点
  useEffect(() => {
    if (collapseVersion > 0 && isExpandable) {
      setOpen(false);
    }
  }, [collapseVersion, isExpandable]);

  const annotation = keyName ? getAnnotation(path, keyName.replace(/^\[|\]$/g, ""), value) : null;

  if (!isExpandable) {
    const { text, cls } = formatVal(value);
    const TRUNCATE_LEN = 200;
    // 避免在转义序列中间截断
    let truncLen = TRUNCATE_LEN;
    if (compact && text.length > TRUNCATE_LEN) {
      // 找到 200 字符附近的安全截断点（不在 \ 后面）
      while (truncLen > 180 && text[truncLen - 1] === "\\") truncLen--;
    }
    const shouldTruncate = compact && !expanded && text.length > truncLen;
    const displayText = shouldTruncate ? text.slice(0, truncLen) : text;
    // 含换行的字符串用多行渲染（精简模式截断后也换行）
    const hasNewlines = typeof value === "string" && (value as string).includes("\n");
    const rawText = typeof value === "string" ? (value as string) : text;
    const displayRaw = shouldTruncate ? rawText.slice(0, truncLen) : rawText;
    const renderMultiline = hasNewlines;

    return (
      <div
        className={`font-mono text-[12px] leading-relaxed py-[1px] ${annotation ? "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded" : ""}`}
        style={{ paddingLeft: depth * 16 }}
      >
        <div className="flex items-start">
          {keyName !== undefined && (
            <HighlightedKey text={keyName} keyword={highlight} />
          )}
          <span className="min-w-0">
            {renderMultiline ? (
              <span className={cls + " block whitespace-pre-wrap break-words bg-gray-50/50 dark:bg-slate-800/50 rounded px-2 py-1 mt-0.5 border-l-2 border-app-accent/20 dark:border-blue-500/20"}>
                {displayRaw.split("\n").map((line, i) => (
                  <span key={i} className="block hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                    <span className="inline-block w-8 text-right text-[10px] text-app-subtle/50 dark:text-slate-600 select-none mr-2">{i + 1}</span>
                    {highlight ? <HighlightedText text={line} keyword={highlight} cls="" /> : line}
                  </span>
                ))}
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="block mt-1 text-[11px] text-app-accent dark:text-blue-400 hover:underline"
                  >
                    ...({rawText.length} 字符，点击展开)
                  </button>
                )}
                {compact && expanded && rawText.length > TRUNCATE_LEN && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="block mt-1 text-[11px] text-app-accent dark:text-blue-400 hover:underline"
                  >
                    (收起)
                  </button>
                )}
              </span>
            ) : (
              <>
                <HighlightedText text={displayText} keyword={highlight} cls={cls} />
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="inline ml-1 text-[11px] text-app-accent dark:text-blue-400 hover:underline"
                  >
                    ...({text.length} 字符，点击展开)
                  </button>
                )}
                {compact && expanded && text.length > TRUNCATE_LEN && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="inline ml-1 text-[11px] text-app-accent dark:text-blue-400 hover:underline"
                  >
                    (收起)
                  </button>
                )}
              </>
            )}
          </span>
          {/* 短标注：行尾显示 */}
          {annotation && showAnnotations && annotation.length <= 30 && (
            <span className="ml-3 text-[11px] text-app-accent/70 dark:text-blue-400/60 shrink-0 whitespace-nowrap">
              ← {annotation}
            </span>
          )}
        </div>
        {/* 长标注：换行显示在下方 */}
        {annotation && showAnnotations && annotation.length > 30 && (
          <div className="mt-0.5 text-[11px] text-app-accent/70 dark:text-blue-400/60 leading-snug" style={{ paddingLeft: 12 }}>
            ↳ {annotation}
          </div>
        )}
      </div>
    );
  }

  const isArr = Array.isArray(value);
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const count = entries.length;

  return (
    <div className={depth === 1 ? "mt-0.5" : ""}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-mono text-[12px] leading-relaxed hover:bg-black/[0.03] dark:hover:bg-white/[0.03] rounded w-full text-left py-[1px]"
        style={{ paddingLeft: depth * 16 }}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-app-muted dark:text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-app-muted dark:text-slate-400 shrink-0" />
        )}
        {keyName !== undefined && (
          <HighlightedKey text={keyName} keyword={highlight} />
        )}
        <span className="text-app-subtle dark:text-slate-500 shrink-0">
          {isArr ? `[${count}]` : `{${count}}`}
        </span>
        {!open && (
          <span className="text-app-subtle dark:text-slate-500 text-[11px] ml-1">&hellip;</span>
        )}
        {annotation && showAnnotations && (
          <span className="ml-3 text-[11px] text-app-accent/70 dark:text-blue-400/60 shrink-0 whitespace-nowrap">
            ← {annotation}
          </span>
        )}
      </button>
      {open &&
        entries.map(([k, v]) => (
          <JsonNode
            key={k}
            keyName={isArr ? `[${k}]` : k}
            value={v}
            depth={depth + 1}
            defaultOpen={false}
            highlight={highlight}
            expandVersion={expandVersion}
            expandAllVersion={expandAllVersion}
            collapseVersion={collapseVersion}
            path={[...path, keyName || ""].filter(Boolean)}
            showAnnotations={showAnnotations}
            compact={compact}
          />
        ))}
    </div>
  );
}

// ── Section 折叠面板 ──
function JsonSection({
  title,
  data,
  defaultOpen,
  forceOpen,
  highlight,
  expandVersion,
  expandAllVersion = 0,
  collapseVersion = 0,
  showAnnotations = false,
  compact = false,
}: {
  title: string;
  data: unknown;
  defaultOpen?: boolean;
  forceOpen?: boolean | null;
  highlight: string;
  expandVersion: number;
  expandAllVersion?: number;
  collapseVersion?: number;
  showAnnotations?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  // 外部强制展开/收起 — 一次性，用完就释放
  useEffect(() => {
    if (forceOpen !== null && forceOpen !== undefined) {
      setOpen(forceOpen);
    }
  }, [forceOpen]);

  const text = typeof data === "string" ? data : JSON.stringify(data);
  const chars = text.length;

  return (
    <div className="bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-app-muted dark:text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-app-muted dark:text-slate-400" />
        )}
        <span className="text-[13px] font-semibold text-app-text dark:text-slate-100">{title}</span>
        <span className="text-[11px] text-app-subtle dark:text-slate-500 font-mono ml-auto">
          {chars > 1000 ? `${(chars / 1000).toFixed(1)}k` : chars} 字符
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-app-border/50 dark:border-slate-600/50 overflow-x-auto">
          <div className="pt-2">
            <JsonNode value={data} depth={0} defaultOpen={true} highlight={highlight} expandVersion={expandVersion} expandAllVersion={expandAllVersion} collapseVersion={collapseVersion} path={[title.toLowerCase()]} showAnnotations={showAnnotations} compact={compact} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──
export default function RawData({ selectedId }: Props) {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [highlight, setHighlight] = useState("");
  const [expandVersion, setExpandVersion] = useState(0);
  const [expandAllVersion, setExpandAllVersion] = useState(0);
  const [collapseVersion, setCollapseVersion] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [compact, setCompact] = useState(true);

  // 设定高亮时自动展开全部节点
  useEffect(() => {
    if (highlight) {
      setExpandVersion((v) => v + 1);
      setActiveMatch(0);
    }
  }, [highlight]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setHighlight("");
    setExpandVersion(0);
    fetchRequestDetail(selectedId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [selectedId]);

  // 展开全部 — 递增版本号强制所有节点展开
  const handleForce = useCallback((val: boolean) => {
    if (val) {
      setExpandVersion((v) => v + 1);
    } else {
      setCollapseVersion((v) => v + 1);
    }
    setExpandAll(val);
    setTimeout(() => setExpandAll(null), 0);
  }, []);

  // 高亮导航
  const navigateMatch = useCallback((dir: 1 | -1) => {
    const marks = document.querySelectorAll("mark");
    if (marks.length === 0) return;
    const next = ((activeMatch + dir) % marks.length + marks.length) % marks.length;
    setActiveMatch(next);
    // 滚动放到 useEffect 里等 re-render
    requestAnimationFrame(() => {
      const el = document.querySelectorAll("mark")[next] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [activeMatch]);

  // 每次 re-render 后高亮当前 active mark
  useEffect(() => {
    if (!highlight) return;
    const marks = document.querySelectorAll("mark");
    marks.forEach((m) => m.classList.remove("ring-2", "ring-app-accent", "ring-offset-1"));
    if (marks[activeMatch]) {
      (marks[activeMatch] as HTMLElement).classList.add("ring-2", "ring-app-accent", "ring-offset-1");
    }
  }, [highlight, activeMatch, detail]);

  // 键盘: Ctrl+Shift+↑ 上一个, Ctrl+Shift+↓ 下一个
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        navigateMatch(1);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        navigateMatch(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigateMatch]);

  // 键盘快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "[") {
      e.preventDefault();
      handleForce(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "]") {
      e.preventDefault();
      handleForce(true);
    }
    // Ctrl+F 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      // default browser search is fine, but we can prevent it for ours
      e.preventDefault();
      const input = document.getElementById("raw-search") as HTMLInputElement | null;
      input?.focus();
    }
  }, [handleForce]);

  useEffect(() => {
    if (!selectedId) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, handleKeyDown]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        选择左侧请求查看原始数据
      </div>
    );
  }

  if (loading) {
    return <ContentSkeleton rows={6} />;
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted dark:text-slate-400 text-[13px]">
        加载中...
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      {/* Header + Toolbar — sticky */}
      <div className="sticky top-0 z-10 bg-app-bg dark:bg-slate-900 pb-4 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Braces className="w-5 h-5 text-app-accent dark:text-blue-400" />
          <div>
            <h2 className="text-[15px] font-semibold text-app-text dark:text-slate-100">原始数据</h2>
            <p className="text-[12px] text-app-muted dark:text-slate-400">
              #{detail.id} · {detail.timestamp?.slice(11, 19)} · {detail.model}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[12px] rounded transition-colors ${
              showAnnotations
                ? "text-app-accent dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5"
            }`}
            title="切换中文标注"
          >
            <Languages className="w-3 h-3" />
            标注
          </button>
          <button
            onClick={() => setCompact(!compact)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[12px] rounded transition-colors ${
              compact
                ? "text-app-accent dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5"
            }`}
            title="长文本截断/完整切换"
          >
            {compact ? "精简" : "完整"}
          </button>
          <button
            onClick={() => handleForce(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="展开一层"
          >
            <Maximize2 className="w-3 h-3" />
            展开
          </button>
          <button
            onClick={() => setExpandAllVersion((v) => v + 1)}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="展开全部层级"
          >
            <Maximize2 className="w-3 h-3" />
            全部展开
          </button>
          <button
            onClick={() => handleForce(false)}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="收起全部 (Ctrl+[)"
          >
            <Minimize2 className="w-3 h-3" />
            收起
          </button>
        </div>
      </div>

      {/* Highlight Bar */}
      <div className="flex items-center gap-2 flex-wrap -mb-1">
        <span className="text-[11px] text-app-subtle dark:text-slate-500 shrink-0">高亮:</span>
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setHighlight(highlight === tag ? "" : tag)}
            className={`text-[12px] px-2 py-0.5 rounded font-mono transition-colors ${
              highlight === tag
                ? "bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100"
                : "bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200"
            }`}
          >
            {tag}
          </button>
        ))}
        <span className="text-app-border dark:text-slate-600">|</span>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-app-subtle dark:text-slate-500" />
          <input
            id="raw-search"
            type="text"
            value={highlight && !PRESET_TAGS.includes(highlight) ? highlight : ""}
            onChange={(e) => setHighlight(e.target.value)}
            placeholder="自定义关键词..."
            className="w-36 pl-6 pr-6 py-1 text-[12px] bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded text-app-text dark:text-slate-200 placeholder:text-app-subtle focus:outline-none focus:ring-1 focus:ring-app-accent/30"
          />
          {highlight && !PRESET_TAGS.includes(highlight) && (
            <button
              onClick={() => setHighlight("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-app-subtle dark:text-slate-500 hover:text-app-text"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {highlight && (
          <>
            <span className="text-[11px] text-app-muted dark:text-slate-400">
              <span className="font-mono text-app-accent">{highlight}</span>
            </span>
            <button
              onClick={() => navigateMatch(-1)}
              className="p-0.5 text-app-muted dark:text-slate-400 hover:text-app-text rounded transition-colors"
              title="上一个 (Ctrl+Shift+↑)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigateMatch(1)}
              className="p-0.5 text-app-muted dark:text-slate-400 hover:text-app-text rounded transition-colors"
              title="下一个 (Ctrl+Shift+↓)"
            >
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      </div>

      {/* Body */}
      <div className="mb-4">
        <JsonSection
          title="Request"
          data={detail.request}
          defaultOpen={true}
          forceOpen={expandAll}
          highlight={highlight}
          expandVersion={expandVersion}
          expandAllVersion={expandAllVersion}
          collapseVersion={collapseVersion}
          showAnnotations={showAnnotations}
          compact={compact}
        />
      </div>

      {/* Response */}
      <div className="mb-4">
        <JsonSection
          title="Response"
          data={detail.response}
          defaultOpen={false}
          forceOpen={expandAll}
          highlight={highlight}
          expandVersion={expandVersion}
          expandAllVersion={expandAllVersion}
          collapseVersion={collapseVersion}
          showAnnotations={showAnnotations}
          compact={compact}
        />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <MetaBadge label="耗时" value={`${detail.elapsed_ms}ms`} />
        <MetaBadge label="状态" value={String(detail.status)} />
        <MetaBadge label="Input" value={detail.usage?.input_tokens || "?"} />
        <MetaBadge label="Output" value={detail.usage?.output_tokens || "?"} />
      </div>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded-lg">
      <div className="text-[11px] text-app-muted dark:text-slate-400">{label}</div>
      <div className="text-[12px] font-mono font-medium text-app-text dark:text-slate-100 mt-0.5">
        {value}
      </div>
    </div>
  );
}
