"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SimilarityHeatmapProps {
  matrix: number[][];
  labels?: string[];
}

function getColor(value: number): string {
  // 0 (blue) → 0.5 (white) → 1 (red)
  if (value >= 0.7) return "bg-red-500/80";
  if (value >= 0.5) return "bg-orange-400/70";
  if (value >= 0.3) return "bg-yellow-300/60";
  return "bg-blue-200/50";
}

export function SimilarityHeatmap({ matrix, labels }: SimilarityHeatmapProps) {
  const size = matrix.length;

  if (size === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">相似度矩阵</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `2rem repeat(${size}, 1fr)`,
              maxWidth: Math.min(size * 28 + 32, 500),
            }}
          >
            {/* header row */}
            <div />
            {Array.from({ length: size }, (_, i) => (
              <div key={`h-${i}`} className="text-center text-[10px] text-muted-foreground">
                {labels?.[i] ?? `C${i + 1}`}
              </div>
            ))}

            {/* data rows */}
            {matrix.map((row, i) => (
              <>
                <div key={`l-${i}`} className="flex items-center text-[10px] text-muted-foreground">
                  {labels?.[i] ?? `C${i + 1}`}
                </div>
                {row.map((value, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-sm text-[9px]",
                      getColor(value)
                    )}
                    title={`${(labels?.[i] ?? `C${i + 1}`)} ↔ ${(labels?.[j] ?? `C${j + 1}`)}: ${value.toFixed(3)}`}
                  >
                    {size <= 12 ? value.toFixed(1) : ""}
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 rounded bg-blue-200/50" /> 低
          <span className="inline-block h-3 w-3 rounded bg-yellow-300/60" />
          <span className="inline-block h-3 w-3 rounded bg-orange-400/70" />
          <span className="inline-block h-3 w-3 rounded bg-red-500/80" /> 高
        </div>
      </CardContent>
    </Card>
  );
}
