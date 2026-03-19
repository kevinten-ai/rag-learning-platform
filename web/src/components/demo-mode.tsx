"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DEMO_STEPS } from "@/lib/demo-steps";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Presentation,
} from "lucide-react";

interface DemoModeProps {
  onClose: () => void;
}

export function DemoMode({ onClose }: DemoModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const step = DEMO_STEPS[currentStep];

  // Navigate to the step's page when step changes
  useEffect(() => {
    if (step && step.page !== pathname) {
      router.push(step.page);
    }
  }, [currentStep, step, pathname, router]);

  const goNext = useCallback(() => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!step) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-background border rounded-xl shadow-2xl p-5 space-y-4">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {DEMO_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
            <Presentation className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                {currentStep + 1}/{DEMO_STEPS.length}
              </span>
              <h3 className="font-semibold text-base">{step.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            退出演示
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={goNext}>
              {currentStep < DEMO_STEPS.length - 1 ? (
                <>
                  下一步
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                "完成"
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-muted-foreground text-center">
          使用方向键 ← → 或空格键导航 · ESC 退出
        </p>
      </div>
    </div>
  );
}

export function DemoModeButton() {
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsActive(true)}
        className="gap-2"
      >
        <Play className="h-4 w-4" />
        引导演示
      </Button>
      {isActive && <DemoMode onClose={() => setIsActive(false)} />}
    </>
  );
}
