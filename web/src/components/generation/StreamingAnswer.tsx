"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StreamingAnswerProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingAnswer({ content, isStreaming }: StreamingAnswerProps) {
  if (!content && !isStreaming) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">生成回答</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            等待提问...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">生成回答</CardTitle>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              生成中...
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            "prose-headings:text-foreground prose-p:text-foreground/90",
            "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px]",
            "prose-pre:bg-muted prose-pre:text-foreground",
            "prose-table:text-xs",
            "prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-1.5",
            "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground align-text-bottom" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
