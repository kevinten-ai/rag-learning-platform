"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChunkCardProps {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  sourceTitle?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function ChunkCard({
  content,
  tokenCount,
  chunkIndex,
  sourceTitle,
  isActive,
  onClick,
}: ChunkCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/30",
        isActive && "border-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Chunk {chunkIndex + 1}
          </Badge>
          <span className="text-xs text-muted-foreground">{tokenCount} tokens</span>
        </div>
        <p className="line-clamp-4 text-sm leading-relaxed">{content}</p>
        {sourceTitle && (
          <p className="mt-2 text-xs text-muted-foreground">
            来源: {sourceTitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
