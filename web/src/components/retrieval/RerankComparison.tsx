"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RankItem } from "@/types/rag";

interface RerankComparisonProps {
  before: RankItem[];
  after: RankItem[];
}

export function RerankComparison({ before, after }: RerankComparisonProps) {
  if (!before.length || !after.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">重排序对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            暂无重排序数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedBefore = [...before].sort((a, b) => a.rank - b.rank);
  const sortedAfter = [...after].sort((a, b) => a.rank - b.rank);

  const beforeMap = new Map(sortedBefore.map((item) => [item.chunkId, item]));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">重排序对比</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
          {/* Header */}
          <div className="text-xs font-medium text-muted-foreground">排序前</div>
          <div />
          <div className="text-xs font-medium text-muted-foreground">排序后</div>

          {/* Before column */}
          <div className="space-y-1.5">
            {sortedBefore.slice(0, 8).map((item) => (
              <div
                key={item.chunkId}
                className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5 text-xs"
              >
                <span className="font-mono text-muted-foreground">
                  #{item.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                  {item.chunkId.slice(0, 10)}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {item.score.toFixed(3)}
                </span>
              </div>
            ))}
          </div>

          {/* Connecting arrows */}
          <div className="flex flex-col items-center justify-around px-1">
            {sortedAfter.slice(0, 8).map((afterItem) => {
              const beforeItem = beforeMap.get(afterItem.chunkId);
              const rankChange = beforeItem
                ? beforeItem.rank - afterItem.rank
                : 0;
              return (
                <div
                  key={afterItem.chunkId}
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-mono",
                    rankChange > 0 && "text-green-600 dark:text-green-400",
                    rankChange < 0 && "text-red-500",
                    rankChange === 0 && "text-muted-foreground"
                  )}
                >
                  {rankChange > 0 && (
                    <>
                      <ArrowUp className="size-3" />
                      <span>+{rankChange}</span>
                    </>
                  )}
                  {rankChange < 0 && (
                    <>
                      <ArrowDown className="size-3" />
                      <span>{rankChange}</span>
                    </>
                  )}
                  {rankChange === 0 && <Minus className="size-3" />}
                </div>
              );
            })}
          </div>

          {/* After column */}
          <div className="space-y-1.5">
            {sortedAfter.slice(0, 8).map((item) => {
              const beforeItem = beforeMap.get(item.chunkId);
              const rankChange = beforeItem
                ? beforeItem.rank - item.rank
                : 0;
              return (
                <div
                  key={item.chunkId}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1.5 text-xs",
                    rankChange > 0
                      ? "bg-green-500/10"
                      : rankChange < 0
                        ? "bg-red-500/10"
                        : "bg-muted/50"
                  )}
                >
                  <span className="font-mono text-muted-foreground">
                    #{item.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                    {item.chunkId.slice(0, 10)}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {item.score.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
