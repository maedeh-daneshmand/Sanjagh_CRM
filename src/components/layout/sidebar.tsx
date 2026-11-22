"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeCustomizer } from "../theme/theme-context";
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
  ChevronDown,
  Pin,
  HelpCircle,
  FolderGit2,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { layout, actingRole } = useThemeCustomizer();
  const [collapsed, setCollapsed] = useState(false);

  const isMini = layout === "mini" || collapsed;

  const isAuthorized = (allowedRoles: string[]) => {
    return allowedRoles.includes(actingRole);
  };

  const menuSections = [
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
          name: "دستیار هوشمند AI",
          href: "/ai-assistant",
          icon: Sparkles,
          roles: ["ADMIN", "MANAGER", "SALES"],
          badge: "جدید",
        },
      ],
    },
    {
      title: "سیستم و تنظیمات",
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

  if (layout === "top-nav") {
    // If top-nav is active, we render horizontal navigation in header
    return null;
  }

  return (
    <aside
      className={`relative z-20 shrink-0 transition-all duration-300 border-l border-border bg-[#0f172a] text-slate-100 flex flex-col justify-between ${
        isMini ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
            <Pin className="w-5 h-5" />
          </div>
          {!isMini && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                سنجاق
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-emerald-400">
                  CRM
                </span>
              </span>
              <span className="text-[11px] text-slate-400">سامانه مدیریت فروش</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {menuSections.map((sec, idx) => {
          const visibleItems = sec.items.filter((item) => isAuthorized(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!isMini && (
                <div className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  {sec.title}
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/25"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    } ${isMini ? "justify-center" : ""}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {!isMini && <span className="flex-1 truncate">{item.name}</span>}
                    {!isMini && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Card at bottom */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors ${isMini ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
            {actingRole === "ADMIN" ? "AD" : actingRole === "MANAGER" ? "MN" : "SL"}
          </div>
          {!isMini && (
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {actingRole === "ADMIN"
                  ? "مدیر ارشد سیستم"
                  : actingRole === "MANAGER"
                  ? "مدیر فروش"
                  : "کارشناس فروش"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {actingRole === "ADMIN"
                  ? "دسترسی نامحدود"
                  : actingRole === "MANAGER"
                  ? "نظارت و تقسیم کار"
                  : "مخاطبین و معاملات من"}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
