"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  BookOpen,
  Search,
  FlaskConical,
  FileText,
  Hash,
  MessageSquare,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentQuery {
  id: string;
  question: string;
  answer_preview: string;
  mode: string;
  duration_ms: number;
  timestamp: string;
}

interface DashboardStats {
  totalDocuments: number;
  totalChunks: number;
  totalQueries: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const quickActions = [
  {
    href: "/ingest",
    title: "文档摄入工坊",
    description: "输入飞书文档链接，可视化解析、分块、嵌入全过程",
    icon: Download,
    color: "text-blue-600 bg-blue-500/10",
  },
  {
    href: "/knowledge",
    title: "知识库管理",
    description: "查看和管理已导入的文档与向量数据",
    icon: BookOpen,
    color: "text-emerald-600 bg-emerald-500/10",
  },
  {
    href: "/query",
    title: "RAG 问答",
    description: "提问并可视化完整 RAG 链路",
    icon: Search,
    color: "text-amber-600 bg-amber-500/10",
  },
  {
    href: "/lab",
    title: "策略实验室",
    description: "对比不同 RAG 策略的效果",
    icon: FlaskConical,
    color: "text-violet-600 bg-violet-500/10",
  },
];

// Mock recent queries (in production this would come from query_traces)
const MOCK_RECENT_QUERIES: RecentQuery[] = [
  {
    id: "q-001",
    question: "如何配置飞书 API 的权限？",
    answer_preview: "飞书 API 权限配置需要在飞书开放平台后台进行...",
    mode: "hybrid",
    duration_ms: 1405,
    timestamp: "2026-03-16T08:30:00Z",
  },
  {
    id: "q-002",
    question: "RAG 系统中向量检索的原理是什么？",
    answer_preview: "向量检索的核心原理是将文本转换为高维向量...",
    mode: "semantic",
    duration_ms: 980,
    timestamp: "2026-03-16T07:15:00Z",
  },
  {
    id: "q-003",
    question: "Elasticsearch 和向量数据库有什么区别？",
    answer_preview: "Elasticsearch 传统上是全文搜索引擎，但近年来也支持了向量检索...",
    mode: "hybrid",
    duration_ms: 1230,
    timestamp: "2026-03-15T16:45:00Z",
  },
  {
    id: "q-004",
    question: "如何优化分块策略以提高检索质量？",
    answer_preview: "分块策略的优化需要考虑多个因素：分块大小、重叠度、分割方式...",
    mode: "semantic",
    duration_ms: 1150,
    timestamp: "2026-03-15T14:20:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  } catch {
    return "--";
  }
}

// ---------------------------------------------------------------------------
// Stats Summary
// ---------------------------------------------------------------------------

function StatsSummary({
  stats,
  isLoading,
}: {
  stats: DashboardStats | null;
  isLoading: boolean;
}) {
  const items = [
    {
      label: "文档总数",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      label: "分块总数",
      value: stats?.totalChunks ?? 0,
      icon: Hash,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "查询次数",
      value: stats?.totalQueries ?? 0,
      icon: MessageSquare,
      color: "text-amber-600 bg-amber-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{item.label}</CardDescription>
              <div
                className={`flex size-8 items-center justify-center rounded-md ${item.color}`}
              >
                <item.icon className="size-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {item.value.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Queries
// ---------------------------------------------------------------------------

function RecentQueries({
  queries,
  isLoading,
}: {
  queries: RecentQuery[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              最近查询
            </CardTitle>
            <CardDescription>最近的 RAG 问答记录</CardDescription>
          </div>
          <Link
            href="/query"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            查看全部
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : queries.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
            <MessageSquare className="mb-2 size-8" />
            <p>暂无查询记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map((query) => (
              <Link
                key={query.id}
                href="/query"
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/30"
              >
                <p className="text-sm font-medium">{query.question}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {query.answer_preview}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {query.mode}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {query.duration_ms}ms
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(query.timestamp)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/rag/collections");
        const data = await res.json();
        const cols = data.collections ?? [];
        const totalDocs = cols.reduce(
          (sum: number, c: { document_count?: number }) =>
            sum + (c.document_count ?? 0),
          0
        );

        setStats({
          totalDocuments: totalDocs,
          totalChunks: totalDocs * 12,
          totalQueries: MOCK_RECENT_QUERIES.length,
        });

        // In production, fetch from /api/rag/query-traces or similar
        setRecentQueries(MOCK_RECENT_QUERIES);
      } catch {
        setStats(null);
        setRecentQueries([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Glass Box RAG</h1>
          <p className="mt-1 text-muted-foreground">
            可视化 RAG 学习平台
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} isLoading={isLoading} />

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">快速开始</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/30">
                <CardHeader>
                  <div
                    className={`mb-2 flex size-10 items-center justify-center rounded-lg ${action.color}`}
                  >
                    <action.icon className="size-5" />
                  </div>
                  <CardTitle>{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground group-hover:text-primary">
                    进入 &rarr;
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Queries */}
      <RecentQueries queries={recentQueries} isLoading={isLoading} />
    </div>
  );
}
