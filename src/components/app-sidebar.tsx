"use client";

import {
  BarChart3,
  BotMessageSquare,
  Building2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavUser } from "@/components/nav-user";
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
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Organization", href: "/dashboard/organization", icon: Building2 },
  { title: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="AgentDesk"
              render={<Link href="/dashboard" />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
                <BotMessageSquare className="size-4 text-white" />
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">AgentDesk</span>
                <span className="text-xs text-muted-foreground">
                  Pro workspace
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-2 rounded-lg border border-sidebar-border bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-indigo-400" />
            Upgrade to Scale
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock unlimited agent runs and team seats.
          </p>
        </div>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
