"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, ReceiptText, UsersRound, Workflow } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  { label: "Customers", href: "/customers", icon: UsersRound },
  { label: "Work Orders", href: "/work-order", icon: ClipboardList },
  { label: "Invoices", href: "/invoice", icon: ReceiptText },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border">
        <SidebarHeader className="px-4 py-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Workflow className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold tracking-wide">Fieldwork</p>
              <p className="truncate text-xs text-sidebar-foreground/60">Service operations</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {navigation.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} aria-current={active ? "page" : undefined} />}
                      isActive={active}
                      tooltip={label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="group-data-[collapsible=icon]:hidden">Operations workspace</span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.04)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-3">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="h-full">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-5 ${active ? "stroke-[2.25]" : ""}`} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
