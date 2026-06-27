import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TraceTimelineProps {
  steps: Array<{ name: string; durationMs: number }>;
}

const STEP_COLORS: Record<string, string> = {
  "查询路由": "bg-indigo-500",
  "查询理解": "bg-violet-500",
  "向量化": "bg-blue-500",
  "检索": "bg-cyan-500",
  "重排序": "bg-amber-500",
  "Prompt 构造": "bg-green-500",
  "LLM 生成": "bg-rose-500",
};

export function TraceTimeline({ steps }: TraceTimelineProps) {
  if (!steps.length) return null;

  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  const maxMs = Math.max(...steps.map((s) => s.durationMs), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          耗时分布{" "}
          <span className="font-mono text-muted-foreground">
            ({totalMs}ms)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map((step) => {
            const width = Math.max((step.durationMs / maxMs) * 100, 3);
            return (
              <div key={step.name} className="grid grid-cols-[72px_1fr_64px] items-center gap-2 text-xs">
                <span className="truncate text-right text-muted-foreground">{step.name}</span>
                <div className="h-4 min-w-0 rounded bg-muted">
                  <div
                    className={`h-full rounded ${STEP_COLORS[step.name] ?? "bg-primary"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="font-mono text-muted-foreground">{step.durationMs}ms</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
