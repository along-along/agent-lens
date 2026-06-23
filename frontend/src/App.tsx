import { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileSearch,
  GitCompare,
  GitFork,
} from "lucide-react";
import Overview from "./pages/Overview";
import PromptInspector from "./pages/PromptInspector";
import ContextDiff from "./pages/ContextDiff";
import ExecutionFlow from "./pages/ExecutionFlow";
import { fetchRequests, type RequestSummary } from "./api/client";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "总览" },
  { to: "/prompt", icon: FileSearch, label: "提示词" },
  { to: "/diff", icon: GitCompare, label: "对比" },
  { to: "/flow", icon: GitFork, label: "链路" },
];

export default function App() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await fetchRequests();
      setRequests(data.requests);
      setTotal(data.total);
    } catch {
      // server not running yet
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    navigate("/prompt");
  };

  return (
    <div className="flex h-screen bg-app-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-app-sidebar border-r border-app-border flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-app-border">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[16px] tracking-tight text-app-text">Agent</span>
            <span className="font-bold text-[16px] text-app-accent">Lens</span>
            <span className="text-[11px] text-app-subtle ml-1">AI探针</span>
          </div>
          <p className="text-[11px] text-app-muted mt-0.5">一眼看清上下文</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-2 border-b border-app-border">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 text-[12px] rounded transition-colors font-medium ${
                  isActive
                    ? "bg-app-accent text-white"
                    : "text-app-muted hover:text-app-text hover:bg-black/5"
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Request List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] text-app-subtle uppercase tracking-wider font-medium">
            请求列表 ({total})
          </div>
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className={`w-full text-left px-3 py-2 border-b border-app-border/50 hover:bg-black/[0.03] transition-colors ${
                r.id === selectedId
                  ? "bg-blue-50 border-l-2 border-l-app-accent"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="text-[12px] text-app-text truncate font-medium">
                {r.preview || `#${r.id}`}
              </div>
              <div className="flex gap-2 mt-0.5">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    r.request_type === "main"
                      ? "text-app-accent bg-blue-50"
                      : r.request_type === "tool_call"
                      ? "text-app-amber bg-amber-50"
                      : "text-app-muted bg-gray-100"
                  }`}
                >
                  {{ main: "主请求", tool_call: "工具调用", recap: "复盘" }[
                    r.request_type
                  ] || r.request_type}
                </span>
                <span className="text-[10px] text-app-subtle">{r.model}</span>
              </div>
            </button>
          ))}
          {requests.length === 0 && (
            <div className="px-3 py-8 text-[12px] text-app-muted text-center">
              暂无数据，确保 server.py 在运行
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Overview selectedId={selectedId} />} />
          <Route path="/prompt" element={<PromptInspector selectedId={selectedId} />} />
          <Route path="/diff" element={<ContextDiff selectedId={selectedId} />} />
          <Route path="/flow" element={<ExecutionFlow />} />
        </Routes>
      </main>
    </div>
  );
}
