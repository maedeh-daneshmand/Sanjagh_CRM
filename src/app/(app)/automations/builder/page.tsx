"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Save,
  ArrowRight,
  Zap,
  Clock,
  MessageSquare,
  CheckSquare,
  CheckCircle2,
} from "lucide-react";

export default function AutomationBuilderPage() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestRun = () => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult("تست اتوماسیون با موفقیت انجام شد: پیامک شبیه‌سازی شد و وظیفه برای کارشناس فروش در صف قرار گرفت.");
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/automations"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-foreground">طراح بصری گردش کار (Visual Automation Builder)</h1>
            <p className="text-xs text-muted-foreground">ترسیم نمودار محرک‌ها (Trigger)، شرایط (Condition) و اقدامات (Actions)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestRun}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            <span>{isTesting ? "در حال اجرای تست..." : "اجرای تست با مخاطب نمونه"}</span>
          </button>
          <button
            onClick={() => alert("گردش کار با موفقیت ذخیره و فعال شد.")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره اتوماسیون</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Visual Canvas */}
      <div className="p-8 rounded-3xl bg-muted/30 border border-border min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Node 1: Trigger */}
        <div className="w-80 p-5 rounded-2xl bg-card border-2 border-primary shadow-lg space-y-2 text-right relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">محرک (Trigger)</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-bold text-xs text-foreground">ثبت سرنخ جدید در سیستم</h4>
          <p className="text-[11px] text-muted-foreground">رویداد LEAD_CREATED با هر کانال ورودی</p>
        </div>

        {/* Connector Line 1 */}
        <div className="w-0.5 h-10 bg-primary/40 relative">
          <div className="w-2 h-2 rounded-full bg-primary absolute -bottom-1 -left-[3px]" />
        </div>

        {/* Node 2: Action 1 */}
        <div className="w-80 p-5 rounded-2xl bg-card border border-border shadow-md space-y-2 text-right">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">اقدام ۱ (Action)</span>
            <MessageSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="font-bold text-xs text-foreground">ارسال پیامک خوش‌آمدگویی</h4>
          <p className="text-[11px] text-muted-foreground">ارسال به شماره سرنخ از خط خدماتی کاوه‌نگار</p>
        </div>

        {/* Connector Line 2 */}
        <div className="w-0.5 h-10 bg-primary/40 relative">
          <div className="w-2 h-2 rounded-full bg-primary absolute -bottom-1 -left-[3px]" />
        </div>

        {/* Node 3: Delay/Wait */}
        <div className="w-80 p-4 rounded-2xl bg-card border border-border shadow-md space-y-1 text-right">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">تأخیر (Wait)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="font-bold text-xs text-foreground">صبر به مدت ۲۴ ساعت</h4>
        </div>

        {/* Connector Line 3 */}
        <div className="w-0.5 h-10 bg-primary/40 relative">
          <div className="w-2 h-2 rounded-full bg-primary absolute -bottom-1 -left-[3px]" />
        </div>

        {/* Node 4: Action 2 */}
        <div className="w-80 p-5 rounded-2xl bg-card border border-border shadow-md space-y-2 text-right">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">اقدام ۲ (Action)</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="font-bold text-xs text-foreground">ایجاد وظیفه پیگیری برای کارشناس</h4>
          <p className="text-[11px] text-muted-foreground">ثبت وظیفه تماس تلفنی با اولویت بالا</p>
        </div>
      </div>
    </div>
  );
}
