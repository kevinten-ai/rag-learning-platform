"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseCitations } from "@/lib/rag/citation-generator";

interface StreamingAnswerProps {
  content: string;
  isStreaming: boolean;
  onCitationClick?: (index: number) => void;
}

/**
 * Renders inline citation badges within a text string.
 * Parses [1], [2], etc. and renders them as clickable blue pills.
 */
function renderTextWithCitations(
  text: string,
  onCitationClick?: (index: number) => void
): React.ReactNode[] {
  const parts = parseCitations(text);
  return parts.map((part, i) => {
    if (part.type === "citation" && part.index !== undefined) {
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCitationClick?.(part.index!)}
          className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-blue-600 bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200 transition-colors mx-0.5 align-super"
          title={`跳转到参考资料 ${part.index}`}
        >
          {part.index}
        </button>
      );
    }
    return <React.Fragment key={i}>{part.content}</React.Fragment>;
  });
}

/**
 * Custom ReactMarkdown components that intercept text nodes
 * and render citation markers as interactive badges.
 */
function createCitationComponents(
  onCitationClick?: (index: number) => void
): Record<string, React.ComponentType<Record<string, unknown>>> {
  // Helper that wraps children, replacing any string children with citation-aware rendering
  function wrapChildren(children: React.ReactNode): React.ReactNode {
    return React.Children.map(children, (child) => {
      if (typeof child === "string") {
        const rendered = renderTextWithCitations(child, onCitationClick);
        // If no citations were found, return the original string
        if (rendered.length === 1 && rendered[0] === child) return child;
        return <>{rendered}</>;
      }
      return child;
    });
  }

  return {
    // Override paragraph to handle citations within text
    p: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
      <p {...props}>{wrapChildren(children)}</p>
    ),
    // Override list item
    li: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
      <li {...props}>{wrapChildren(children)}</li>
    ),
    // Override strong/bold
    strong: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
      <strong {...props}>{wrapChildren(children)}</strong>
    ),
    // Override emphasis/italic
    em: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
      <em {...props}>{wrapChildren(children)}</em>
    ),
    // Override table cells
    td: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
      <td {...props}>{wrapChildren(children)}</td>
    ),
  } as Record<string, React.ComponentType<Record<string, unknown>>>;
}

export function StreamingAnswer({ content, isStreaming, onCitationClick }: StreamingAnswerProps) {
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

  const citationComponents = createCitationComponents(onCitationClick);

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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={citationComponents}
          >
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
