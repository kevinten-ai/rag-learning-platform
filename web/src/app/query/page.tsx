"use client";

import { useState, useCallback } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TracePanel } from "@/components/trace/TracePanel";
import { TraceTimeline } from "@/components/trace/TraceTimeline";
import { CostEstimator } from "@/components/trace/CostEstimator";
import { StreamingAnswer } from "@/components/generation/StreamingAnswer";
import { SourceAttribution } from "@/components/generation/SourceAttribution";
import { cn } from "@/lib/utils";
import type { RAGTrace } from "@/types/rag";

type SearchMode = "semantic" | "keyword" | "hybrid";

interface Enhancers {
  rewrite: boolean;
  hyde: boolean;
  multiQuery: boolean;
}

const MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: "semantic", label: "语义检索" },
  { value: "keyword", label: "关键词检索" },
  { value: "hybrid", label: "混合检索" },
];

const ENHANCER_OPTIONS: { key: keyof Enhancers; label: string }[] = [
  { key: "rewrite", label: "查询改写" },
  { key: "hyde", label: "HyDE" },
  { key: "multiQuery", label: "多路查询" },
];

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [enhancers, setEnhancers] = useState<Enhancers>({
    rewrite: true,
    hyde: false,
    multiQuery: false,
  });

  const [trace, setTrace] = useState<RAGTrace | null>(null);
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const handleQuery = useCallback(async () => {
    if (!question.trim() || isLoading) return;

    setAnswer("");
    setTrace(null);
    setIsLoading(true);
    setIsStreaming(true);
    setActiveStep(null);

    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          mode,
          enhancers,
        }),
      });

      if (!res.ok) {
        throw new Error(`Query failed: ${res.status}`);
      }

      // Read trace from header
      const traceHeader = res.headers.get("X-RAG-Trace");
      if (traceHeader) {
        try {
          setTrace(JSON.parse(atob(traceHeader)));
        } catch {
          // trace header may be invalid
        }
      }

      // Stream the answer
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value));
      }
    } catch (err) {
      console.error("Query error:", err);
      setAnswer(
        `查询失败: ${err instanceof Error ? err.message : "未知错误"}`
      );
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [question, mode, enhancers, isLoading]);

  function handleReset() {
    setQuestion("");
    setAnswer("");
    setTrace(null);
    setIsLoading(false);
    setIsStreaming(false);
    setActiveStep(null);
  }

  function toggleEnhancer(key: keyof Enhancers) {
    setEnhancers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Build timeline data from trace
  const timelineSteps = trace
    ? [
        { name: "查询理解", durationMs: trace.steps.queryUnderstanding?.durationMs ?? 0 },
        { name: "向量化", durationMs: trace.steps.embedding?.durationMs ?? 0 },
        { name: "检索", durationMs: trace.steps.retrieval?.durationMs ?? 0 },
        { name: "重排序", durationMs: trace.steps.reranking?.durationMs ?? 0 },
        { name: "Prompt 构造", durationMs: trace.steps.promptConstruction?.durationMs ?? 0 },
        { name: "LLM 生成", durationMs: trace.steps.generation?.durationMs ?? 0 },
      ].filter((s) => s.durationMs > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          RAG 问答 &amp; 流程追踪
        </h1>
        <p className="mt-2 text-muted-foreground">
          提问并可视化完整 RAG 链路
        </p>
      </div>

      {/* Query input section */}
      <Card>
        <CardHeader>
          <CardTitle>输入问题</CardTitle>
          <CardDescription>
            输入你的问题，系统将检索知识库并生成回答
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question input */}
          <div className="flex gap-3">
            <Input
              placeholder="请输入你的问题..."
              className="flex-1"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
              disabled={isLoading}
            />
            <Button onClick={handleQuery} disabled={isLoading || !question.trim()}>
              <Search className="size-4" />
              提问
            </Button>
            {(answer || trace) && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4" />
                重置
              </Button>
            )}
          </div>

          {/* Mode selector + Enhancers */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Mode radio group */}
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">
                检索模式:
              </span>
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    mode === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Enhancer checkboxes */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">增强:</span>
              {ENHANCER_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={enhancers[opt.key]}
                    onChange={() => toggleEnhancer(opt.key)}
                    className="size-3.5 rounded border-border accent-primary"
                  />
                  <span
                    className={cn(
                      enhancers[opt.key]
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content: Trace (left) + Answer (right) */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Left: Trace Panel */}
        <div className="space-y-4">
          <TracePanel
            trace={trace?.steps ?? null}
            activeStep={activeStep}
            onStepClick={setActiveStep}
            isLoading={isLoading}
          />

          {/* Timeline */}
          {timelineSteps.length > 0 && (
            <TraceTimeline steps={timelineSteps} />
          )}

          {/* Cost estimator */}
          {trace && <CostEstimator trace={trace} />}
        </div>

        {/* Right: Answer + Sources + Quality */}
        <div className="space-y-4">
          {/* Streaming answer */}
          <StreamingAnswer content={answer} isStreaming={isStreaming} />

          {/* Source attribution */}
          {trace?.steps.generation?.sources && (
            <SourceAttribution sources={trace.steps.generation.sources} />
          )}

          {/* Quality metrics */}
          {trace?.evaluation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">质量评估</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <QualityBar
                    label="相关性"
                    value={trace.evaluation.relevance}
                    color="bg-blue-500"
                  />
                  <QualityBar
                    label="忠实度"
                    value={trace.evaluation.faithfulness}
                    color="bg-green-500"
                  />
                  <QualityBar
                    label="完整性"
                    value={trace.evaluation.completeness}
                    color="bg-amber-500"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
