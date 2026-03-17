"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Database,
  Hash,
  Clock,
  Layers,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmbeddingSpace3D } from "@/components/vectors/EmbeddingSpace3D";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionData {
  id: string;
  name: string;
  description?: string;
  chunk_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_dimensions: number;
  document_count: number;
  created_at: string;
  updated_at: string;
}

interface StatsData {
  totalDocuments: number;
  totalChunks: number;
  vectorDimensions: number;
  lastUpdated: string;
}

interface DocumentItem {
  id: string;
  title: string;
  source_type: string;
  chunk_count: number;
  token_count: number;
  created_at: string;
  status: "ready" | "processing" | "error";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ready: { label: "就绪", variant: "default" },
  processing: { label: "处理中", variant: "secondary" },
  error: { label: "错误", variant: "destructive" },
};

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

function StatsCards({
  stats,
  isLoading,
}: {
  stats: StatsData | null;
  isLoading: boolean;
}) {
  const items = [
    {
      label: "文档总数",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
    },
    {
      label: "分块数量",
      value: stats?.totalChunks ?? 0,
      icon: Hash,
    },
    {
      label: "向量维度",
      value: stats?.vectorDimensions ?? 0,
      icon: Database,
    },
    {
      label: "最后更新",
      value: stats?.lastUpdated ? formatDate(stats.lastUpdated) : "--",
      icon: Clock,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{item.label}</CardDescription>
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            )}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collection cards
// ---------------------------------------------------------------------------

function CollectionCards({
  collections,
  isLoading,
}: {
  collections: CollectionData[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
            <Layers className="mb-2 size-8" />
            <p>暂无知识库集合</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {collections.map((col) => (
        <Card key={col.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{col.name}</CardTitle>
              <Badge variant="secondary">{col.chunk_strategy}</Badge>
            </div>
            {col.description && (
              <CardDescription>{col.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">文档数</div>
              <div className="font-medium">{col.document_count}</div>
              <div className="text-muted-foreground">分块大小</div>
              <div className="font-medium">{col.chunk_size} tokens</div>
              <div className="text-muted-foreground">重叠度</div>
              <div className="font-medium">{col.chunk_overlap} tokens</div>
              <div className="text-muted-foreground">向量维度</div>
              <div className="font-medium">{col.embedding_dimensions}</div>
              <div className="text-muted-foreground">更新时间</div>
              <div className="font-medium">{formatDate(col.updated_at)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document list
// ---------------------------------------------------------------------------

function DocumentList({
  documents,
  isLoading,
}: {
  documents: DocumentItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
            <Skeleton className="size-8 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        <FileText className="mb-2 size-8" />
        <p>暂无文档，请先在「文档摄入工坊」中导入文档</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const status = STATUS_MAP[doc.status] ?? STATUS_MAP.ready;
        return (
          <div
            key={doc.id}
            className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <Badge variant="outline" className="text-[10px]">
                  {doc.source_type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.chunk_count} 分块 · {doc.token_count.toLocaleString()} tokens · {formatDate(doc.created_at)}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Sample 3D points for demo when no real data exists
const DEMO_3D_POINTS = Array.from({ length: 60 }, (_, i) => {
  const cluster = Math.floor(i / 15);
  const cx = [0, 1.5, -1, 0.5][cluster];
  const cy = [0, 1, 1.5, -1][cluster];
  const cz = [0, -0.5, 0.5, 1][cluster];
  return {
    x: cx + (Math.random() - 0.5) * 0.8,
    y: cy + (Math.random() - 0.5) * 0.8,
    z: cz + (Math.random() - 0.5) * 0.8,
    label: `Chunk ${i + 1}`,
    content: `这是第 ${i + 1} 个向量点的内容摘要...`,
    color: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"][cluster],
  };
});

export default function KnowledgePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rag/collections");
      const data = await res.json();
      const cols: CollectionData[] = data.collections ?? [];
      setCollections(cols);

      // Derive stats from collections
      const totalDocs = cols.reduce((sum, c) => sum + (c.document_count ?? 0), 0);
      const latestUpdated = cols.length > 0
        ? cols
            .map((c) => c.updated_at)
            .sort()
            .reverse()[0]
        : "";
      const dims = cols.length > 0 ? cols[0].embedding_dimensions : 0;

      // Fetch actual chunk count instead of estimating
      let totalChunks = 0;
      try {
        const chunksRes = await fetch("/api/rag/collections/chunks-count");
        if (chunksRes.ok) {
          const chunksData = await chunksRes.json();
          totalChunks = chunksData.count ?? 0;
        }
      } catch {
        // Fall back: sum chunk_count from collections if available
        totalChunks = cols.reduce(
          (sum: number, c: CollectionData & { chunk_count?: number }) =>
            sum + (c.chunk_count ?? 0),
          0
        );
      }

      setStats({
        totalDocuments: totalDocs,
        totalChunks,
        vectorDimensions: dims,
        lastUpdated: latestUpdated,
      });

      // Simulate document list from collections (placeholder for Supabase)
      const mockDocs: DocumentItem[] = cols.flatMap((col) =>
        Array.from({ length: Math.min(col.document_count, 5) }, (_, i) => ({
          id: `${col.id}-doc-${i}`,
          title: `${col.name} - 文档 ${i + 1}`,
          source_type: "feishu",
          chunk_count: 8 + Math.floor(Math.random() * 20),
          token_count: 2000 + Math.floor(Math.random() * 8000),
          created_at: col.created_at,
          status: "ready" as const,
        }))
      );
      setDocuments(mockDocs);
    } catch {
      setStats(null);
      setCollections([]);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">知识库管理</h1>
          <p className="mt-2 text-muted-foreground">
            查看和管理已导入的文档与向量数据
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw
            className={`size-4 ${isLoading ? "animate-spin" : ""}`}
          />
          刷新
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Collections */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">知识库集合</h2>
        <CollectionCards collections={collections} isLoading={isLoading} />
      </div>

      {/* Document list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>文档列表</CardTitle>
              <CardDescription>
                所有已导入的文档及其处理状态
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <ExternalLink className="size-4" />
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* 3D Vector Space */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">3D 向量空间</h2>
        <EmbeddingSpace3D points={DEMO_3D_POINTS} />
      </div>
    </div>
  );
}
