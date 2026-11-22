"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/utils";
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building,
  User,
  DollarSign,
  TrendingUp,
  X,
} from "lucide-react";

type StageKey = "NEW" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

interface DealCard {
  id: string;
  title: string;
  contactName: string;
  company: string;
  amount: number;
  stage: StageKey;
  owner: string;
  dueDays: number;
}

const STAGES: { key: StageKey; title: string; color: string; border: string }[] = [
  { key: "NEW", title: "سرنخ جدید", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300", border: "border-slate-500/20" },
  { key: "CONTACTED", title: "تماس و ارزیابی", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  { key: "PROPOSAL", title: "پیش‌فاکتور و دمو", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  { key: "NEGOTIATION", title: "مذاکره نهایی", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  { key: "WON", title: "بسته شده (برنده)", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  { key: "LOST", title: "از دست رفته", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
];

const initialDeals: DealCard[] = [
  { id: "d1", title: "خرید لایسنس ۵۰ کاربره", contactName: "مهندس کامران رستمی", company: "توسعه نرم‌افزار نوین", amount: 48000000, stage: "NEW", owner: "علی رضایی", dueDays: 5 },
  { id: "d2", title: "مشاوره استقرار CRM", contactName: "علیرضا جعفری", company: "پخش عمده البرز", amount: 25000000, stage: "NEW", owner: "مریم کاظمی", dueDays: 3 },
  { id: "d3", title: "ارتقای نسخه سازمانی", contactName: "پیمان صادقی", company: "بازرگانی جهان گستر", amount: 98000000, stage: "CONTACTED", owner: "علی رضایی", dueDays: 7 },
  { id: "d4", title: "سفارشی‌سازی اتوماسیون", contactName: "بابک میرزایی", company: "واردات قطعات الکترونیک", amount: 32500000, stage: "CONTACTED", owner: "حسین عباسی", dueDays: 2 },
  { id: "d5", title: "قرارداد سالانه پشتیبانی طلایی", contactName: "دکتر نیلوفر سپهری", company: "کلینیک دندانپزشکی مهر", amount: 36000000, stage: "PROPOSAL", owner: "مریم کاظمی", dueDays: 4 },
  { id: "d6", title: "لایسنس ماژول هوش مصنوعی", contactName: "سینا داوودی", company: "استارتاپ لجستیک بارنت", amount: 28000000, stage: "PROPOSAL", owner: "علی رضایی", dueDays: 6 },
  { id: "d7", title: "پکیج کامل پایپ‌لاین و پیامک", contactName: "فاطمه بهرامی", company: "موسسه آموزشی رشد", amount: 84000000, stage: "NEGOTIATION", owner: "مریم کاظمی", dueDays: 1 },
  { id: "d8", title: "استقرار سرور اختصاصی", contactName: "شیما حیدری", company: "داروسازی سینا", amount: 125000000, stage: "NEGOTIATION", owner: "حسین عباسی", dueDays: 2 },
  { id: "d9", title: "تمدید اشتراک سال دوم", contactName: "زهرا ملکی", company: "آژانس مسافرتی پرواز", amount: 14200000, stage: "WON", owner: "علی رضایی", dueDays: 0 },
  { id: "d10", title: "خرید ۵۰ خط پیامک ابری", contactName: "محسن کریمی", company: "صنایع غذایی ترنج", amount: 45000000, stage: "WON", owner: "حسین عباسی", dueDays: 0 },
  { id: "d11", title: "اشتراک آزمایشی یک‌ماهه", contactName: "الهام باقری", company: "استودیو عکاسی نور", amount: 12000000, stage: "LOST", owner: "مریم کاظمی", dueDays: 0 },
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<DealCard[]>(initialDeals);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: "",
    contactName: "",
    company: "",
    amount: "",
    stage: "NEW" as StageKey,
    owner: "علی رضایی",
  });

  const moveStage = (dealId: string, direction: "next" | "prev") => {
    const stageOrder: StageKey[] = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

    setDeals(
      deals.map((deal) => {
        if (deal.id !== dealId) return deal;
        const currentIdx = stageOrder.indexOf(deal.stage);
        const nextIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0 || nextIdx >= stageOrder.length) return deal;
        return { ...deal, stage: stageOrder[nextIdx] };
      })
    );
  };

  const totalPipelineValue = deals
    .filter((d) => d.stage !== "LOST")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const wonDealsValue = deals
    .filter((d) => d.stage === "WON")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.amount) return;

    const created: DealCard = {
      id: `d_${Date.now()}`,
      title: newDeal.title,
      contactName: newDeal.contactName || "مشتری جدید",
      company: newDeal.company || "سازمان",
      amount: Number(newDeal.amount) || 0,
      stage: newDeal.stage,
      owner: newDeal.owner,
      dueDays: 7,
    };

    setDeals([created, ...deals]);
    setShowAddDealModal(false);
    setNewDeal({
      title: "",
      contactName: "",
      company: "",
      amount: "",
      stage: "NEW",
      owner: "علی رضایی",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Kanban className="w-6 h-6 text-primary" />
            قیف فروش و پایپ‌لاین معاملات (Kanban)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مدیریت گام‌به‌گام مذاکرات فروش، پیش‌بینی درآمد و انتقال کارت‌های معامله
          </p>
        </div>
        <button
          onClick={() => setShowAddDealModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت معامله جدید</span>
        </button>
      </div>

      {/* Pipeline Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">ارزش کل پایپ‌لاین فعال</span>
            <div className="text-lg font-black text-foreground font-mono mt-0.5">
              {formatNumber(totalPipelineValue)}
              <span className="text-xs text-muted-foreground mr-1">تومان</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">فروش محقق‌شده (برنده)</span>
            <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
              {formatNumber(wonDealsValue)}
              <span className="text-xs text-muted-foreground mr-1">تومان</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">تعداد کل معاملات</span>
            <div className="text-lg font-black text-foreground font-mono mt-0.5">
              {deals.length}
              <span className="text-xs text-muted-foreground mr-1">فقره قرارداد</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Kanban Board with 6 Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {STAGES.map((st) => {
          const stageDeals = deals.filter((d) => d.stage === st.key);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.amount, 0);

          return (
            <div
              key={st.key}
              className="w-80 shrink-0 bg-muted/40 rounded-3xl p-3 flex flex-col max-h-[750px] border border-border/80"
            >
              {/* Column Header */}
              <div className="p-3 rounded-2xl bg-card border border-border shadow-sm mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${st.color}`}>
                    {st.title}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-mono font-bold">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground font-mono">
                  {formatNumber(stageTotal)} تومان
                </div>
              </div>

              {/* Deal Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageDeals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
                    معامله‌ای در این مرحله نیست
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-2">
                          {deal.title}
                        </h4>
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{deal.company}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{deal.contactName}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-xs font-black text-foreground font-mono">
                          {formatNumber(deal.amount)} <span className="text-[10px] text-muted-foreground font-normal">تومان</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {deal.owner}
                        </span>
                      </div>

                      {/* Move Buttons */}
                      <div className="flex items-center justify-between pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveStage(deal.id, "prev")}
                          disabled={st.key === "NEW"}
                          className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="مرحله قبل"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">انتقال مرحله</span>
                        <button
                          onClick={() => moveStage(deal.id, "next")}
                          disabled={st.key === "LOST" || st.key === "WON"}
                          className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="مرحله بعد"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">افزودن معامله جدید به پایپ‌لاین</h3>
              <button
                onClick={() => setShowAddDealModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان معامله *</label>
                <input
                  type="text"
                  required
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="مثال: خرید اشتراک سالانه ۵۰ کاربره"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">نام مخاطب یا خریدار</label>
                  <input
                    type="text"
                    value={newDeal.contactName}
                    onChange={(e) => setNewDeal({ ...newDeal, contactName: e.target.value })}
                    placeholder="مهندس رستمی"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">شرکت</label>
                  <input
                    type="text"
                    value={newDeal.company}
                    onChange={(e) => setNewDeal({ ...newDeal, company: e.target.value })}
                    placeholder="توسعه نرم‌افزار نوین"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">مبلغ معامله (تومان - عدد انگلیسی) *</label>
                  <input
                    type="number"
                    required
                    value={newDeal.amount}
                    onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
                    placeholder="48000000"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">مرحله شروع</label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as StageKey })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90"
                >
                  ایجاد معامله
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
