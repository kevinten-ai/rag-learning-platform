"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { RetrievalResult } from "@/types/rag";

interface ScoreDistributionProps {
  results: RetrievalResult[];
}

function buildHistogram(results: RetrievalResult[], bins = 10) {
  if (!results.length) return [];

  const min = Math.min(...results.map((r) => r.score));
  const max = Math.max(...results.map((r) => r.score));
  const range = max - min || 1;
  const binWidth = range / bins;

  const histogram = Array.from({ length: bins }, (_, i) => ({
    range: `${(min + i * binWidth).toFixed(2)}`,
    count: 0,
  }));

  for (const r of results) {
    let binIndex = Math.floor((r.score - min) / binWidth);
    if (binIndex >= bins) binIndex = bins - 1;
    histogram[binIndex].count++;
  }

  return histogram;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { range: string; count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="text-muted-foreground">分数区间: {data.range}</p>
      <p className="font-medium">{data.count} 条结果</p>
    </div>
  );
}

export function ScoreDistribution({ results }: ScoreDistributionProps) {
  const histogram = buildHistogram(results);

  if (!histogram.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">分数分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">分数分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram}>
              <XAxis dataKey="range" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="hsl(189, 94%, 43%)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
