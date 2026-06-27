"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { BENCHMARK_CONFIGS } from "@/lib/rag/benchmark-datasets";

interface BenchmarkResultItem {
  questionId: string;
  question: string;
  category: string;
  difficulty: string;
  answer: string;
  groundTruth: string;
  relevance: number;
  faithfulness: number;
  completeness: number;
  latencyMs: number;
  keywordHits: number;
  keywordTotal: number;
}

interface BenchmarkRun {
  configId: string;
  configName: string;
  metrics: {
    avgRelevance: number;
    avgFaithfulness: number;
    avgCompleteness: number;
    avgLatencyMs: number;
    avgKeywordCoverage: number;
    totalQuestions: number;
    byCategory: Record<string, { count: number; avgRelevance: number; avgFaithfulness: number; avgCompleteness: number }>;
    byDifficulty: Record<string, { count: number; avgRelevance: number; avgCompleteness: number }>;
  };
  results: BenchmarkResultItem[];
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 0.8
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : score >= 0.5
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {(score * 100).toFixed(0)}
    </span>
  );
}

export default function BenchmarkPage() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [runningConfig, setRunningConfig] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async (configId: string) => {
    const benchmarkConfig = BENCHMARK_CONFIGS.find((c) => c.id === configId);
    if (!benchmarkConfig) return;

    setRunningConfig(configId);
    setError(null);

    try {
      const res = await fetch("/api/rag/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: benchmarkConfig.config }),
      });

      if (!res.ok) {
        throw new Error(`Benchmark failed: ${res.status}`);
      }

      const data = await res.json();

      const newRun: BenchmarkRun = {
        configId,
        configName: benchmarkConfig.name,
        metrics: data.metrics,
        results: data.results,
      };

      setRuns((prev) => {
        // Replace existing run for same config
        const filtered = prev.filter((r) => r.configId !== configId);
        return [...filtered, newRun];
      });
      setSelectedRun(configId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunningConfig(null);
    }
  };

  const currentRun = runs.find((r) => r.configId === selectedRun);

  // Find the best config for each metric
  const bestRelevance = runs.length > 0 ? runs.reduce((a, b) => a.metrics.avgRelevance > b.metrics.avgRelevance ? a : b) : null;
  const bestFaithfulness = runs.length > 0 ? runs.reduce((a, b) => a.metrics.avgFaithfulness > b.metrics.avgFaithfulness ? a : b) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">RAG 基准测试</h1>
          <p className="text-muted-foreground">
            在标准化数据集上量化对比不同 RAG 策略的效果
          </p>
        </div>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BENCHMARK_CONFIGS.map((cfg) => {
          const existingRun = runs.find((r) => r.configId === cfg.id);
          const isRunning = runningConfig === cfg.id;
          const isSelected = selectedRun === cfg.id;

          return (
            <Card
              key={cfg.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
              }`}
              onClick={() => existingRun && setSelectedRun(cfg.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cfg.name}</CardTitle>
                  {existingRun && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  {cfg.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {existingRun ? (
                  <div className="space-y-2">
                    <MetricBar
                      label="相关性"
                      value={existingRun.metrics.avgRelevance}
                      color="bg-blue-500"
                    />
                    <MetricBar
                      label="忠实性"
                      value={existingRun.metrics.avgFaithfulness}
                      color="bg-green-500"
                    />
                    <MetricBar
                      label="完整性"
                      value={existingRun.metrics.avgCompleteness}
                      color="bg-purple-500"
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      平均延迟: {existingRun.metrics.avgLatencyMs.toFixed(0)}ms
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      runBenchmark(cfg.id);
                    }}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        运行测试
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-4 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Comparison Summary */}
      {runs.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              策略对比总览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">策略</th>
                    <th className="text-center py-2 px-3">相关性</th>
                    <th className="text-center py-2 px-3">忠实性</th>
                    <th className="text-center py-2 px-3">完整性</th>
                    <th className="text-center py-2 px-3">关键词覆盖</th>
                    <th className="text-center py-2 px-3">延迟</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.configId}
                      className={`border-b cursor-pointer hover:bg-muted/50 ${
                        selectedRun === run.configId ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedRun(run.configId)}
                    >
                      <td className="py-2 pr-4 font-medium">{run.configName}</td>
                      <td className="text-center py-2 px-3">
                        <ScoreBadge score={run.metrics.avgRelevance} />
                        {bestRelevance?.configId === run.configId && (
                          <Target className="inline h-3 w-3 ml-1 text-blue-500" />
                        )}
                      </td>
                      <td className="text-center py-2 px-3">
                        <ScoreBadge score={run.metrics.avgFaithfulness} />
                        {bestFaithfulness?.configId === run.configId && (
                          <Target className="inline h-3 w-3 ml-1 text-green-500" />
                        )}
                      </td>
                      <td className="text-center py-2 px-3">
                        <ScoreBadge score={run.metrics.avgCompleteness} />
                      </td>
                      <td className="text-center py-2 px-3">
                        <ScoreBadge score={run.metrics.avgKeywordCoverage} />
                      </td>
                      <td className="text-center py-2 px-3 font-mono text-xs">
                        {run.metrics.avgLatencyMs.toFixed(0)}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results for Selected Run */}
      {currentRun && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {currentRun.configName} — 详细结果
            </h2>
            <Badge variant="outline">
              {currentRun.results.length} 题
            </Badge>
          </div>

          {/* By Category */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(currentRun.metrics.byCategory).map(([cat, data]) => (
              <Card key={cat} className="p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {cat === "factual"
                    ? "事实类"
                    : cat === "analytical"
                      ? "分析类"
                      : cat === "comparison"
                        ? "对比类"
                        : "多跳推理"}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">
                    {(data.avgRelevance * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / 100 ({data.count} 题)
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Per-question results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                逐题结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentRun.results.map((result) => (
                  <div
                    key={result.questionId}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              result.difficulty === "hard"
                                ? "border-red-300 text-red-700"
                                : result.difficulty === "medium"
                                  ? "border-yellow-300 text-yellow-700"
                                  : "border-green-300 text-green-700"
                            }`}
                          >
                            {result.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {result.latencyMs}ms
                          </span>
                        </div>
                        <p className="text-sm font-medium">{result.question}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">
                            相关
                          </div>
                          <ScoreBadge score={result.relevance} />
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">
                            忠实
                          </div>
                          <ScoreBadge score={result.faithfulness} />
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">
                            完整
                          </div>
                          <ScoreBadge score={result.completeness} />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>回答摘要：</strong>{" "}
                      {result.answer.slice(0, 200)}
                      {result.answer.length > 200 ? "..." : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      关键词命中: {result.keywordHits}/{result.keywordTotal}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {runs.length === 0 && !runningConfig && (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">开始基准测试</h3>
          <p className="text-muted-foreground text-sm mb-4">
            选择一个或多个 RAG 策略配置，运行标准化测试集来量化对比效果。
            <br />
            建议先导入示例文档（首页“一键体验”），再运行测试。
          </p>
        </Card>
      )}
    </div>
  );
}
