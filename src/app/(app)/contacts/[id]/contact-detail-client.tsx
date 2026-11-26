"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { formatJalaliDate } from "@/lib/jalali";
import { ContactDetailData, AssignableUser } from "@/server/contacts";
import {
  addNoteAction,
  convertLeadToCustomerAction,
  logActivityAction,
  assignOwnerAction,
} from "@/server/actions/contacts";
import { sendSingleMessageAction } from "@/server/actions/messages";
import {
  summarizeContactAction,
  analyzeNoteAction,
  approveSuggestionAction,
  rejectSuggestionAction,
} from "@/server/actions/ai";
import { AiSuggestionPayload } from "@/lib/schemas/ai";
import { Channel } from "@prisma/client";
import { useUser } from "@/components/auth/user-context";
import { OwnerSelect } from "@/components/contacts/owner-select";
import {
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bot,
  Send,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  Flame,
  ArrowRightLeft,
  UserCheck,
  Check,
  X,
} from "lucide-react";

export default function ContactDetailClient({
  initialContact,
  assignableUsers,
}: {
  initialContact: ContactDetailData;
  assignableUsers: AssignableUser[];
}) {
  const { user } = useUser();
  const canAssign = user.role === "ADMIN" || user.role === "MANAGER";

  const [activeTab, setActiveTab] = useState<"timeline" | "deals" | "tasks" | "messages">("timeline");
  const [contact, setContact] = useState<ContactDetailData>(initialContact);
  const [activities, setActivities] = useState(initialContact.activities);
  const [messages, setMessages] = useState(initialContact.messages);
  const [msgChannel, setMsgChannel] = useState<Channel>(Channel.SMS);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [activityType, setActivityType] = useState<"NOTE" | "CALL" | "MEETING">("NOTE");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // AI Feature 1: Summary & Next Step
  const [aiSummary, setAiSummary] = useState<{ summary: string; risk: string | null; nextStep: string | null } | null>(
    initialContact.aiSummary
  );
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Feature 2: Smart Note Parser suggestions
  const formatSuggestionCard = (s: {
    id: string;
    type: string;
    payload: unknown;
    status: string;
  }) => {
    const p = s.payload as AiSuggestionPayload;
    let title = s.type;
    let desc = "";
    if (p?.type === "CREATE_TASK") {
      title = `ایجاد وظیفه: ${p.title}`;
      desc = p.dueAt ? `سررسید: ${formatJalaliDate(p.dueAt, "full")}` : `اولویت: ${p.priority}`;
    } else if (p?.type === "CHANGE_DEAL_STAGE") {
      title = `انتقال معامله به مرحله ${p.toStage}`;
      desc = p.reason || "پیشنهاد تغییر مرحله معامله";
    } else if (p?.type === "CHANGE_LEAD_STATUS") {
      title = `تغییر وضعیت سرنخ به ${p.status}`;
      desc = p.reason || "پیشنهاد تغییر وضعیت سرنخ";
    }
    return {
      id: s.id,
      type: s.type,
      title,
      desc,
      status: s.status as "PENDING" | "ACCEPTED" | "REJECTED",
    };
  };

  const [smartNoteText, setSmartNoteText] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(
    (initialContact.aiSuggestions || []).map(formatSuggestionCard)
  );
  const [isAnalyzingSmartNote, setIsAnalyzingSmartNote] = useState(false);
  const [decidingSugId, setDecidingSugId] = useState<string | null>(null);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);

    if (activityType === "NOTE") {
      const res = await addNoteAction({
        contactId: contact.id,
        body: newNote.trim(),
      });

      setIsSubmittingNote(false);
      if (!res.ok) {
        alert(res.error || "خطا در ثبت یادداشت");
        return;
      }
    } else {
      const res = await logActivityAction({
        contactId: contact.id,
        type: activityType,
        body: newNote.trim(),
      });

      setIsSubmittingNote(false);
      if (!res.ok) {
        alert(res.error || "خطا در ثبت رویداد");
        return;
      }
    }

    setActivities([
      {
        id: `act_${Date.now()}`,
        type: activityType,
        body: newNote.trim(),
        meta: null,
        createdAt: new Date().toISOString(),
        userName: "شما",
      },
      ...activities,
    ]);
    setNewNote("");
  };

  const handleConvertLead = async () => {
    const res = await convertLeadToCustomerAction(contact.id);
    if (!res.ok) {
      alert(res.error || "خطا در تبدیل سرنخ");
      return;
    }

    setContact({ ...contact, kind: "CUSTOMER" });
    setActivities([
      {
        id: `act_${Date.now()}`,
        type: "CONVERSION",
        body: "این مخاطب رسماً با موفقیت به جمع مشتریان سنجاق پیوست.",
        meta: null,
        createdAt: new Date().toISOString(),
        userName: "سیستم",
      },
      ...activities,
    ]);
  };

  const handleAssignOwner = async (newOwnerId: string | null) => {
    setIsAssigning(true);
    const res = await assignOwnerAction({ contactId: contact.id, ownerId: newOwnerId });
    setIsAssigning(false);

    if (!res.ok) {
      alert(res.error || "خطا در تخصیص کارشناس");
      return;
    }

    const fromName = contact.owner?.name || contact.ownerName || "تخصیص‌نیافته";
    const toName = res.data?.ownerName || "تخصیص‌نیافته";
    const assignedUser = assignableUsers.find((u) => u.id === newOwnerId) || null;

    setContact({
      ...contact,
      ownerId: newOwnerId,
      ownerName: res.data?.ownerName ?? null,
      owner: assignedUser
        ? { id: assignedUser.id, name: assignedUser.name, phone: assignedUser.phone }
        : null,
    });

    setActivities([
      {
        id: `act_${Date.now()}`,
        type: "ASSIGNMENT",
        body: `مالکیت مخاطب از «${fromName}» به «${toName}» تغییر یافت`,
        meta: null,
        createdAt: new Date().toISOString(),
        userName: user.name,
      },
      ...activities,
    ]);
  };

  const handleGenerateAiSummary = async () => {
    setLoadingAiSummary(true);
    setAiError(null);
    const res = await summarizeContactAction(contact.id);
    setLoadingAiSummary(false);

    if (!res.ok || !res.data) {
      setAiError(res.error || "خطا در دریافت خلاصه هوشمند");
      return;
    }

    setAiSummary(res.data);
  };

  const handleAnalyzeSmartNote = async () => {
    if (!smartNoteText.trim()) return;
    setIsAnalyzingSmartNote(true);
    setAiError(null);

    const res = await analyzeNoteAction(contact.id, smartNoteText);
    setIsAnalyzingSmartNote(false);

    if ("noteActivity" in res && res.noteActivity) {
      setActivities((prev) => [res.noteActivity!, ...prev]);
      setSmartNoteText("");
    }

    if (!res.ok || !res.data) {
      setAiError(res.error || "خطا در تحلیل هوشمند یادداشت");
      return;
    }

    const newCards = res.data.suggestions.map((s) =>
      formatSuggestionCard({
        id: s.id,
        type: s.type,
        payload: s.payload,
        status: s.status,
      })
    );
    setAiSuggestions((prev) => [...newCards, ...prev]);
  };

  const handleDecideSuggestion = async (sugId: string, action: "ACCEPTED" | "REJECTED") => {
    setDecidingSugId(sugId);
    const res =
      action === "ACCEPTED"
        ? await approveSuggestionAction(sugId)
        : await rejectSuggestionAction(sugId);
    setDecidingSugId(null);

    if (!res.ok) {
      alert(res.error || "خطا در اعمال تصمیم");
      return;
    }

    setAiSuggestions(
      aiSuggestions.map((s) => (s.id === sugId ? { ...s, status: action } : s))
    );
  };

  const isHot = contact.score >= 80;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={contact.kind === "CUSTOMER" ? "/contacts" : "/leads"}
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
            <p className="text-xs text-muted-foreground mt-0.5">
              {contact.company || "شخصی"} {contact.city ? ` - ${contact.city}` : ""}
            </p>
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

      {/* AI Error / Not Configured Notice */}
      {aiError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-between">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)} className="p-1 hover:bg-amber-500/10 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
        {/* Info Card (1 col) */}
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
                <span className="font-mono font-bold text-foreground">{contact.phone || "-"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> ایمیل
                </span>
                <span className="text-foreground">{contact.email || "-"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> شرکت
                </span>
                <span className="font-bold text-foreground">{contact.company || "-"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> شهر
                </span>
                <span className="text-foreground">{contact.city || "-"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">منبع ورودی</span>
                <span className="px-2 py-0.5 rounded bg-muted text-foreground">{contact.source}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">کارشناس مسئول</span>
                {canAssign ? (
                  <OwnerSelect
                    users={assignableUsers}
                    value={contact.ownerId}
                    onChange={handleAssignOwner}
                    compact
                    disabled={isAssigning}
                  />
                ) : (
                  <span className="font-semibold text-foreground">
                    {contact.owner?.name || contact.ownerName || "تخصیص‌نیافته"}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">امتیاز حرارتی سرنخ</span>
                <div className="flex items-center gap-1 font-bold font-mono">
                  {isHot && <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                  <span className={isHot ? "text-rose-500" : "text-foreground"}>
                    {contact.score} / 100
                  </span>
                </div>
              </div>
            </div>

            {contact.tags.length > 0 && (
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
            )}
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
              placeholder="مثال: با مخاطب صحبت شد قرارداد ۵۰ لایسنس رو قبول کردند، قراره فردا ساعت ۱۴ تماس بگیرم پیش‌فاکتور نهایی رو بفرستم..."
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
                          disabled={decidingSugId === sug.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> رد
                        </button>
                        <button
                          onClick={() => handleDecideSuggestion(sug.id, "ACCEPTED")}
                          disabled={decidingSugId === sug.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
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

        {/* Tabs & Timeline (2 cols) */}
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
              تایم‌لاین و رویدادها ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab("deals")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "deals"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              معاملات ({contact.deals.length})
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "tasks"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              وظایف و پیگیری‌ها ({contact.tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 py-2 rounded-xl transition-all ${
                activeTab === "messages"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              پیام‌ها ({messages.length})
            </button>
          </div>

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Quick Add Note Box */}
              <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => setActivityType("NOTE")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        activityType === "NOTE" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      یادداشت
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityType("CALL")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        activityType === "CALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      تماس تلفنی
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityType("MEETING")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        activityType === "MEETING" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      جلسه
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="ثبت یادداشت، نتیجه تماس یا هماهنگی جلسه..."
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <PhoneCall className="w-4 h-4 cursor-pointer hover:text-primary" onClick={() => setActivityType("CALL")} />
                      <Video className="w-4 h-4 cursor-pointer hover:text-primary" onClick={() => setActivityType("MEETING")} />
                      <FileText className="w-4 h-4 cursor-pointer hover:text-primary" onClick={() => setActivityType("NOTE")} />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingNote}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingNote ? "در حال ثبت..." : "ثبت رویداد"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Activities Stream */}
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    هنوز رویدادی برای این مخاطب ثبت نشده است.
                  </div>
                ) : (
                  activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-start gap-3.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        {act.type === "CALL" ? (
                          <PhoneCall className="w-4 h-4" />
                        ) : act.type === "MEETING" ? (
                          <Video className="w-4 h-4" />
                        ) : act.type === "MESSAGE" ? (
                          <MessageSquare className="w-4 h-4" />
                        ) : act.type === "ASSIGNMENT" ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">
                            {act.type === "CALL"
                              ? "تماس تلفنی"
                              : act.type === "MEETING"
                              ? "جلسه"
                              : act.type === "CONVERSION"
                              ? "تبدیل به مشتری"
                              : act.type === "STATUS_CHANGE"
                              ? "تغییر وضعیت"
                              : act.type === "ASSIGNMENT"
                              ? "تخصیص کارشناس"
                              : "یادداشت"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatJalaliDate(act.createdAt, "short")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{act.body}</p>
                        {act.userName && (
                          <div className="text-[10px] text-slate-400 pt-1">ثبت توسط: {act.userName}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <div className="space-y-3">
              {contact.deals.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  معامله‌ای برای این مخاطب ثبت نشده است.
                </div>
              ) : (
                contact.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{deal.title}</h4>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatJalaliDate(deal.createdAt, "short")}
                      </span>
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
                ))
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {contact.tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  وظیفه یا پیگیری فعالی ثبت نشده است.
                </div>
              ) : (
                contact.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        className={`w-4 h-4 ${task.status === "DONE" ? "text-emerald-500" : "text-muted-foreground"}`}
                      />
                      <div>
                        <h4 className="font-bold text-xs text-foreground">{task.title}</h4>
                        {task.dueAt && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            مهلت: {formatJalaliDate(task.dueAt, "short")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        task.status === "DONE"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {task.status === "DONE" ? "انجام شده" : "در انتظار اقدام"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!msgBody.trim()) return;
                  setSendingMsg(true);
                  const res = await sendSingleMessageAction({
                    contactId: contact.id,
                    channel: msgChannel,
                    subject: msgSubject || null,
                    body: msgBody.trim(),
                  });
                  setSendingMsg(false);
                  if (!res.ok || !res.data) {
                    alert(res.error || "خطا در ارسال پیام");
                    return;
                  }
                  setMessages([res.data, ...messages]);
                  setMsgBody("");
                  setMsgSubject("");
                }}
                className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMsgChannel(Channel.SMS)}
                    className={`px-3 py-1.5 rounded-xl font-bold ${
                      msgChannel === Channel.SMS ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    پیامک (SMS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgChannel(Channel.EMAIL)}
                    className={`px-3 py-1.5 rounded-xl font-bold ${
                      msgChannel === Channel.EMAIL ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    ایمیل (Email)
                  </button>
                </div>

                {msgChannel === Channel.EMAIL && (
                  <input
                    type="text"
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    placeholder="عنوان ایمیل..."
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                )}

                <textarea
                  rows={3}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="متن پیام (می‌توانید از {{fullName}} استفاده کنید)..."
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingMsg ? "در حال صف‌بندی..." : "ارسال در صف BullMQ"}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    هنوز پیامی برای این مخاطب ثبت نشده است.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-foreground font-mono">
                          [{m.channel}] {m.toAddress}
                        </div>
                        <p className="text-muted-foreground">{m.body}</p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatJalaliDate(m.createdAt, "full")}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          m.status === "SENT"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : m.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {m.status === "SENT" ? "ارسال شد" : m.status === "FAILED" ? "ناموفق" : "در صف"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
