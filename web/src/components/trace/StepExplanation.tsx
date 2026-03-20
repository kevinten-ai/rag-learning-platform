"use client";

import { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepExplanationProps {
  stepKey: string;
  stepData: unknown;
  question: string;
}

export function StepExplanation({ stepKey, stepData, question }: StepExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) {
      setIsVisible(!isVisible);
      return;
    }

    setIsLoading(true);
    setIsVisible(true);

    try {
      const res = await fetch("/api/rag/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "step",
          stepKey,
          stepData,
          question,
        }),
      });

      if (!res.ok) throw new Error("Explain failed");
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setExplanation("教学分析暂时不可用，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        onClick={fetchExplanation}
      >
        <GraduationCap className="size-3" />
        {isVisible ? "收起讲解" : "GLM-5 老师讲解"}
      </Button>

      {isVisible && (
        <div
          className={cn(
            "mt-1.5 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900",
            "dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="size-3 animate-spin" />
              <span>GLM-5 老师正在分析...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}
