import { useState, useEffect } from "react";
import { fetchRequestDetail, type RequestDetail } from "../api/client";
import { ChevronDown, ChevronRight, Braces } from "lucide-react";

interface Props {
  selectedId: number | null;
}

// ── JSON 类型着色 ──
const TYPE_COLORS: Record<string, string> = {
  string: "text-emerald-600",
  number: "text-amber-600",
  boolean: "text-violet-600",
  null: "text-app-subtle",
  key: "text-app-accent",
};

function formatVal(v: unknown): { text: string; cls: string } {
  if (v === null) return { text: "null", cls: TYPE_COLORS.null };
  if (v === undefined) return { text: "undefined", cls: TYPE_COLORS.null };
  if (typeof v === "string") {
    return { text: JSON.stringify(v), cls: TYPE_COLORS.string };
  }
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
}: {
  keyName?: string;
  value: unknown;
  depth: number;
  defaultOpen?: boolean;
}) {
  const isExpandable =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value as object).length > 0
      : Array.isArray(value) && (value as unknown[]).length > 0;

  const [open, setOpen] = useState(defaultOpen ?? depth < 2);

  if (!isExpandable) {
    const { text, cls } = formatVal(value);
    return (
      <div className="flex items-start font-mono text-[12px] leading-relaxed" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className={TYPE_COLORS.key + " shrink-0"}>{keyName}:&nbsp;</span>
        )}
        <span className={cls + " break-all"}>{text}</span>
      </div>
    );
  }

  const isArr = Array.isArray(value);
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const count = entries.length;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-mono text-[12px] leading-relaxed hover:bg-black/[0.03] rounded w-full text-left"
        style={{ paddingLeft: depth * 16 }}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-app-muted shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-app-muted shrink-0" />
        )}
        {keyName !== undefined && (
          <span className={TYPE_COLORS.key + " shrink-0"}>{keyName}:&nbsp;</span>
        )}
        <span className="text-app-subtle shrink-0">
          {isArr ? `[${count}]` : `{${count}}`}
        </span>
        {!open && (
          <span className="text-app-subtle text-[10px] ml-1">&hellip;</span>
        )}
      </button>
      {open &&
        entries.map(([k, v]) => (
          <JsonNode
            key={k}
            keyName={isArr ? `[${k}]` : k}
            value={v}
            depth={depth + 1}
            defaultOpen={depth < 1}
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
}: {
  title: string;
  data: unknown;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const text = typeof data === "string" ? data : JSON.stringify(data);
  const chars = text.length;

  return (
    <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-black/[0.02] transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-app-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-app-muted" />
        )}
        <span className="text-[13px] font-semibold text-app-text">{title}</span>
        <span className="text-[10px] text-app-subtle font-mono ml-auto">
          {chars > 1000 ? `${(chars / 1000).toFixed(1)}k` : chars} 字符
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-app-border/50 overflow-x-auto">
          <div className="pt-2">
            <JsonNode value={data} depth={0} defaultOpen={true} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──
export default function RawData({ selectedId }: Props) {
  const [detail, setDetail] = useState<RequestDetail | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    fetchRequestDetail(selectedId).then(setDetail);
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        选择左侧请求查看原始数据
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
        加载中...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Braces className="w-5 h-5 text-app-accent" />
        <div>
          <h2 className="text-[15px] font-semibold text-app-text">原始数据</h2>
          <p className="text-[11px] text-app-muted">
            #{detail.id} · {detail.timestamp?.slice(11, 19)} · {detail.model}
          </p>
        </div>
      </div>

      {/* Request */}
      <div className="mb-4">
        <JsonSection
          title="Request"
          data={detail.request}
          defaultOpen={true}
        />
      </div>

      {/* Response */}
      <div className="mb-4">
        <JsonSection
          title="Response"
          data={detail.response}
          defaultOpen={false}
        />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <MetaBadge label="耗时" value={`${detail.elapsed_ms}ms`} />
        <MetaBadge label="状态" value={String(detail.status)} />
        <MetaBadge
          label="Input"
          value={detail.usage?.input_tokens || "?"}
        />
        <MetaBadge
          label="Output"
          value={detail.usage?.output_tokens || "?"}
        />
      </div>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-app-card border border-app-border rounded-lg">
      <div className="text-[10px] text-app-muted">{label}</div>
      <div className="text-[12px] font-mono font-medium text-app-text mt-0.5">
        {value}
      </div>
    </div>
  );
}
