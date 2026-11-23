"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUser } from "@/components/auth/user-context";
import { formatNumber } from "@/lib/utils";
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

const sourceLabels = [
  { name: "وب‌سایت مستقیم", value: 35, color: "#10b981" },
  { name: "اینستاگرام", value: 28, color: "#06b6d4" },
  { name: "معرفی و توصیه", value: 22, color: "#3b82f6" },
  { name: "شبکه‌های اجتماعی", value: 15, color: "#a855f7" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const isSalesOnly = user.role === "SALES";

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
            <span>وظایف من (3 مورد)</span>
          </Link>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
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
              {isSalesOnly ? "18,400,000" : "48,295,000"}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">تومان</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono">+12.5%</span>
            <span className="text-muted-foreground font-normal">نسبت به ماه قبل</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isSalesOnly ? "سرنخ‌های تخصیص‌یافته" : "مشتریان و سرنخ‌های فعال"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-foreground font-mono">
              {isSalesOnly ? "42" : "2,847"}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">مخاطب</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono">+8.2%</span>
            <span className="text-muted-foreground font-normal">رشد ماهانه</span>
          </div>
        </div>

        {/* Card 3 */}
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
              {isSalesOnly ? "14" : "1,432"}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">معامله</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="font-mono">-3.1%</span>
            <span className="text-muted-foreground font-normal">نرخ تبدیل نهایی</span>
          </div>
        </div>

        {/* Card 4 */}
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
              {isSalesOnly ? "95,000,000" : "284,000,000"}
            </span>
            <span className="text-xs text-muted-foreground mr-1.5 font-medium">تومان</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono">+24.7%</span>
            <span className="text-muted-foreground font-normal">پیش‌بینی تحقق</span>
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
                عملکرد ماه به ماه نسبت به اهداف سازمانی (هزار تومان)
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-[11px] font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-card text-foreground shadow-sm">درآمد</span>
              <span className="px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">تعداد معاملات</span>
            </div>
          </div>

          <RevenueChart />
        </div>

        {/* Right: Traffic / Lead Sources Donut Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">کانال‌های جذب سرنخ</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              سهم هر منبع در ورود مخاطبین جدید
            </p>
          </div>

          <SourcePieChart />

          <div className="space-y-2 pt-2 border-t border-border">
            {sourceLabels.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-bold text-foreground font-mono">{s.value}%</span>
              </div>
            ))}
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
                  <th className="pb-3 font-semibold">تاریخ سررسید</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { title: "لایسنس نرم‌افزار سازمانی", company: "توسعه نرم‌افزار نوین", val: 48000000, stage: "بسته شده (موفق)", stageColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", date: "22 آبان" },
                  { title: "پکیج سالانه اتوماسیون", company: "کلینیک دندانپزشکی مهر", val: 32500000, stage: "مذاکره نهایی", stageColor: "bg-blue-500/10 text-blue-600 border-blue-500/20", date: "28 آبان" },
                  { title: "ارتقای پلن به انترپرایز", company: "بازرگانی جهان گستر", val: 98000000, stage: "ارسال پروپوزال", stageColor: "bg-amber-500/10 text-amber-600 border-amber-500/20", date: "04 آذر" },
                  { title: "افزونه هوش مصنوعی", company: "آژانس مسافرتی پرواز", val: 14200000, stage: "سرنخ واجد شرایط", stageColor: "bg-purple-500/10 text-purple-600 border-purple-500/20", date: "10 آذر" },
                  { title: "تمدید پشتیبانی ۲۴/۷", company: "داروسازی سینا", val: 21600000, stage: "مذاکره نهایی", stageColor: "bg-blue-500/10 text-blue-600 border-blue-500/20", date: "15 آذر" },
                ].map((d, i) => (
                  <tr key={i} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 font-medium text-foreground">{d.title}</td>
                    <td className="py-3 text-muted-foreground">{d.company}</td>
                    <td className="py-3 font-bold text-foreground font-mono">{formatNumber(d.val)}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${d.stageColor}`}>
                        {d.stage}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{d.date}</td>
                  </tr>
                ))}
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
              {[
                { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", title: "معامله جدید ثبت شد", desc: "خرید اشتراک سالانه تیم ۵۰ نفره", time: "۵ دقیقه پیش" },
                { icon: UserCheck, color: "text-blue-500 bg-blue-500/10", title: "مشتری جدید اضافه شد", desc: "مهندس کامران رستمی (توسعه نرم‌افزار نوین)", time: "۱۵ دقیقه پیش" },
                { icon: PhoneCall, color: "text-amber-500 bg-amber-500/10", title: "ثبت تماس تلفنی موفق", desc: "پیگیری پروپوزال با دکتر سپهری", time: "۱ ساعت پیش" },
                { icon: Mail, color: "text-violet-500 bg-violet-500/10", title: "ارسال پیامک کمپین", desc: "تخفیف پاییزی برای ۱۲۸ مخاطب ارسال شد", time: "۲ ساعت پیش" },
              ].map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl ${act.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-foreground">{act.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{act.desc}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{act.time}</span>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}
