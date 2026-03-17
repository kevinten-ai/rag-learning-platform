"use client";

import { cn } from "@/lib/utils";

interface ChunkOverlapHighlightProps {
  chunks: Array<{
    content: string;
    overlapBefore?: string;
    overlapAfter?: string;
  }>;
  className?: string;
}

export function ChunkOverlapHighlight({ chunks, className }: ChunkOverlapHighlightProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {chunks.map((chunk, i) => {
        const { content, overlapBefore, overlapAfter } = chunk;
        let mainContent = content;

        if (overlapBefore && mainContent.startsWith(overlapBefore)) {
          mainContent = mainContent.slice(overlapBefore.length);
        }
        if (overlapAfter && mainContent.endsWith(overlapAfter)) {
          mainContent = mainContent.slice(0, -overlapAfter.length);
        }

        return (
          <div key={i} className="rounded border p-2 text-sm">
            {overlapBefore && (
              <span className="bg-amber-200/50 dark:bg-amber-800/30">{overlapBefore}</span>
            )}
            <span>{mainContent}</span>
            {overlapAfter && (
              <span className="bg-blue-200/50 dark:bg-blue-800/30">{overlapAfter}</span>
            )}
          </div>
        );
      })}
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-200/50" /> 与上一块重叠
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-blue-200/50" /> 与下一块重叠
        </div>
      </div>
    </div>
  );
}
