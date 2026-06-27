"use client";

import { useState, useCallback } from "react";
import { GraduationCap, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import type { RAGTrace } from "@/types/rag";

interface TeacherAnalysisProps {
  trace: RAGTrace | null;
}

export function TeacherAnalysis({ trace }: TeacherAnalysisProps) {
  const [analysis, setAnalysis] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!trace) return;

    setIsOpen(true);
    setAnalysis("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/rag/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full", trace }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnalysis((prev) => prev + decoder.decode(value));
      }
    } catch {
      setAnalysis("教学分析暂时不可用，请确认 ARK_API_KEY 已配置且 Ark 模型可用。");
    } finally {
      setIsStreaming(false);
    }
  }, [trace]);

  if (!trace) return null;

  // Button only (analysis panel not open)
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950"
        onClick={runAnalysis}
      >
        <GraduationCap className="size-4" />
        Ark 老师分析
      </Button>
    );
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
          <GraduationCap className="size-4" />
          Ark 老师分析报告
          {isStreaming && <Loader2 className="size-3 animate-spin" />}
        </CardTitle>
        <div className="flex items-center gap-1">
          {!isStreaming && analysis && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={runAnalysis}>
              重新分析
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-sm prose-headings:font-semibold prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs">
          {analysis ? (
            <ReactMarkdown>{analysis}</ReactMarkdown>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              正在生成教学分析报告...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
