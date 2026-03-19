"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Download,
  BookOpen,
  Search,
  FlaskConical,
  LayoutDashboard,
  BarChart3,
  Layers,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
    </Sidebar>
  )
}
