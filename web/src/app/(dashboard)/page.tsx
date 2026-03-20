"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Rocket,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
import { DemoModeButton } from "@/components/demo-mode";

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
            <p>暂无查询记录，试试一键体验！</p>
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
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [quickStartProgress, setQuickStartProgress] = useState("");

  async function handleQuickStart() {
    setQuickStartLoading(true);
    setQuickStartProgress("正在加载示例文档...");
    try {
      setQuickStartProgress("正在处理文档并生成向量嵌入...");
      const res = await fetch("/api/rag/quick-start", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Quick start failed");
      }
      const data = await res.json();
      setQuickStartProgress("处理完成！正在跳转...");
      toast.success(`一键体验完成！已导入 ${data.documents_created ?? ""} 篇示例文档`);
      router.push("/query");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`一键体验失败: ${message}`);
    } finally {
      setQuickStartLoading(false);
      setQuickStartProgress("");
    }
  }

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        // Fetch collections, chunk count, and recent queries in parallel
        const [collectionsRes, chunksRes, queriesRes] = await Promise.all([
          fetch("/api/rag/collections"),
          fetch("/api/rag/collections/chunks-count").catch(() => null),
          fetch("/api/rag/recent-queries").catch(() => null),
        ]);

        const collectionsData = await collectionsRes.json();
        const cols = collectionsData.collections ?? [];
        const totalDocs = cols.reduce(
          (sum: number, c: { document_count?: number }) =>
            sum + (c.document_count ?? 0),
          0
        );

        let totalChunks = 0;
        if (chunksRes && chunksRes.ok) {
          const chunksData = await chunksRes.json();
          totalChunks = chunksData.count ?? 0;
        } else {
          totalChunks = cols.reduce(
            (sum: number, c: { chunk_count?: number }) =>
              sum + (c.chunk_count ?? 0),
            0
          );
        }

        let queries: RecentQuery[] = [];
        let totalQueries = 0;
        if (queriesRes && queriesRes.ok) {
          const queriesData = await queriesRes.json();
          queries = queriesData.queries ?? [];
          totalQueries = queriesData.totalCount ?? queries.length;
        }

        setStats({
          totalDocuments: totalDocs,
          totalChunks,
          totalQueries,
        });

        setRecentQueries(queries);
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

      {/* One-click Quick Start */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Rocket className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">一键体验 RAG</h2>
              <p className="text-sm text-muted-foreground">
                自动导入示例文档，立即体验完整的 RAG 问答流程
              </p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              size="lg"
              className="flex-1 gap-2 sm:flex-initial"
              onClick={handleQuickStart}
              disabled={quickStartLoading}
            >
              {quickStartLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {quickStartLoading ? quickStartProgress || "处理中..." : "一键体验"}
            </Button>
            <DemoModeButton />
          </div>
        </CardContent>
      </Card>

      {/* Learning Path */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">RAG 学习路径</CardTitle>
          <CardDescription>
            按以下顺序体验，逐步理解 RAG 系统的每一层设计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">① 摄入工坊</span>
            <span>→ 理解文档如何变成向量</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">② 知识库</span>
            <span>→ 查看向量空间分布</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">③ RAG 问答</span>
            <span>→ 追踪完整查询链路</span>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">④ 策略实验室</span>
            <span>→ 对比不同策略效果</span>
          </div>
        </CardContent>
      </Card>

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
