"use client";

import { useState } from "react";
import type { LucideProps } from "lucide-react";
import {
  Brain,
  Binary,
  Search,
  ArrowUpDown,
  MessageSquare,
  Sparkles,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RAGTrace } from "@/types/rag";

interface TracePanelProps {
  trace: Partial<RAGTrace["steps"]> | null;
  activeStep: string | null;
  onStepClick: (step: string) => void;
  isLoading?: boolean;
}

interface StepConfig {
  key: string;
  name: string;
  icon: React.FC<LucideProps>;
  color: string;
}

const STEPS: StepConfig[] = [
  { key: "queryUnderstanding", name: "查询理解", icon: Brain, color: "text-violet-500" },
  { key: "embedding", name: "向量化", icon: Binary, color: "text-blue-500" },
  { key: "retrieval", name: "检索", icon: Search, color: "text-cyan-500" },
  { key: "reranking", name: "重排序", icon: ArrowUpDown, color: "text-amber-500" },
  { key: "promptConstruction", name: "Prompt 构造", icon: MessageSquare, color: "text-green-500" },
  { key: "generation", name: "LLM 生成", icon: Sparkles, color: "text-rose-500" },
];

function getStepStatus(
  stepKey: string,
  trace: Partial<RAGTrace["steps"]> | null,
  isLoading?: boolean
): "idle" | "running" | "completed" {
  if (!trace) return "idle";
  const stepData = trace[stepKey as keyof RAGTrace["steps"]];
  if (stepData) return "completed";
  if (isLoading) {
    const stepIndex = STEPS.findIndex((s) => s.key === stepKey);
    const completedCount = STEPS.filter(
      (s) => trace[s.key as keyof RAGTrace["steps"]]
    ).length;
    if (stepIndex === completedCount) return "running";
  }
  return "idle";
}

function StepDetail({
  stepKey,
  trace,
}: {
  stepKey: string;
  trace: Partial<RAGTrace["steps"]>;
}) {
  const data = trace[stepKey as keyof RAGTrace["steps"]];
  if (!data) return null;

  switch (stepKey) {
    case "queryUnderstanding": {
      const step = data as RAGTrace["steps"]["queryUnderstanding"];
      return (
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">原始查询: </span>
            <span>{step.original}</span>
          </div>
          {step.rewritten && (
            <div>
              <span className="text-muted-foreground">改写后: </span>
              <span className="text-violet-600 dark:text-violet-400">{step.rewritten}</span>
            </div>
          )}
          {step.hydeDocument && (
            <div>
              <span className="text-muted-foreground">HyDE 假设文档: </span>
              <p className="mt-1 rounded bg-muted/50 p-2 text-[11px] leading-relaxed">
                {step.hydeDocument.length > 200
                  ? step.hydeDocument.slice(0, 200) + "..."
                  : step.hydeDocument}
              </p>
            </div>
          )}
          {step.subQueries && step.subQueries.length > 0 && (
            <div>
              <span className="text-muted-foreground">子查询: </span>
              <ul className="mt-1 space-y-1">
                {step.subQueries.map((q, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step.activeStrategies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {step.activeStrategies.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "embedding": {
      const step = data as RAGTrace["steps"]["embedding"];
      const preview = (step.vectorPreview || step.vector?.slice(0, 10) || []).slice(0, 10);
      const chartData = preview.map((v, i) => ({
        dim: `d${i}`,
        value: Number(v.toFixed(4)),
      }));
      return (
        <div className="space-y-2 text-xs">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground">模型: </span>
              <span>{step.model}</span>
            </div>
            <div>
              <span className="text-muted-foreground">维度: </span>
              <span>{step.dimensions}</span>
            </div>
          </div>
          {chartData.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="dim" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={35} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    }
    case "retrieval": {
      const step = data as RAGTrace["steps"]["retrieval"];
      return (
        <div className="space-y-2 text-xs">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground">模式: </span>
              <Badge variant="outline">{step.mode}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">候选: </span>
              <span>{step.totalCandidates}</span>
            </div>
            <div>
              <span className="text-muted-foreground">返回: </span>
              <span>{step.retrieved}</span>
            </div>
          </div>
          {step.results.slice(0, 3).map((r, i) => (
            <div
              key={r.chunkId}
              className="flex items-center gap-2 rounded bg-muted/50 p-2"
            >
              <span className="text-muted-foreground font-mono">#{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate">{r.content.slice(0, 80)}</p>
              </div>
              <span className="shrink-0 font-mono text-cyan-600 dark:text-cyan-400">
                {r.score.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "reranking": {
      const step = data as NonNullable<RAGTrace["steps"]["reranking"]>;
      return (
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">模型: </span>
            <span>{step.model}</span>
          </div>
          <div className="space-y-1">
            {step.after.slice(0, 5).map((item) => {
              const beforeItem = step.before.find((b) => b.chunkId === item.chunkId);
              const rankChange = beforeItem ? beforeItem.rank - item.rank : 0;
              return (
                <div
                  key={item.chunkId}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <span className="w-5 text-right font-mono">#{item.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                    {item.chunkId.slice(0, 12)}
                  </span>
                  {rankChange > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      +{rankChange}
                    </span>
                  )}
                  {rankChange < 0 && (
                    <span className="text-red-500">
                      {rankChange}
                    </span>
                  )}
                  {rankChange === 0 && (
                    <span className="text-muted-foreground">=</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case "promptConstruction": {
      const step = data as RAGTrace["steps"]["promptConstruction"];
      const { tokenBreakdown } = step;
      return (
        <div className="space-y-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-blue-500">System</span>
              <span className="font-mono">{tokenBreakdown.system} tokens</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${(tokenBreakdown.system / tokenBreakdown.total) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-500">Context</span>
              <span className="font-mono">{tokenBreakdown.context} tokens</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${(tokenBreakdown.context / tokenBreakdown.total) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-500">Query</span>
              <span className="font-mono">{tokenBreakdown.query} tokens</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${(tokenBreakdown.query / tokenBreakdown.total) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="border-t pt-1 font-mono text-muted-foreground">
            总计: {tokenBreakdown.total} tokens
          </div>
        </div>
      );
    }
    case "generation": {
      const step = data as RAGTrace["steps"]["generation"];
      return (
        <div className="space-y-2 text-xs">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground">模型: </span>
              <span>{step.model}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prompt tokens</span>
              <span className="font-mono">{step.tokensUsed.prompt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion tokens</span>
              <span className="font-mono">{step.tokensUsed.completion}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">总 tokens</span>
              <span className="font-mono">{step.tokensUsed.total}</span>
            </div>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className="text-muted-foreground">预估费用</span>
            <span className="font-mono text-rose-500">
              &yen;{step.estimatedCost.toFixed(4)}
            </span>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

export function TracePanel({
  trace,
  activeStep,
  onStepClick,
  isLoading,
}: TracePanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  function toggleStep(key: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    onStepClick(key);
  }

  return (
    <div className="space-y-0">
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.key, trace, isLoading);
        const isExpanded = expandedSteps.has(step.key);
        const stepData = trace?.[step.key as keyof RAGTrace["steps"]];
        const durationMs = stepData
          ? (stepData as { durationMs?: number }).durationMs
          : undefined;
        const Icon = step.icon;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.key} className="relative flex gap-3">
            {/* Vertical connecting line */}
            {!isLast && (
              <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-border" />
            )}

            {/* Step number badge */}
            <div className="relative z-10 shrink-0">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  status === "completed" &&
                    "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
                  status === "running" &&
                    "border-primary bg-primary/10 text-primary",
                  status === "idle" &&
                    "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {status === "completed" ? (
                  <Check className="size-4" />
                ) : status === "running" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
            </div>

            {/* Step card */}
            <Card
              className={cn(
                "mb-3 flex-1 cursor-pointer transition-all",
                status === "idle" && "opacity-50",
                activeStep === step.key && "ring-2 ring-primary/50"
              )}
              onClick={() => status === "completed" && toggleStep(step.key)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", step.color)} />
                    <span className="text-sm font-medium">{step.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {durationMs !== undefined && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {durationMs}ms
                      </span>
                    )}
                    {status === "completed" && (
                      isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && trace && (
                  <div className="mt-3 border-t pt-3">
                    <StepDetail stepKey={step.key} trace={trace} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
