"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { RAGTrace } from "@/types/rag";

interface CostEstimatorProps {
  trace: RAGTrace | null;
}

interface CostRow {
  stage: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

function buildCostRows(trace: RAGTrace): CostRow[] {
  const rows: CostRow[] = [];

  // Query routing cost (LLM call)
  if (trace.steps.queryRouting) {
    rows.push({
      stage: "智能路由",
      model: "glm-4-flash",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0.0005,
    });
  }

  // Query enhancement costs (each is an LLM call)
  if (trace.steps.queryUnderstanding?.activeStrategies?.length) {
    const strategies = trace.steps.queryUnderstanding.activeStrategies;
    rows.push({
      stage: `查询增强 (${strategies.join('+')})`,
      model: "glm-4-flash",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: strategies.length * 0.0005,
    });
  }

  if (trace.steps.embedding) {
    rows.push({
      stage: "向量化",
      model: trace.steps.embedding.model,
      promptTokens: trace.steps.embedding.tokensUsed,
      completionTokens: 0,
      estimatedCost: trace.steps.embedding.tokensUsed * 0.0001,
    });
  }

  // CRAG cost (LLM call for assessment + potential re-retrieval)
  if (trace.steps.crag) {
    rows.push({
      stage: "CRAG 校正",
      model: "glm-4-flash",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: trace.steps.crag.retrialPerformed ? 0.002 : 0.001,
    });
  }

  if (trace.steps.reranking) {
    rows.push({
      stage: "重排序",
      model: trace.steps.reranking.model,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0.001,
    });
  }

  if (trace.steps.generation) {
    rows.push({
      stage: "LLM 生成",
      model: trace.steps.generation.model,
      promptTokens: trace.steps.generation.tokensUsed.prompt,
      completionTokens: trace.steps.generation.tokensUsed.completion,
      estimatedCost: trace.steps.generation.estimatedCost,
    });
  }

  // Self-RAG cost
  if (trace.selfRag) {
    rows.push({
      stage: "Self-RAG 反思",
      model: "glm-4-flash",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0.001 + (trace.selfRag.additionalRetrievals * 0.001),
    });
  }

  return rows;
}

export function CostEstimator({ trace }: CostEstimatorProps) {
  if (!trace) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">费用估算</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">等待查询完成...</p>
        </CardContent>
      </Card>
    );
  }

  const rows = buildCostRows(trace);
  const totalCost = rows.reduce((sum, r) => sum + r.estimatedCost, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">费用估算</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          每次 RAG 查询涉及多个 LLM/Embedding API 调用，了解各步骤成本有助于优化配置
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">阶段</th>
                <th className="pb-2 pr-3 font-medium">模型</th>
                <th className="pb-2 pr-3 text-right font-medium">Prompt</th>
                <th className="pb-2 pr-3 text-right font-medium">Completion</th>
                <th className="pb-2 text-right font-medium">费用 (CNY)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.stage} className="border-b border-border/50">
                  <td className="py-2 pr-3">{row.stage}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">
                    {row.model}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.promptTokens > 0 ? row.promptTokens.toLocaleString() : "-"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.completionTokens > 0
                      ? row.completionTokens.toLocaleString()
                      : "-"}
                  </td>
                  <td className="py-2 text-right font-mono">
                    &yen;{row.estimatedCost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <td className="pt-2" colSpan={4}>
                  总计
                </td>
                <td className="pt-2 text-right font-mono text-rose-500">
                  &yen;{totalCost.toFixed(4)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
