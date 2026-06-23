import { GitFork } from "lucide-react";

export default function ExecutionFlow() {
  return (
    <div className="flex items-center justify-center h-full text-app-muted text-[13px]">
      <div className="text-center">
        <GitFork className="w-8 h-8 mx-auto mb-3 text-app-subtle" />
        <p className="text-[15px] font-medium text-app-text">执行链路</p>
        <p className="text-[12px] mt-1 text-app-muted">执行链路可视化 — 即将上线</p>
        <div className="mt-4 text-[11px] text-app-subtle space-y-1">
          <div>用户 → 思考 → 调用工具 → 结果 → 回复</div>
          <div>点击节点查看 输入 / 输出 / 耗时</div>
        </div>
      </div>
    </div>
  );
}
