"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Github, User } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setLoading(provider)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      })
      if (error) {
        setError(error.message)
        setLoading(null)
      }
    } catch {
      setError("登录失败，请重试")
      setLoading(null)
    }
  }

  const handleGuestLogin = async () => {
    setLoading("guest")
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        setError(error.message)
        setLoading(null)
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("游客登录失败，请重试")
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <FlaskConical className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Glass Box RAG</CardTitle>
          <CardDescription className="text-base">
            可视化 RAG 学习平台
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => handleOAuthLogin("github")}
            disabled={loading !== null}
          >
            {loading === "github" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            使用 GitHub 登录
          </Button>

          <Button
            className="w-full gap-2"
            size="lg"
            variant="outline"
            onClick={() => handleOAuthLogin("google")}
            disabled={loading !== null}
          >
            {loading === "google" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            使用 Google 登录
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或者</span>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            variant="secondary"
            onClick={handleGuestLogin}
            disabled={loading !== null}
          >
            {loading === "guest" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <User className="h-4 w-4" />
            )}
            游客模式体验
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            游客数据将在会话结束后清除
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
