"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStep {
  id: string;
  label: string;
  status: "idle" | "running" | "completed" | "error";
  durationMs?: number;
}

interface PipelineFlowProps {
  steps: PipelineStep[];
  activeStep: string | null;
  onStepClick: (stepId: string) => void;
}

export function PipelineFlow({ steps, activeStep, onStepClick }: PipelineFlowProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => onStepClick(step.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors",
              activeStep === step.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/30",
              step.status === "error" && "border-destructive text-destructive"
            )}
          >
            {step.status === "idle" && (
              <Circle className="size-4 text-muted-foreground" />
            )}
            {step.status === "running" && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
            {step.status === "completed" && (
              <CheckCircle2 className="size-4 text-green-600" />
            )}
            {step.status === "error" && (
              <Circle className="size-4 text-destructive" />
            )}
            <span className="whitespace-nowrap">{step.label}</span>
            {step.durationMs != null && (
              <span className="text-xs text-muted-foreground">
                {step.durationMs}ms
              </span>
            )}
          </button>
          {index < steps.length - 1 && (
            <div className="mx-1 h-px w-6 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
