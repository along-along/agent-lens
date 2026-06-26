import { useState, useEffect, useMemo, useRef } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileSearch,
  GitCompare,
  GitFork,
  Braces,
  ExternalLink,
  BookOpen,
  Sun,
  Moon,
  Search,
  X,
  Wifi,
  WifiOff,
  HelpCircle,
} from "lucide-react";
import Overview from "./pages/Overview";
import PromptInspector from "./pages/PromptInspector";
import ContextDiff from "./pages/ContextDiff";
import ExecutionFlow from "./pages/ExecutionFlow";
import RawData from "./pages/RawData";
import ConceptsPage from "./pages/ConceptsPage";
import { fetchRequests, type RequestSummary } from "./api/client";
import { useTheme } from "./hooks/useTheme";
import { RequestListSkeleton } from "./components/Skeleton";
import { ErrorState } from "./components/ErrorState";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "总览" },
  { to: "/prompt", icon: FileSearch, label: "提示词" },
  { to: "/diff", icon: GitCompare, label: "对比" },
  { to: "/raw", icon: Braces, label: "原始" },
  { to: "/flow", icon: GitFork, label: "链路" },
];

const TYPE_FILTERS = [
  { key: "all", label: "全部" },
  { key: "main", label: "主请求" },
  { key: "tool_call", label: "工具调用" },
  { key: "recap", label: "复盘" },
] as const;

type FilterKey = (typeof TYPE_FILTERS)[number]["key"];

export default function App() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connected, setConnected] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterKey>("all");
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme, isDark } = useTheme();
  const prevDataRef = useRef<string>("");
  const firstLoadRef = useRef(true);

  const load = async () => {
    if (firstLoadRef.current) {
      setLoadingList(true);
    }
    try {
      const data = await fetchRequests();
      const newStr = JSON.stringify(data.requests);
      // 数据没变且非首次加载 → 跳过
      if (newStr === prevDataRef.current && !firstLoadRef.current) return;
      prevDataRef.current = newStr;
      setRequests(data.requests);
      setTotal(data.total);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoadingList(false);
      firstLoadRef.current = false;
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    navigate("/");
  };

  // Filter requests by search + type
  const filteredRequests = useMemo(() => {
    let result = requests;

    if (typeFilter !== "all") {
      result = result.filter((r) => r.request_type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          String(r.id).includes(q) ||
          r.preview?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [requests, searchQuery, typeFilter]);

  return (
    <div className="flex flex-col h-screen bg-app-bg dark:bg-slate-900">
      {/* Top Bar */}
      <header className="h-9 bg-app-sidebar dark:bg-slate-800 border-b border-app-border dark:border-slate-700 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[14px] tracking-tight text-app-text dark:text-slate-100">
            Agent
          </span>
          <span className="font-bold text-[14px] text-app-accent dark:text-blue-400">Lens</span>
          <span className="text-[11px] text-app-subtle dark:text-slate-500 ml-1">AI探针</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Connection status */}
          <span
            className={`flex items-center gap-1 text-[11px] ${
              connected
                ? "text-app-green dark:text-green-400"
                : "text-app-red dark:text-red-400"
            }`}
            title={connected ? "服务已连接" : "服务断开"}
          >
            {connected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
          </span>

          {/* Links */}
          <a
            href="#"
            className="flex items-center gap-1 px-2 py-0.5 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="Git 仓库（待配置）"
          >
            <ExternalLink className="w-3 h-3" />
            Git
          </a>
          <span className="text-app-border dark:text-slate-600">·</span>
          <a
            href="https://gitee.com/along-ai/agent-lens"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="Gitee 仓库"
          >
            <ExternalLink className="w-3 h-3" />
            Gitee
          </a>
          <span className="text-app-border dark:text-slate-600">·</span>
          <NavLink
            to="/concepts"
            className={({ isActive }) =>
              `flex items-center gap-1 px-2 py-0.5 text-[12px] rounded transition-colors ${
                isActive
                  ? "text-app-accent dark:text-blue-400"
                  : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5"
              }`
            }
            title="Agent Context 概念说明"
          >
            <HelpCircle className="w-3 h-3" />
            概念
          </NavLink>
          <span className="text-app-border dark:text-slate-600">·</span>
          <a
            href="https://my.feishu.cn/wiki/FlL6wIZVnioDQXkmStGcU9vwnge?fromScene=spaceOverview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title="知识库"
          >
            <BookOpen className="w-3 h-3" />
            Wiki
          </a>

          {/* Theme toggle */}
          <span className="text-app-border dark:text-slate-600">·</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2 py-0.5 text-[12px] text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/5 rounded transition-colors"
            title={isDark ? "切换浅色模式" : "切换暗色模式"}
          >
            {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-app-sidebar dark:bg-slate-800 border-r border-app-border dark:border-slate-700 flex flex-col shrink-0">
          {/* Sub-header */}
          <div className="px-4 py-2.5 border-b border-app-border dark:border-slate-700">
            <p className="text-[12px] text-app-muted dark:text-slate-400">上下文可视化</p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-2 py-2 border-b border-app-border dark:border-slate-700">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 text-[12px] rounded transition-colors font-medium ${
                    isActive
                      ? "bg-app-accent dark:bg-blue-600 text-white"
                      : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Search & Filter */}
          <div className="px-2 py-2 border-b border-app-border dark:border-slate-700 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-app-subtle dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-6 pr-6 py-1.5 text-[12px] bg-app-card dark:bg-slate-700 border border-app-border dark:border-slate-600 rounded text-app-text dark:text-slate-200 placeholder:text-app-subtle dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-app-accent/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-app-subtle dark:text-slate-500 hover:text-app-text dark:hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Type filter */}
            <div className="flex gap-0.5">
              {TYPE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`flex-1 text-[11px] px-1 py-1 rounded transition-colors font-medium ${
                    typeFilter === key
                      ? "bg-app-accent dark:bg-blue-600 text-white"
                      : "text-app-muted dark:text-slate-400 hover:text-app-text dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Request List */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 text-[12px] text-app-subtle dark:text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
              <span>
                请求列表 ({filteredRequests.length}{typeFilter !== "all" || searchQuery ? ` / ${total}` : ""})
              </span>
            </div>

            {loadingList && requests.length === 0 && <RequestListSkeleton count={5} />}

            {!loadingList && !connected && (
              <div className="px-3 py-2">
                <ErrorState variant="connection" message="无法连接服务" onRetry={load} />
              </div>
            )}

            {!loadingList &&
              connected &&
              filteredRequests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-3 py-2 border-b border-app-border/50 dark:border-slate-700/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors ${
                    r.id === selectedId
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-app-accent dark:border-l-blue-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] text-app-subtle dark:text-slate-500 font-mono shrink-0">
                      #{r.id}
                    </span>
                    <span className="text-[12px] text-app-subtle dark:text-slate-500">
                      {r.timestamp?.slice(11, 19)}
                    </span>
                  </div>
                  <div className="text-[14px] text-app-text dark:text-slate-200 truncate font-medium">
                    {r.preview || `#${r.id}`}
                  </div>
                  <div className="flex gap-2 mt-0.5">
                    <span
                      className={`text-[12px] px-1.5 py-0.5 rounded font-medium ${
                        r.request_type === "main"
                          ? "text-app-accent dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                          : r.request_type === "tool_call"
                          ? "text-app-amber dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
                          : "text-app-muted dark:text-slate-400 bg-gray-100 dark:bg-slate-700"
                      }`}
                    >
                      {
                        { main: "主请求", tool_call: "工具调用", recap: "复盘" }[
                          r.request_type
                        ] || r.request_type
                      }
                    </span>
                    <span className="text-[12px] text-app-subtle dark:text-slate-500">{r.model}</span>
                  </div>
                </button>
              ))}

            {!loadingList && connected && filteredRequests.length === 0 && (
              <div className="px-3 py-8 text-[12px] text-app-muted dark:text-slate-500 text-center">
                {searchQuery || typeFilter !== "all"
                  ? "无匹配结果"
                  : "暂无数据，确保 server.py 在运行"}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-app-bg dark:bg-slate-900">
          <Routes>
            <Route path="/" element={<Overview selectedId={selectedId} />} />
            <Route
              path="/prompt"
              element={<PromptInspector selectedId={selectedId} />}
            />
            <Route
              path="/diff"
              element={<ContextDiff selectedId={selectedId} />}
            />
            <Route
              path="/raw"
              element={<RawData selectedId={selectedId} />}
            />
            <Route
              path="/concepts"
              element={<ConceptsPage />}
            />
            <Route
              path="/flow"
              element={<ExecutionFlow selectedId={selectedId} />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
