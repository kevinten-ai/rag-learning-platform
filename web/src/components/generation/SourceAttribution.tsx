"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SourceRef } from "@/types/rag";

interface SourceAttributionProps {
  sources: SourceRef[];
  highlightIndex?: number | null;
}

export function SourceAttribution({ sources, highlightIndex }: SourceAttributionProps) {
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  // When highlightIndex changes, flash the corresponding source
  useEffect(() => {
    if (highlightIndex != null && highlightIndex >= 1 && highlightIndex <= sources.length) {
      setFlashIndex(highlightIndex);
      // Scroll the source element into view
      const el = document.getElementById(`source-ref-${highlightIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear flash after animation
      const timer = setTimeout(() => setFlashIndex(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightIndex, sources.length]);

  if (!sources.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          来源引用{" "}
          <span className="font-normal text-muted-foreground">
            ({sources.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => {
              const sourceIndex = index + 1;
              const isHighlighted = flashIndex === sourceIndex;
              return (
                <Tooltip key={source.chunkId}>
                  <TooltipTrigger>
                    <span
                      id={`source-ref-${sourceIndex}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all",
                        "cursor-default hover:bg-muted",
                        isHighlighted &&
                          "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-300 animate-pulse"
                      )}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {sourceIndex}
                      </span>
                      <span className="max-w-[150px] truncate">
                        {source.documentTitle}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{source.documentTitle}</p>
                      <p className="text-muted-foreground">
                        相关度: {source.relevance}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {source.chunkId}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
