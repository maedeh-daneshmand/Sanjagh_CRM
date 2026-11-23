"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeCustomizer } from "../theme/theme-context";
import { useUser } from "../auth/user-context";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Kanban,
  CheckSquare,
  Calendar,
  BarChart3,
  Megaphone,
  Workflow,
  Sparkles,
  Settings,
  Shield,
  Pin,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string;
  isNew?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { layout } = useThemeCustomizer();
  const { user } = useUser();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for toggle collapsed UI
  const [collapsed, setCollapsed] = useState(false);

  const isMini = layout === "mini" || collapsed;

  const isAuthorized = (allowedRoles: string[]) => {
    return allowedRoles.includes(user.role);
  };

  const menuSections: MenuSection[] = [
    {
      title: "اصلی",
      items: [
        {
          name: "پیشخوان فروش",
          href: "/",
          icon: LayoutDashboard,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
      ],
    },
    {
      title: "مدیریت ارتباطات و فروش",
      items: [
        {
          name: "مشتریان (Customers)",
          href: "/contacts",
          icon: Users,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
        {
          name: "سرنخ‌ها (Leads)",
          href: "/leads",
          icon: UserCheck,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
        {
          name: "قیف فروش (کانبان)",
          href: "/pipeline",
          icon: Kanban,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
        {
          name: "وظایف و پیگیری‌ها",
          href: "/tasks",
          icon: CheckSquare,
          roles: ["ADMIN", "MANAGER", "SALES"],
          badge: "3",
        },
        {
          name: "تقویم جلالی",
          href: "/calendar",
          icon: Calendar,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
      ],
    },
    {
      title: "ابزارها و هوش تجاری",
      items: [
        {
          name: "تیم فروش و عملکرد",
          href: "/team",
          icon: BarChart3,
          roles: ["ADMIN", "MANAGER"],
        },
        {
          name: "کمپین‌های پیامکی و ایمیل",
          href: "/campaigns",
          icon: Megaphone,
          roles: ["ADMIN", "MANAGER"],
        },
        {
          name: "اتوماسیون و گردش کار",
          href: "/automations",
          icon: Workflow,
          roles: ["ADMIN", "MANAGER"],
        },
        {
          name: "دستیار هوش مصنوعی",
          href: "/ai-assistant",
          icon: Sparkles,
          roles: ["ADMIN", "MANAGER", "SALES"],
          isNew: true,
        },
      ],
    },
    {
      title: "پیکربندی",
      items: [
        {
          name: "کاربران و دسترسی‌ها",
          href: "/users",
          icon: Shield,
          roles: ["ADMIN"],
        },
        {
          name: "تنظیمات سامانه",
          href: "/settings",
          icon: Settings,
          roles: ["ADMIN", "MANAGER", "SALES"],
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-l border-border bg-card/60 backdrop-blur-xl transition-all duration-300 z-20 ${
        isMini ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        {!isMini ? (
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <Pin className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <span className="font-black text-lg text-foreground tracking-tight block">
                سنجاق
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-1 font-mono tracking-wider">
                SANJAGH CRM
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/20">
              <Pin className="w-5 h-5 -rotate-45" />
            </div>
          </Link>
        )}
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => isAuthorized(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!isMini && (
                <div className="px-3 text-[11px] font-semibold text-muted-foreground/70 mb-2">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isMini ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    } ${isMini ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    {!isMini && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}

                    {!isMini && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}

                    {!isMini && item.isNew && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-extrabold animate-pulse">
                        جدید
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer / Status */}
      <div className="p-3 border-t border-border bg-card/30">
        {!isMini ? (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-foreground">سرور آنلاین</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">v1.0.0</span>
          </div>
        ) : (
          <div className="flex justify-center" title="سیستم آنلاین">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
        )}
      </div>
    </aside>
  );
}
