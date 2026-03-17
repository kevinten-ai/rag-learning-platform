"use client";

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
}

export function SourceAttribution({ sources }: SourceAttributionProps) {
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
            {sources.map((source, index) => (
              <Tooltip key={source.chunkId}>
                <TooltipTrigger>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      "cursor-default hover:bg-muted"
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
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
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
