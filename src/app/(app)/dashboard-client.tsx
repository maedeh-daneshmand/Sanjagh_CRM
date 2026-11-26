"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DealStage } from "@prisma/client";
import { formatNumber } from "@/lib/utils";
import { formatJalaliDate } from "@/lib/jalali";
import type { DashboardData } from "@/server/dashboard";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserCheck,
  PhoneCall,
  Mail,
  Layers,
  FileText,
} from "lucide-react";

const RevenueChart = dynamic(() => import("@/components/charts/revenue-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full flex items-center justify-center bg-muted/10 rounded-xl text-xs text-muted-foreground animate-pulse">
      در حال بارگذاری نمودار...
    </div>
  ),
});

const SourcePieChart = dynamic(() => import("@/components/charts/source-pie-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full flex items-center justify-center bg-muted/10 rounded-xl text-xs text-muted-foreground animate-pulse">
      در حال بارگذاری نمودار...
    </div>
  ),
});

const STAGE_BADGE: Record<DealStage, { label: string; color: string }> = {
  NEW: { label: "سرنخ جدید", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  CONTACTED: { label: "تماس اولیه", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  PROPOSAL: { label: "پیش‌فاکتور و دمو", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  NEGOTIATION: { label: "مذاکره نهایی", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  WON: { label: "بسته شده (موفق)", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  LOST: { label: "از دست رفته", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [chartMetric, setChartMetric] = useState<"revenue" | "deals">("revenue");
  const isSalesOnly = data.isSalesOnly;

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {isSalesOnly ? "پیشخوان کارشناس فروش" : "پیشخوان مدیریت فروش"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            خلاصه عملکرد معاملات، سرنخ‌ها و شاخص‌های کلیدی CRM سنجاق
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pipeline"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>مشاهده قیف فروش (کانبان)</span>
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-all"
          >
            <Clock className="w-4 h-4 text-primary" />
            <span>وظایف من ({data.openTasksCount} مورد)</span>
          </Link>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isSalesOnly ? "فروش تحقق‌یافته من" : "کل درآمد فروش"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-foreground font-mono">
              {formatNumber(data.totalRevenue)}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">تومان</span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              data.revenueChangePct >= 0 ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {data.revenueChangePct >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span className="font-mono">
              {data.revenueChangePct >= 0 ? `+${data.revenueChangePct}%` : `${data.revenueChangePct}%`}
            </span>
            <span className="text-muted-foreground font-normal">نسبت به ۳۰ روز قبل</span>
          </div>
        </div>

        {/* Card 2: Contacts */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isSalesOnly ? "مخاطبین تخصیص‌یافته" : "مشتریان و سرنخ‌های فعال"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-foreground font-mono">
              {formatNumber(data.totalContacts)}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">مخاطب</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono">
              {data.contactsGrowthPct >= 0 ? `+${data.contactsGrowthPct}%` : `${data.contactsGrowthPct}%`}
            </span>
            <span className="text-muted-foreground font-normal">رشد ماهانه</span>
          </div>
        </div>

        {/* Card 3: Won Deals & Win Rate */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isSalesOnly ? "معاملات برنده من" : "کل معاملات بسته شده"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-foreground font-mono">
              {formatNumber(data.wonDealsCount)}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">معامله</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono">{data.winRate}%</span>
            <span className="text-muted-foreground font-normal">نرخ تبدیل نهایی</span>
          </div>
        </div>

        {/* Card 4: Open Pipeline */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isSalesOnly ? "ارزش معاملات باز من" : "ارزش کل پایپ‌لاین باز"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-foreground font-mono">
              {formatNumber(data.openPipelineValue)}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">تومان</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>در جریان مذاکره و پیگیری</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle: Performance Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">روند فروش و درآمدهای ماهانه</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                عملکرد ۸ ماه اخیر بر اساس معاملات برنده (هزار تومان)
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setChartMetric("revenue")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === "revenue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                درآمد
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("deals")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === "deals" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                تعداد معاملات
              </button>
            </div>
          </div>

          <RevenueChart data={data.monthlySales} metric={chartMetric} />
        </div>

        {/* Right: Lead Sources Donut Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">کانال‌های جذب سرنخ</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              سهم هر منبع در ورود مخاطبین جدید
            </p>
          </div>

          <SourcePieChart data={data.leadSources} />

          <div className="space-y-2 pt-2 border-t border-border">
            {data.leadSources.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-2">
                مخاطبی ثبت نشده است
              </div>
            ) : (
              data.leadSources.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-bold text-foreground font-mono">{s.value}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Deals & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals Table (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">آخرین معاملات پایپ‌لاین</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                مذاکرات فعال و قراردادهای منعقده اخیر
              </p>
            </div>
            <Link
              href="/pipeline"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              مشاهده همه <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">عنوان معامله</th>
                  <th className="pb-3 font-semibold">شرکت / مخاطب</th>
                  <th className="pb-3 font-semibold">ارزش (تومان)</th>
                  <th className="pb-3 font-semibold">مرحله قیف</th>
                  <th className="pb-3 font-semibold">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentDeals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      هنوز معامله‌ای ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  data.recentDeals.map((d) => {
                    const badge = STAGE_BADGE[d.stage];
                    return (
                      <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-medium text-foreground">{d.title}</td>
                        <td className="py-3 text-muted-foreground">
                          <Link href={`/contacts/${d.contactId}`} className="hover:text-primary">
                            {d.company}
                          </Link>
                        </td>
                        <td className="py-3 font-bold text-foreground font-mono">{formatNumber(d.amount)}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground font-mono">
                          {formatJalaliDate(d.createdAt, "short")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities Timeline (1 col) */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">رویدادها و فعالیت‌های اخیر</h2>
              <span className="text-[10px] text-muted-foreground">تایم‌لاین زنده</span>
            </div>

            <div className="space-y-4 mt-4">
              {data.recentActivities.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  رویدادی ثبت نشده است.
                </div>
              ) : (
                data.recentActivities.map((act) => {
                  const Icon =
                    act.type === "STAGE_CHANGE" || act.type === "CONVERSION"
                      ? CheckCircle2
                      : act.type === "CALL"
                      ? PhoneCall
                      : act.type === "MESSAGE"
                      ? Mail
                      : act.type === "ASSIGNMENT"
                      ? UserCheck
                      : FileText;
                  const color =
                    act.type === "STAGE_CHANGE" || act.type === "CONVERSION"
                      ? "text-emerald-500 bg-emerald-500/10"
                      : act.type === "CALL"
                      ? "text-amber-500 bg-amber-500/10"
                      : act.type === "MESSAGE"
                      ? "text-violet-500 bg-violet-500/10"
                      : "text-blue-500 bg-blue-500/10";

                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <Link
                          href={`/contacts/${act.contactId}`}
                          className="text-xs font-bold text-foreground hover:text-primary block truncate"
                        >
                          {act.contactName}
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate">{act.body || act.type}</p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                          {formatJalaliDate(act.createdAt, "full")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Link
              href="/tasks"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              مشاهده تقویم و لیست وظایف
            </Link>
          </div>
        </div>
      </div>

      {/* Team Performance Summary (MANAGER & ADMIN only) */}
      {!isSalesOnly && data.teamPerformance && (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">خلاصه عملکرد تیم فروش</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                شاخص‌های هر کارشناس در ۳۰ روز اخیر
              </p>
            </div>
            <Link
              href="/team"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              مدیریت تیم <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">کارشناس</th>
                  <th className="pb-3 font-semibold">مخاطبان تخصیصی</th>
                  <th className="pb-3 font-semibold">معاملات برنده</th>
                  <th className="pb-3 font-semibold">درآمد (تومان)</th>
                  <th className="pb-3 font-semibold">وظایف معوقه</th>
                  <th className="pb-3 font-semibold">فعالیت ۳۰ روزه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.teamPerformance.map((rep) => (
                  <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-bold text-foreground">{rep.name}</td>
                    <td className="py-3 font-mono">{rep.assignedLeads}</td>
                    <td className="py-3 font-mono text-emerald-600 font-bold">{rep.dealsWon}</td>
                    <td className="py-3 font-mono font-bold">{formatNumber(rep.revenue)}</td>
                    <td className="py-3 font-mono">
                      {rep.overdueTasks > 0 ? (
                        <span className="text-rose-500 font-bold">{rep.overdueTasks}</span>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">{rep.activityCount30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
