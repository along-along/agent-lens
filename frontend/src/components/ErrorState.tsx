import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  variant?: "inline" | "fullscreen" | "connection";
}

/** 通用错误状态组件 */
export function ErrorState({
  message = "加载失败",
  onRetry,
  variant = "inline",
}: ErrorStateProps) {
  if (variant === "fullscreen") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="text-[14px] font-medium text-app-text dark:text-slate-100 mb-1">
            出错了
          </p>
          <p className="text-[12px] text-app-muted dark:text-slate-400 mb-4">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded bg-app-accent text-white hover:bg-app-accent-dim transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "connection") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-700 dark:text-amber-400">
        <WifiOff className="w-3 h-3" />
        <span>服务未连接</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-1 underline hover:text-amber-900 dark:hover:text-amber-300"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[13px] text-amber-700 dark:text-amber-400">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-[12px] rounded bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          重试
        </button>
      )}
    </div>
  );
}
