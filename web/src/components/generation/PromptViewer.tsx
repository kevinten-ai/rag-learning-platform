"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContextChunk } from "@/types/rag";

interface PromptViewerProps {
  systemPrompt: string;
  contextChunks: ContextChunk[];
  question: string;
  tokenBreakdown: {
    system: number;
    context: number;
    query: number;
    total: number;
  };
}

const SECTION_COLORS = {
  system: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", fill: "hsl(217, 91%, 60%)" },
  context: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-600 dark:text-green-400", fill: "hsl(142, 71%, 45%)" },
  query: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", fill: "hsl(25, 95%, 53%)" },
};

export function PromptViewer({
  systemPrompt,
  contextChunks,
  question,
  tokenBreakdown,
}: PromptViewerProps) {
  const [showFull, setShowFull] = useState(false);

  const pieData = [
    { name: "System", value: tokenBreakdown.system, color: SECTION_COLORS.system.fill },
    { name: "Context", value: tokenBreakdown.context, color: SECTION_COLORS.context.fill },
    { name: "Query", value: tokenBreakdown.query, color: SECTION_COLORS.query.fill },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Prompt 构造</CardTitle>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowFull(!showFull)}
          >
            {showFull ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Token breakdown pie chart */}
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} tokens`, ""]}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Token summary */}
          <div className="flex justify-center gap-4 text-[11px]">
            <span>
              总计:{" "}
              <span className="font-mono font-medium">
                {tokenBreakdown.total.toLocaleString()}
              </span>{" "}
              tokens
            </span>
          </div>

          {/* Prompt sections */}
          <div className="space-y-2">
            {/* System Prompt */}
            <div
              className={cn(
                "rounded-lg border p-3",
                SECTION_COLORS.system.bg,
                SECTION_COLORS.system.border
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-medium",
                    SECTION_COLORS.system.text
                  )}
                >
                  System Prompt
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {tokenBreakdown.system} tokens
                </span>
              </div>
              <pre
                className={cn(
                  "whitespace-pre-wrap text-xs leading-relaxed",
                  !showFull && "line-clamp-3"
                )}
              >
                {systemPrompt}
              </pre>
            </div>

            {/* Context Chunks */}
            <div
              className={cn(
                "rounded-lg border p-3",
                SECTION_COLORS.context.bg,
                SECTION_COLORS.context.border
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-medium",
                    SECTION_COLORS.context.text
                  )}
                >
                  Context ({contextChunks.length} chunks)
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {tokenBreakdown.context} tokens
                </span>
              </div>
              <div className="space-y-1.5">
                {contextChunks
                  .slice(0, showFull ? undefined : 2)
                  .map((chunk, i) => (
                    <div
                      key={chunk.chunkId}
                      className="rounded bg-background/50 p-2 text-xs"
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">#{i + 1}</span>
                        <span className="truncate">{chunk.source}</span>
                      </div>
                      <p
                        className={cn(
                          "leading-relaxed",
                          !showFull && "line-clamp-2"
                        )}
                      >
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                {!showFull && contextChunks.length > 2 && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    +{contextChunks.length - 2} more chunks
                  </p>
                )}
              </div>
            </div>

            {/* Query */}
            <div
              className={cn(
                "rounded-lg border p-3",
                SECTION_COLORS.query.bg,
                SECTION_COLORS.query.border
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-medium",
                    SECTION_COLORS.query.text
                  )}
                >
                  User Query
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {tokenBreakdown.query} tokens
                </span>
              </div>
              <p className="text-xs leading-relaxed">{question}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
