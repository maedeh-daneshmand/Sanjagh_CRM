"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThemeCustomizer } from "../theme/theme-context";
import { useUser } from "../auth/user-context";
import { logoutAction } from "@/server/actions/auth";
import {
  Search,
  Plus,
  Palette,
  Sun,
  Moon,
  Bell,
  Sliders,
  LogOut,
  User,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";

export function AppHeader({ onOpenNewDeal }: { onOpenNewDeal?: () => void }) {
  const router = useRouter();
  const { theme, setTheme, setIsCustomizerOpen } = useThemeCustomizer();
  const { user } = useUser();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getInitials = () => {
    if (user.name && user.name.trim().length > 0) {
      const parts = user.name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    return user.role === "ADMIN" ? "AD" : user.role === "MANAGER" ? "MN" : "SL";
  };

  const getRoleLabel = () => {
    switch (user.role) {
      case "ADMIN":
        return "مدیر ارشد";
      case "MANAGER":
        return "مدیر فروش";
      case "SALES":
        return "کارشناس فروش";
      default:
        return user.role;
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      {/* Right side: Search bar & Command K */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در مخاطبین، معامله‌ها، وظایف... (#K)"
            className="w-full pl-9 pr-9 py-2 bg-muted/50 hover:bg-muted focus:bg-background border border-border rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Left side actions */}
      <div className="flex items-center gap-2.5">
        {/* Quick Action Button: New Deal / Order */}
        <button
          onClick={onOpenNewDeal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت معامله جدید</span>
        </button>

        {/* Theme mode toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="تغییر تم تاریک/روشن"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Palette / Customizer Drawer Button */}
        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="p-2 rounded-xl border border-border hover:bg-muted text-primary hover:text-primary transition-colors relative"
          title="شخصی‌سازی ظاهر و رنگ‌بندی"
        >
          <Palette className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-primary absolute top-1.5 left-1.5 animate-pulse" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
            title="اعلان‌ها و یادآوری‌ها"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl p-3 space-y-2 z-50 text-right">
              <div className="flex items-center justify-between pb-2 border-b border-border px-1">
                <span className="text-xs font-bold text-foreground">اعلان‌های اخیر</span>
                <span className="text-[10px] text-muted-foreground">3 مورد جدید</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                <div className="p-2 rounded-xl hover:bg-muted text-xs transition-colors flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">معامله جدید با موفقیت بسته شد</p>
                    <p className="text-[10px] text-muted-foreground">خرید اشتراک سالانه تیم ۵۰ نفره - ۱۰ دقیقه پیش</p>
                  </div>
                </div>
                <div className="p-2 rounded-xl hover:bg-muted text-xs transition-colors flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">یادآوری تماس با دکتر سپهری</p>
                    <p className="text-[10px] text-muted-foreground">پیگیری پیش‌فاکتور ارسالی - ۱ ساعت پیش</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shadow-sm">
              {getInitials()}
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl p-2 z-50 text-right space-y-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-bold text-foreground truncate">
                  {user.name} ({getRoleLabel()})
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{user.phone}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setUserDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>پروفایل و اطلاعات من</span>
              </Link>
              <button
                onClick={() => {
                  setIsCustomizerOpen(true);
                  setUserDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-colors text-right"
              >
                <Sliders className="w-4 h-4 text-muted-foreground" />
                <span>تنظیمات ظاهر و تم</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-destructive/10 text-destructive transition-colors text-right"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج از حساب</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
