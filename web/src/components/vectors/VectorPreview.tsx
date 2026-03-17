"use client";

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface VectorPreviewProps {
  vector: number[];
  dimensions: number;
  label?: string;
}

export function VectorPreview({ vector, dimensions, label }: VectorPreviewProps) {
  const preview = vector.slice(0, 10);
  const data = preview.map((value, i) => ({ dim: `d${i}`, value: Number(value.toFixed(4)) }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {label ?? "向量预览"} ({dimensions}维, 前10维)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data}>
            <XAxis dataKey="dim" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
