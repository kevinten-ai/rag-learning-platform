"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StepCardProps {
  title: string;
  description?: string;
  status: "idle" | "running" | "completed" | "error";
  children?: React.ReactNode;
  className?: string;
}

export function StepCard({ title, description, status, children, className }: StepCardProps) {
  return (
    <Card className={cn(status === "idle" && "opacity-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {status === "running" ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : status === "idle" ? (
          <p className="text-sm text-muted-foreground">等待上一步完成...</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
