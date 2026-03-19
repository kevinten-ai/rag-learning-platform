"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Download,
  BookOpen,
  Search,
  FlaskConical,
  LayoutDashboard,
  BarChart3,
  Layers,
  LogOut,
  User,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ingest", label: "文档摄入", icon: Download },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
  { href: "/query", label: "RAG 问答", icon: Search },
  { href: "/lab", label: "策略实验室", icon: FlaskConical },
  { href: "/benchmark", label: "基准测试", icon: BarChart3 },
  { href: "/techniques", label: "技术目录", icon: Layers },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const displayName = user?.is_anonymous
    ? "Guest"
    : user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || user?.email
      || "User"

  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="Glass Box RAG">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FlaskConical className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Glass Box RAG</span>
                <span className="truncate text-xs text-muted-foreground">可视化学习平台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-2 py-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="size-7 shrink-0 rounded-full"
            />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="size-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {user?.is_anonymous && (
              <span className="truncate text-xs text-muted-foreground">游客模式</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 group-data-[collapsible=icon]:hidden"
            onClick={handleSignOut}
            title="退出登录"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
