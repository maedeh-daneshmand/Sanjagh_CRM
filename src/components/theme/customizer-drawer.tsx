"use client";

import React from "react";
import {
  useThemeCustomizer,
  ColorPalette,
  Density,
  LayoutMode,
} from "./theme-context";
import {
  X,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Sliders,
  Shield,
  UserCheck,
  Briefcase,
} from "lucide-react";

export function CustomizerDrawer() {
  const {
    theme,
    setTheme,
    color,
    setColor,
    density,
    setDensity,
    layout,
    setLayout,
    direction,
    setDirection,
    actingRole,
    setActingRole,
    isCustomizerOpen,
    setIsCustomizerOpen,
    resetDefaults,
  } = useThemeCustomizer();

  if (!isCustomizerOpen) return null;

  const colorOptions: { id: ColorPalette; name: string; bg: string }[] = [
    { id: "emerald", name: "زمردی (Emerald)", bg: "bg-emerald-500" },
    { id: "blue", name: "آبی (Blue)", bg: "bg-blue-600" },
    { id: "violet", name: "بنفش (Violet)", bg: "bg-violet-600" },
    { id: "rose", name: "رز (Rose)", bg: "bg-rose-500" },
    { id: "orange", name: "نارنجی (Orange)", bg: "bg-orange-500" },
    { id: "slate", name: "سنگی (Slate)", bg: "bg-slate-500" },
  ];

  const layoutOptions: { id: LayoutMode; name: string; desc: string }[] = [
    { id: "sidebar", name: "سایدبار کامل", desc: "نوار کناری عمودی استاندارد" },
    { id: "mini", name: "مینی (آیکون‌ها)", desc: "سایدبار باریک فقط آیکون" },
    { id: "compact", name: "فشرده", desc: "ارتفاع و عرض بهینه" },
    { id: "floating", name: "شناور", desc: "کارت منوی معلق" },
    { id: "top-nav", name: "نوار بالا (Top Nav)", desc: "منوی افقی در سربرگ" },
    { id: "hybrid", name: "ترکیبی (Hybrid)", desc: "آیکون چپ + زیرمنوی بازشو" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-card border-r border-border shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                شخصی‌سازی ظاهر سنجاق
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                تنظیم رنگ‌ها، چیدمان نوار ابزار و نقش کاربری
              </p>
            </div>
            <button
              onClick={() => setIsCustomizerOpen(false)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 space-y-7 flex-1">
            {/* Theme Mode */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                حالت تم (Theme)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === "light"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Sun className="w-5 h-5 mb-1.5" />
                  روشن
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Moon className="w-5 h-5 mb-1.5" />
                  تاریک
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === "system"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Monitor className="w-5 h-5 mb-1.5" />
                  سیستم
                </button>
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                پالت رنگ سازمانی (Color)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {colorOptions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      color === c.id
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${c.bg} shrink-0 flex items-center justify-center text-white`}>
                      {color === c.id && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className="truncate">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                تراکم نمایش (Density)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["compact", "comfortable", "spacious"] as Density[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      density === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {d === "compact" && "فشرده"}
                    {d === "comfortable" && "استاندارد"}
                    {d === "spacious" && "باز و راحت"}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Mode */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                چیدمان نوار ابزار و منو (Layout)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {layoutOptions.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id)}
                    className={`text-right p-3 rounded-xl border text-xs transition-all ${
                      layout === l.id
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-foreground mb-0.5">{l.name}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                جهت چیدمان (Direction)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDirection("rtl")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    direction === "rtl"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  راست‌به‌چپ (RTL - فارسی)
                </button>
                <button
                  onClick={() => setDirection("ltr")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    direction === "ltr"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  چپ‌به‌راست (LTR)
                </button>
              </div>
            </div>

            {/* Acting Role Switcher */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  شبیه‌سازی نقش کاربری (Demo Role)
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">دمو فوری</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActingRole("ADMIN")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    actingRole === "ADMIN"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Shield className="w-4 h-4 mb-1" />
                  مدیر ارشد
                </button>
                <button
                  onClick={() => setActingRole("MANAGER")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    actingRole === "MANAGER"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Briefcase className="w-4 h-4 mb-1" />
                  مدیر فروش
                </button>
                <button
                  onClick={() => setActingRole("SALES")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    actingRole === "SALES"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <UserCheck className="w-4 h-4 mb-1" />
                  کارشناس
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                با تعویض این گزینه منوها، دسترسی‌ها و آمارهای داشبورد بلافاصله به دید کارشناس یا مدیر تغییر می‌کند.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <button
              onClick={resetDefaults}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              بازنشانی به تنظیمات اولیه
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
