"use client";

import {
  Radar,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface RadarChartProps {
  data: Array<{
    strategy: string;
    relevance: number;
    faithfulness: number;
    completeness: number;
    latency: number; // inverted: lower is better, shown as 100-normalized
    cost: number; // inverted: lower is better
  }>;
}

const STRATEGY_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const DIMENSION_LABELS: Record<string, string> = {
  relevance: "相关性",
  faithfulness: "忠实度",
  completeness: "完整性",
  latencyEfficiency: "响应速度",
  costEfficiency: "成本效率",
};

export function RadarChart({ data }: RadarChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">策略雷达图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max latency and cost for normalization
  const maxLatency = Math.max(...data.map((d) => d.latency), 1);
  const maxCost = Math.max(...data.map((d) => d.cost), 0.001);

  // Transform into recharts-friendly format:
  // Each item in chartData is a dimension, with a value per strategy.
  const dimensions = [
    "relevance",
    "faithfulness",
    "completeness",
    "latencyEfficiency",
    "costEfficiency",
  ] as const;

  const chartData = dimensions.map((dim) => {
    const entry: Record<string, string | number> = {
      dimension: DIMENSION_LABELS[dim],
    };
    data.forEach((d) => {
      let value: number;
      if (dim === "latencyEfficiency") {
        // Invert: lower latency => higher score
        value = Math.round(100 * (1 - d.latency / maxLatency));
        // Ensure minimum score of 10 for visibility
        value = Math.max(value, 10);
      } else if (dim === "costEfficiency") {
        // Invert: lower cost => higher score
        value = Math.round(100 * (1 - d.cost / maxCost));
        value = Math.max(value, 10);
      } else {
        // Direct metrics (0-1 range), scale to 0-100
        value = Math.round(
          (d[dim as "relevance" | "faithfulness" | "completeness"] ?? 0) * 100
        );
      }
      entry[d.strategy] = value;
    });
    return entry;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">策略雷达图</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickCount={5}
            />
            {data.map((d, i) => (
              <Radar
                key={d.strategy}
                name={d.strategy}
                dataKey={d.strategy}
                stroke={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
                fill={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 12 }}
            />
          </ReRadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
