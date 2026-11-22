"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNumber, formatToman } from "@/lib/utils";
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Bot,
  Send,
  Plus,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  Flame,
  ArrowRightLeft,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Tag,
} from "lucide-react";

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"timeline" | "deals" | "tasks" | "messages">("timeline");

  // Contact State
  const [contact, setContact] = useState({
    id: params.id,
    fullName: "مهندس کامران رستمی",
    company: "توسعه نرم‌افزار نوین",
    kind: "LEAD" as "LEAD" | "CUSTOMER",
    phone: "0910000001",
    email: "rostami@novin.com",
    city: "تهران",
    source: "وب‌سایت مستقیم",
    leadStatus: "QUALIFIED",
    priority: "HIGH",
    score: 88,
    tags: ["VIP", "نرم‌افزار", "سازمانی"],
    owner: "علی رضایی",
  });

  // Timeline Activities
  const [activities, setActivities] = useState([
    { id: "a1", type: "NOTE", title: "یادداشت جلسه آنلاین", body: "مشتری درخواست استقرار نسخه سازمانی به همراه ۵۰ لایسنس داشت و تخفیف ویژه سالانه می‌خواهد.", date: "امروز - ۱۰:۳۰", author: "علی رضایی" },
    { id: "a2", type: "CALL", title: "تماس تلفنی با مدیر خرید", body: "بررسی نیازمندی‌های سخت‌افزاری و پروتکل امنیت داده. بسیار راضی بودند.", date: "دیروز - ۱۶:۴۵", author: "علی رضایی" },
    { id: "a3", type: "STAGE_CHANGE", title: "تغییر مرحله معامله", body: "معامله از مرحله «تماس اولیه» به «مذاکره نهایی» انتقال داده شد.", date: "۲ روز پیش", author: "سیستم" },
    { id: "a4", type: "MESSAGE", title: "ارسال پیامک تایید پیش‌فاکتور", body: "پیش‌فاکتور شماره ۱۴۰۳/۸۸۲ با موفقیت به شماره مشتری پیامک شد.", date: "۳ روز پیش", author: "اتوماسیون" },
  ]);

  // Deals
  const [deals, setDeals] = useState([
    { id: "d1", title: "خرید لایسنس ۵۰ کاربره سازمانی", amount: 48000000, stage: "مذاکره نهایی", date: "22 آبان 1403" },
    { id: "d2", title: "قرارداد سالانه پشتیبانی ۲۴/۷", amount: 24000000, stage: "پیش‌فاکتور و دمو", date: "30 آبان 1403" },
  ]);

  // Tasks
  const [tasks, setTasks] = useState([
    { id: "t1", title: "هماهنگی جلسه آنلاین با مدیر فنی", due: "فردا ساعت ۱۱:۰۰", status: "TODO" },
    { id: "t2", title: "ارسال نسخه نهایی قرارداد و پیش‌فاکتور", due: "امروز تا پایان وقت اداری", status: "TODO" },
  ]);

  // New Note
  const [newNote, setNewNote] = useState("");

  // AI Feature 1: Summary & Next Step
  const [aiSummary, setAiSummary] = useState<{ summary: string; risk: string; nextStep: string } | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  // AI Feature 2: Smart Note Parser suggestions
  const [smartNoteText, setSmartNoteText] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAnalyzingSmartNote, setIsAnalyzingSmartNote] = useState(false);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;

    setActivities([
      {
        id: `a_${Date.now()}`,
        type: "NOTE",
        title: "یادداشت جدید کارشناس",
        body: newNote,
        date: "هم‌اکنون",
        author: "علی رضایی",
      },
      ...activities,
    ]);
    setNewNote("");
  };

  const handleConvertLead = () => {
    setContact({ ...contact, kind: "CUSTOMER" });
    setActivities([
      {
        id: `a_${Date.now()}`,
        type: "CONVERSION",
        title: "تبدیل سرنخ به مشتری دائم",
        body: "این مخاطب رسماً با عقد اولین قرارداد به جمع مشتریان سنجاق پیوست.",
        date: "هم‌اکنون",
        author: "سیستم",
      },
      ...activities,
    ]);
  };

  const handleGenerateAiSummary = () => {
    setLoadingAiSummary(true);
    setTimeout(() => {
      setAiSummary({
        summary:
          "مشتری کاملاً آماده خرید لایسنس ۵۰ کاربره است. دو جلسه فنی موفق برگزار شده و دغدغه اصلی آنها تخفیف ۵ درصدی روی پرداخت نقدی سالانه است.",
        risk: "پایین (احتمال ۹۰٪ برنده شدن معامله)",
        nextStep: "ارسال الحاقیه تخفیف نقدی سالانه و تماس تلفنی برای امضای نهایی قرارداد تا فردا.",
      });
      setLoadingAiSummary(false);
    }, 1200);
  };

  const handleAnalyzeSmartNote = () => {
    if (!smartNoteText) return;
    setIsAnalyzingSmartNote(true);

    setTimeout(() => {
      setAiSuggestions([
        {
          id: "sug1",
          type: "CREATE_TASK",
          title: "ایجاد وظیفه خودکار: پیگیری قرارداد امضا شده",
          desc: "فردا ساعت ۱۴:۰۰ با مدیر فنی شرکت نوین تماس گرفته شود.",
          status: "PENDING",
        },
        {
          id: "sug2",
          type: "CHANGE_DEAL_STAGE",
          title: "انتقال معامله به مرحله برنده (WON)",
          desc: "انتقال معامله «خرید لایسنس ۵۰ کاربره» از مذاکره به وضعیت برنده.",
          status: "PENDING",
        },
      ]);
      setIsAnalyzingSmartNote(false);
    }, 1000);
  };

  const handleDecideSuggestion = (sugId: string, action: "ACCEPTED" | "REJECTED") => {
    setAiSuggestions(
      aiSuggestions.map((s) => (s.id === sugId ? { ...s, status: action } : s))
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground">{contact.fullName}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  contact.kind === "CUSTOMER"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                }`}
              >
                {contact.kind === "CUSTOMER" ? "مشتری دائم" : "سرنخ فروش"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{contact.company} - {contact.city}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {contact.kind === "LEAD" && (
            <button
              onClick={handleConvertLead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>تبدیل به مشتری</span>
            </button>
          )}

          <button
            onClick={handleGenerateAiSummary}
            disabled={loadingAiSummary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingAiSummary ? "در حال تحلیل هوشمند..." : "خلاصه هوشمند AI و گام بعدی"}</span>
          </button>
        </div>
      </div>

      {/* AI Summary Box (if generated) */}
      {aiSummary && (
        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-2">
              <Bot className="w-4 h-4" />
              خلاصه وضعیت و پیشنهاد هوش مصنوعی
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
              ریسک: {aiSummary.risk}
            </span>
          </div>
          <p className="text-xs text-foreground leading-relaxed font-medium">{aiSummary.summary}</p>
          <div className="pt-2 border-t border-primary/10 flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span>گام بعدی پیشنهادی:</span>
            <span className="text-foreground">{aiSummary.nextStep}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Info Sidebar & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Right Info Card (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground border-b border-border pb-3">
              اطلاعات پروفایل و تماس
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> شماره موبایل
                </span>
                <span className="font-mono font-bold text-foreground">{contact.phone}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> ایمیل
                </span>
                <span className="text-foreground">{contact.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> شرکت
                </span>
                <span className="font-bold text-foreground">{contact.company}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> شهر
                </span>
                <span className="text-foreground">{contact.city}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">منبع ورودی</span>
                <span className="px-2 py-0.5 rounded bg-muted text-foreground">{contact.source}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">کارشناس مسئول</span>
                <span className="font-semibold text-foreground">{contact.owner}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">امتیاز حرارتی سرنخ</span>
                <div className="flex items-center gap-1 font-bold text-rose-500 font-mono">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{contact.score} / 100</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-2">برچسب‌ها:</span>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Note with AI Suggestions */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                یادداشت هوشمند (Smart Note)
              </h3>
            </div>
            <textarea
              rows={3}
              value={smartNoteText}
              onChange={(e) => setSmartNoteText(e.target.value)}
              placeholder="مثال: با مهندس رستمی صحبت کردم قرارداد ۵۰ لایسنس رو قبول کردن، قراره فردا ساعت ۱۴ تماس بگیرم پیش‌فاکتور نهایی رو بفرستم..."
              className="w-full p-3 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none focus:border-primary leading-relaxed"
            />
            <button
              onClick={handleAnalyzeSmartNote}
              disabled={isAnalyzingSmartNote || !smartNoteText}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAnalyzingSmartNote ? "در حال استخراج پیشنهادها..." : "استخراج وظایف و اقدامات با هوش مصنوعی"}</span>
            </button>

            {/* AI Suggestion Cards */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground">پیشنهادهای استخراج‌شده:</span>
                {aiSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                      sug.status === "ACCEPTED"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : sug.status === "REJECTED"
                        ? "bg-rose-500/10 border-rose-500/30 opacity-60"
                        : "bg-muted/40 border-border"
                    }`}
                  >
                    <div className="font-bold text-foreground">{sug.title}</div>
                    <div className="text-[11px] text-muted-foreground">{sug.desc}</div>

                    {sug.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleDecideSuggestion(sug.id, "REJECTED")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10"
                        >
                          <X className="w-3 h-3" /> رد
                        </button>
                        <button
                          onClick={() => handleDecideSuggestion(sug.id, "ACCEPTED")}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-sm"
                        >
                          <Check className="w-3 h-3" /> تأیید و اعمال
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-right">
                        {sug.status === "ACCEPTED" ? (
                          <span className="text-emerald-600">✓ تأیید شد و به سیستم اضافه شد</span>
                        ) : (
                          <span className="text-rose-500">✗ رد شد</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right/Left Tabs & Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs Header */}
          <div className="p-1 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "timeline"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تایم‌لاین و یادداشت‌ها ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab("deals")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "deals"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              معاملات ({deals.length})
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "tasks"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              وظایف و پیگیری‌ها ({tasks.length})
            </button>
          </div>

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Quick Add Note Box */}
              <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="ثبت یادداشت، نتیجه تماس یا هماهنگی جدید..."
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <PhoneCall className="w-4 h-4 cursor-pointer hover:text-primary" />
                      <Video className="w-4 h-4 cursor-pointer hover:text-primary" />
                      <FileText className="w-4 h-4 cursor-pointer hover:text-primary" />
                    </div>
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ثبت رویداد</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Activities Stream */}
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === "CALL" ? (
                        <PhoneCall className="w-4 h-4" />
                      ) : act.type === "MESSAGE" ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{act.title}</span>
                        <span className="text-[10px] text-muted-foreground">{act.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{act.body}</p>
                      <div className="text-[10px] text-slate-400 pt-1">ثبت توسط: {act.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <div className="space-y-3">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{deal.title}</h4>
                    <span className="text-[11px] text-muted-foreground">{deal.date}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-bold font-mono text-xs text-foreground">
                      {formatNumber(deal.amount)} تومان
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{task.title}</h4>
                      <span className="text-[10px] text-muted-foreground">{task.due}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    در انتظار اقدام
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
