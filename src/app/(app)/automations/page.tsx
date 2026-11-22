"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Workflow,
  Plus,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

interface AutomationItem {
  id: string;
  name: string;
  description: string;
  trigger: string;
  isActive: boolean;
  isPreset: boolean;
  runsCount: number;
  stepsCount: number;
}

const initialAutomations: AutomationItem[] = [
  {
    id: "auto1",
    name: "خوش‌آمدگویی به سرنخ جدید (ارسال پیامک + وظیفه پیگیری)",
    description: "به محض ثبت سرنخ، پیامک خوش‌آمد ارسال شده و فردا وظیفه پیگیری ثبت می‌شود.",
    trigger: "ثبت سرنخ جدید (LEAD_CREATED)",
    isActive: true,
    isPreset: true,
    runsCount: 142,
    stepsCount: 3,
  },
  {
    id: "auto2",
    name: "یادآوری عدم پیگیری سرنخ بعد از ۷ روز رهاشدگی",
    description: "اگر ۷ روز تماسی با سرنخ برقرار نشود، یک وظیفه فوری برای کارشناس ایجاد می‌شود.",
    trigger: "عدم فعالیت ۷ روزه (LEAD_INACTIVE)",
    isActive: true,
    isPreset: true,
    runsCount: 28,
    stepsCount: 2,
  },
  {
    id: "auto3",
    name: "تبریک و شروع آنبوردینگ معامله برنده (Deal WON)",
    description: "به محض برنده شدن معامله، پیامک تشکر و وظیفه هماهنگی آموزش برای کارشناس ثبت می‌شود.",
    trigger: "برنده شدن معامله (DEAL_STAGE_CHANGED -> WON)",
    isActive: true,
    isPreset: true,
    runsCount: 64,
    stepsCount: 2,
  },
  {
    id: "auto4",
    name: "ارسال ایمیل نظرسنجی دلایل باخت معامله (Deal LOST)",
    description: "در صورت شکست معامله، ایمیل نظرسنجی جهت بهبود خدمات برای مخاطب ارسال می‌شود.",
    trigger: "از دست رفتن معامله (DEAL_STAGE_CHANGED -> LOST)",
    isActive: false,
    isPreset: true,
    runsCount: 19,
    stepsCount: 1,
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>(initialAutomations);

  const toggleActive = (id: string) => {
    setAutomations(
      automations.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-primary" />
            اتوماسیون‌های فروش و جریان کار (Workflows)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            اجرای خودکار سناریوها بر اساس رویدادهای سرنخ و معامله، ایجاد وظیفه و ارسال پیامک
          </p>
        </div>
        <Link
          href="/automations/builder"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>طراحی اتوماسیون جدید (Visual Builder)</span>
        </Link>
      </div>

      {/* Automations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((auto) => (
          <div
            key={auto.id}
            className="p-6 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5" />
                  {auto.trigger}
                </span>

                <button
                  onClick={() => toggleActive(auto.id)}
                  className="flex items-center gap-1 text-xs font-bold transition-colors"
                >
                  {auto.isActive ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <ToggleRight className="w-6 h-6" /> فعال
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ToggleLeft className="w-6 h-6" /> غیرفعال
                    </span>
                  )}
                </button>
              </div>

              <h3 className="font-bold text-foreground text-sm leading-snug">{auto.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {auto.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="font-mono">{auto.stepsCount} مرحله</span>
                <span className="font-mono text-foreground font-semibold">{auto.runsCount} بار اجرا شده</span>
              </div>

              <Link
                href="/automations/builder"
                className="text-primary font-bold hover:underline flex items-center gap-1 text-xs"
              >
                ویرایش نمودار <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
