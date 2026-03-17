"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TraceTimelineProps {
  steps: Array<{ name: string; durationMs: number }>;
}

const STEP_COLORS: Record<string, string> = {
  "查询理解": "hsl(263, 70%, 58%)",
  "向量化": "hsl(217, 91%, 60%)",
  "检索": "hsl(189, 94%, 43%)",
  "重排序": "hsl(38, 92%, 50%)",
  "Prompt 构造": "hsl(142, 71%, 45%)",
  "LLM 生成": "hsl(350, 89%, 60%)",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; durationMs: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{data.name}</p>
      <p className="text-muted-foreground">{data.durationMs}ms</p>
    </div>
  );
}

export function TraceTimeline({ steps }: TraceTimelineProps) {
  if (!steps.length) return null;

  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);

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
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={steps} layout="vertical" margin={{ left: 10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${v}ms`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="durationMs" radius={[0, 4, 4, 0]} barSize={16}>
                {steps.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STEP_COLORS[entry.name] || "hsl(var(--primary))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
