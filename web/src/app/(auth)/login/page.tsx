"use client"

import Link from "next/link"
import { FlaskConical, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <FlaskConical className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Glass Box RAG</CardTitle>
          <CardDescription className="text-base">
            可视化 RAG 学习平台 — 让每一步都透明可见
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/">
            <Button className="w-full gap-2" size="lg">
              <ArrowRight className="h-4 w-4" />
              进入平台
            </Button>
          </Link>

          <p className="text-center text-xs text-muted-foreground">
            无需登录，直接体验完整 RAG 可视化流程
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
