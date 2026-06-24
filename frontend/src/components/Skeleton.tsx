import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
}

/** 通用骨架屏脉冲块 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-gray-200 dark:bg-slate-700",
        className
      )}
    />
  );
}

/** 列表项骨架屏 — 模拟请求列表 loading */
export function RequestListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

/** 内容区骨架屏 — 模拟页面加载中 */
export function ContentSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 max-w-3xl space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-80" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 dark:border-slate-700">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 卡片骨架屏 */
export function CardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-gray-100 dark:border-slate-700 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
