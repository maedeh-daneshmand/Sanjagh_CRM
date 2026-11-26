"use client";

import React, { useState } from "react";
import { Channel } from "@prisma/client";
import type { DealContactOption } from "@/server/deals";
import { draftMessageAction } from "@/server/actions/ai";
import { sendSingleMessageAction } from "@/server/actions/messages";
import {
  Sparkles,
  Bot,
  Send,
  Copy,
  Check,
  MessageSquare,
  Mail,
  Zap,
  Flame,
  AlertCircle,
} from "lucide-react";

export default function AiAssistantClient({
  contacts,
  aiConfigured,
  aiModel,
}: {
  contacts: DealContactOption[];
  aiConfigured: boolean;
  aiModel: string;
}) {
  const [tone, setTone] = useState<"formal" | "friendly" | "short" | "persuasive">("friendly");
  const [channel, setChannel] = useState<Channel>(Channel.SMS);
  const [contactId, setContactId] = useState(contacts[0]?.id || "");
  const [contextNote, setContextNote] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const handleGenerateMessage = async () => {
    if (!contactId) {
      setErrorMsg("لطفاً ابتدا یک مخاطب را انتخاب کنید.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setSentMsg(null);

    const res = await draftMessageAction({
      contactId,
      channel,
      tone,
      contextNote,
    });

    setIsGenerating(false);

    if (!res.ok || !res.data) {
      setErrorMsg(res.error || "خطا در تولید پیش‌نویس پیام");
      return;
    }

    setDraftSubject(res.data.subject || "");
    setGeneratedDraft(res.data.body);
  };

  const handleCopy = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInQueue = async () => {
    if (!contactId || !generatedDraft.trim()) return;
    setIsSending(true);
    setErrorMsg(null);

    const res = await sendSingleMessageAction({
      contactId,
      channel,
      subject: channel === Channel.EMAIL ? draftSubject || "پیام پیگیری" : null,
      body: generatedDraft.trim(),
    });

    setIsSending(false);
    if (!res.ok) {
      setErrorMsg(res.error || "خطا در ارسال پیام به صف");
      return;
    }
    setSentMsg("پیام با موفقیت در صف ارسال BullMQ قرار گرفت.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-primary" />
            مرکز دستیار هوش مصنوعی سنجاق (AI Copilot)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            نگارش هوشمند پیام‌های پیگیری، خلاصه‌سازی مذاکرات و پیشنهاد اقدام بعدی
          </p>
        </div>
      </div>

      {!aiConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            سرویس هوش مصنوعی پیکربندی نشده است (متغیر محیطی <code>AI_API_KEY</code> تنظیم نشده است).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Follow-up Message Drafter */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              نویسنده هوشمند پیام‌های پیگیری (Follow-up Message Writer)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono">
              {aiModel}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {sentMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
              {sentMsg}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">انتخاب مخاطب / مشتری</label>
                {contacts.length === 0 ? (
                  <div className="p-2.5 bg-muted/40 border border-border rounded-xl text-muted-foreground">
                    مخاطبی ثبت نشده است
                  </div>
                ) : (
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">کانال ارسال</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel(Channel.SMS)}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      channel === Channel.SMS
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    پیامک (SMS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel(Channel.EMAIL)}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      channel === Channel.EMAIL
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    ایمیل (Email)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5">لحن پیام (Tone)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: "friendly", name: "دوستانه و صمیمی" },
                    { id: "formal", name: "رسمی و اداری" },
                    { id: "short", name: "کوتاه و تلگرافی" },
                    { id: "persuasive", name: "ترغیبی و تشویقی" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      tone === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">شرح وضعیت و نیاز پیگیری (اختیاری)</label>
              <textarea
                rows={3}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="توضیح دهید پیام برای چه هدفی و در پاسخ به کدام جلسه یا پیش‌فاکتور تنظیم شود..."
                className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateMessage}
              disabled={isGenerating || !contactId}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "در حال نگارش هوشمند با AI..." : "تولید متن پیام پیشنهادی"}</span>
            </button>

            {/* Output Box (Editable) */}
            {generatedDraft && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> متن تولیدشده (قابل ویرایش):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-bold hover:bg-muted transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? "کپی شد" : "کپی متن"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendInQueue}
                      disabled={isSending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      {isSending ? "در حال صف‌بندی..." : "ارسال در صف پیام"}
                    </button>
                  </div>
                </div>
                {channel === Channel.EMAIL && (
                  <input
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="عنوان ایمیل..."
                    className="w-full p-2 bg-card border border-border rounded-xl text-xs"
                  />
                )}
                <textarea
                  rows={5}
                  value={generatedDraft}
                  onChange={(e) => setGeneratedDraft(e.target.value)}
                  className="w-full p-3 bg-card rounded-xl border border-border text-xs leading-relaxed text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Capabilities & Info */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Zap className="w-4 h-4 text-primary" />
              قابلیت‌های هوش مصنوعی سنجاق
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
                <div className="font-bold text-foreground">۱. خلاصه‌سازی ۳۶۰ درجه مشتری</div>
                <p className="text-[11px]">تحلیل خودکار ۳۰ فعالیت اخیر در پروفایل مخاطب و پیشنهاد گام بعدی عملی.</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
                <div className="font-bold text-foreground">۲. یادداشت هوشمند (Smart Note)</div>
                <p className="text-[11px]">استخراج خودکار وظیفه و تغییر مرحله از متن یادداشت‌های شما با تایید انسانی.</p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
                <div className="font-bold text-foreground">۳. تولید پیام شخصی‌سازی‌شده</div>
                <p className="text-[11px]">نگارش پیامک و ایمیل متناسب با سابقه مخاطب و ارسال مستقیم در صف BullMQ.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 text-[11px] text-primary font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0" />
              <span>تمامی تغییرات پیشنهادی AI فقط پس از تایید شما اعمال می‌شوند.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
