"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, BarChart3 } from "lucide-react";

export interface CompareResult {
  strategy: string;
  answer: string;
  sources: Array<{ chunkId: string; score: number; content: string }>;
  durationMs: number;
  metrics?: { relevance: number; faithfulness: number; completeness: number };
}

interface StrategyCompareProps {
  results: CompareResult[];
  isLoading?: boolean;
}

const STRATEGY_COLORS: Record<string, string> = {
  semantic: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  keyword: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  hybrid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rewrite: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  hyde: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  "multi-query": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  kimi: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  ark: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  "fixed-size": "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  recursive: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  "document-aware": "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton({ columns }: { columns: number }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(columns, 4)}, 1fr)`,
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StrategyCompare({ results, isLoading }: StrategyCompareProps) {
  if (isLoading) {
    return <LoadingSkeleton columns={results.length || 2} />;
  }

  if (results.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        运行实验后将在此显示对比结果
      </div>
    );
  }

  const colCount = Math.min(results.length, 4);

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
    >
      {results.map((result) => {
        const colorClass =
          STRATEGY_COLORS[result.strategy] ??
          "bg-primary/10 text-primary";

        return (
          <Card key={result.strategy} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge
                  className={`border-0 ${colorClass}`}
                >
                  {result.strategy}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {result.durationMs}ms
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4">
              {/* Sources */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3" />
                  检索来源 ({result.sources.length})
                </div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {result.sources.map((source) => (
                    <div
                      key={source.chunkId}
                      className="rounded-md border bg-muted/30 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-muted-foreground">
                          {source.chunkId}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {source.score.toFixed(3)}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">
                        {source.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div className="flex-1">
                <CardTitle className="mb-2 text-xs font-medium text-muted-foreground">
                  生成回答
                </CardTitle>
                <div className="rounded-md border bg-card p-3 text-sm leading-relaxed">
                  {result.answer}
                </div>
              </div>

              {/* Metrics */}
              {result.metrics && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <BarChart3 className="size-3" />
                    质量指标
                  </div>
                  <div className="space-y-2">
                    <MetricBar label="相关性" value={result.metrics.relevance} />
                    <MetricBar
                      label="忠实度"
                      value={result.metrics.faithfulness}
                    />
                    <MetricBar
                      label="完整性"
                      value={result.metrics.completeness}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
