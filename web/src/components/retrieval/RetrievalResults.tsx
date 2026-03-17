"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RetrievalResult } from "@/types/rag";

interface RetrievalResultsProps {
  results: RetrievalResult[];
  mode: string;
}

function ScoreBar({ score, max = 1 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80
              ? "bg-green-500"
              : pct >= 50
                ? "bg-amber-500"
                : "bg-red-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {score.toFixed(4)}
      </span>
    </div>
  );
}

export function RetrievalResults({ results, mode }: RetrievalResultsProps) {
  if (!results.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">检索结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            暂无检索结果
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxScore = Math.max(...results.map((r) => r.score));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            检索结果{" "}
            <span className="font-normal text-muted-foreground">
              ({results.length} 条)
            </span>
          </CardTitle>
          <Badge variant="outline">{mode}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={result.chunkId}
              className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <Badge variant="secondary">{result.documentTitle}</Badge>
                </div>
                <Badge variant="outline">
                  {result.scoreType}
                </Badge>
              </div>
              <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-foreground/80">
                {result.content}
              </p>
              <ScoreBar score={result.score} max={maxScore} />
              {mode === "hybrid" &&
                result.vectorScore !== undefined &&
                result.keywordScore !== undefined && (
                  <div className="mt-1.5 flex gap-4 text-[11px] text-muted-foreground">
                    <span>
                      向量: <span className="font-mono">{result.vectorScore.toFixed(4)}</span>
                    </span>
                    <span>
                      关键词: <span className="font-mono">{result.keywordScore.toFixed(4)}</span>
                    </span>
                  </div>
                )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
