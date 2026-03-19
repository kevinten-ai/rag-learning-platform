"use client";

import { useMemo } from "react";
import type { RAGTrace } from "@/types/rag";

interface PipelineNode {
  id: string;
  label: string;
  labelEn: string;
  color: string;
  activeColor: string;
}

const PIPELINE_NODES: PipelineNode[] = [
  { id: "queryRouting", label: "路由", labelEn: "Route", color: "bg-slate-200", activeColor: "bg-indigo-500" },
  { id: "queryUnderstanding", label: "增强", labelEn: "Enhance", color: "bg-slate-200", activeColor: "bg-blue-500" },
  { id: "embedding", label: "嵌入", labelEn: "Embed", color: "bg-slate-200", activeColor: "bg-cyan-500" },
  { id: "retrieval", label: "检索", labelEn: "Retrieve", color: "bg-slate-200", activeColor: "bg-green-500" },
  { id: "crag", label: "CRAG", labelEn: "Assess", color: "bg-slate-200", activeColor: "bg-yellow-500" },
  { id: "reranking", label: "重排", labelEn: "Rerank", color: "bg-slate-200", activeColor: "bg-orange-500" },
  { id: "generation", label: "生成", labelEn: "Generate", color: "bg-slate-200", activeColor: "bg-red-500" },
];

interface PipelineDiagramProps {
  trace?: RAGTrace;
  activeStep?: string;
}

export function PipelineDiagram({ trace, activeStep }: PipelineDiagramProps) {
  const activeNodes = useMemo(() => {
    if (!trace) return new Set<string>();
    const active = new Set<string>();
    const steps = trace.steps;
    if (steps.queryRouting) active.add("queryRouting");
    if (steps.queryUnderstanding) active.add("queryUnderstanding");
    if (steps.embedding) active.add("embedding");
    if (steps.retrieval) active.add("retrieval");
    if (steps.crag) active.add("crag");
    if (steps.reranking) active.add("reranking");
    if (steps.generation) active.add("generation");
    return active;
  }, [trace]);

  const getDuration = (nodeId: string): number | null => {
    if (!trace) return null;
    const step = trace.steps[nodeId as keyof typeof trace.steps];
    if (!step || typeof step !== "object") return null;
    return (step as { durationMs?: number }).durationMs ?? null;
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {PIPELINE_NODES.map((node, i) => {
        const isActive = activeNodes.has(node.id);
        const isCurrent = activeStep === node.id;
        const duration = getDuration(node.id);

        return (
          <div key={node.id} className="flex items-center gap-1 shrink-0">
            <div
              className={`
                relative px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-300
                ${isActive
                  ? `${node.activeColor} text-white shadow-sm`
                  : "bg-muted text-muted-foreground"
                }
                ${isCurrent ? "ring-2 ring-primary ring-offset-1 scale-105" : ""}
              `}
            >
              <div className="text-center">
                <div className="font-semibold">{node.label}</div>
                {duration !== null && (
                  <div className="text-[10px] opacity-80 font-mono">
                    {duration}ms
                  </div>
                )}
              </div>
              {isCurrent && (
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full animate-pulse" />
              )}
            </div>
            {i < PIPELINE_NODES.length - 1 && (
              <div
                className={`w-4 h-0.5 transition-colors duration-300 ${
                  isActive ? "bg-primary/50" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface WaterfallChartProps {
  trace?: RAGTrace;
}

export function WaterfallChart({ trace }: WaterfallChartProps) {
  if (!trace) return null;

  const steps = useMemo(() => {
    const entries: Array<{ id: string; label: string; durationMs: number; color: string }> = [];
    const s = trace.steps;

    if (s.queryRouting) entries.push({ id: "routing", label: "查询路由", durationMs: s.queryRouting.durationMs, color: "bg-indigo-500" });
    if (s.queryUnderstanding) entries.push({ id: "understanding", label: "查询增强", durationMs: s.queryUnderstanding.durationMs, color: "bg-blue-500" });
    if (s.embedding) entries.push({ id: "embedding", label: "向量嵌入", durationMs: s.embedding.durationMs, color: "bg-cyan-500" });
    if (s.retrieval) entries.push({ id: "retrieval", label: "文档检索", durationMs: s.retrieval.durationMs, color: "bg-green-500" });
    if (s.crag) entries.push({ id: "crag", label: "CRAG 评估", durationMs: s.crag.durationMs, color: "bg-yellow-500" });
    if (s.reranking) entries.push({ id: "reranking", label: "重新排序", durationMs: s.reranking.durationMs, color: "bg-orange-500" });
    if (s.generation) entries.push({ id: "generation", label: "回答生成", durationMs: s.generation.durationMs, color: "bg-red-500" });

    return entries;
  }, [trace]);

  const maxDuration = Math.max(...steps.map((s) => s.durationMs), 1);
  const totalDuration = steps.reduce((s, step) => s + step.durationMs, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>管道耗时瀑布图</span>
        <span className="font-mono">总计 {totalDuration}ms</span>
      </div>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">
            {step.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
            <div
              className={`h-full ${step.color} rounded transition-all duration-500 flex items-center px-1.5`}
              style={{ width: `${Math.max((step.durationMs / maxDuration) * 100, 2)}%` }}
            >
              <span className="text-[10px] text-white font-mono whitespace-nowrap">
                {step.durationMs}ms
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
