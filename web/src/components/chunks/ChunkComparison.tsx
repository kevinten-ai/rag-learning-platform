"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ChunkCard } from "./ChunkCard";
import type { ChunkResult } from "@/types/rag";

interface StrategyResult {
  chunks: ChunkResult[];
  totalChunks: number;
  avgTokenCount: number;
}

interface ChunkComparisonProps {
  results: Record<string, StrategyResult>;
  onOptionsChange?: (options: { chunkSize: number; chunkOverlap: number }) => void;
}

const strategyLabels: Record<string, string> = {
  "fixed-size": "固定大小",
  recursive: "递归字符",
  semantic: "语义分块",
  "document-aware": "文档结构",
};

export function ChunkComparison({ results, onOptionsChange }: ChunkComparisonProps) {
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const strategies = Object.keys(results);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">参数调节</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Chunk Size</span>
              <span className="text-muted-foreground">{chunkSize} tokens</span>
            </div>
            <Slider
              value={[chunkSize]}
              min={200}
              max={2000}
              step={50}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                setChunkSize(v);
                onOptionsChange?.({ chunkSize: v, chunkOverlap });
              }}
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Overlap</span>
              <span className="text-muted-foreground">{chunkOverlap} tokens</span>
            </div>
            <Slider
              value={[chunkOverlap]}
              min={0}
              max={500}
              step={10}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                setChunkOverlap(v);
                onOptionsChange?.({ chunkSize, chunkOverlap: v });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(strategies.length, 4)}, 1fr)` }}
      >
        {strategies.map((strategy) => {
          const result = results[strategy];
          return (
            <div key={strategy} className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge>{strategyLabels[strategy] ?? strategy}</Badge>
                <span className="text-xs text-muted-foreground">
                  {result.totalChunks} chunks, avg {Math.round(result.avgTokenCount)} tokens
                </span>
              </div>
              <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {result.chunks.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    content={chunk.content}
                    tokenCount={chunk.tokenCount}
                    chunkIndex={chunk.chunkIndex}
                    sourceTitle={chunk.metadata.sourceTitle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
