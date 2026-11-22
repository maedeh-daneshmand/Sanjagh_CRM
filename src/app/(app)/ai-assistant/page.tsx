"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function AiAssistantPage() {
  const [tone, setTone] = useState<"formal" | "friendly" | "short" | "persuasive">("friendly");
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [contactName, setContactName] = useState("مهندس رستمی");
  const [contextNote, setContextNote] = useState("مشتری پیش‌فاکتور ۵۰ لایسنس را دیده ولی هنوز پرداخت نکرده است.");
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateMessage = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let draft = "";
      if (channel === "SMS") {
        if (tone === "friendly") {
          draft = `سلام ${contactName} عزیز، وقتتون بخیر. پیش‌فاکتور ارسالی خدمتتون رسید؟ در صورت نیاز به هرگونه توضیحات تکمیلی یا بررسی شرایط پرداخت، در خدمتتون هستم. ارادتمند، علی رضایی - CRM سنجاق`;
        } else if (tone === "formal") {
          draft = `جناب آقای ${contactName}، با سلام و احترام. پیرو مذاکرات قبلی، پیش‌فاکتور صادرشده تقدیم حضور گردید. خواهشمند است در صورت تایید مراتب را جهت نهایی‌سازی قرارداد اعلام فرمایید. با تشکر، واحد فروش سنجاق`;
        } else if (tone === "short") {
          draft = `سلام ${contactName} عزیز، پیش‌فاکتور ۵۰ لایسنس ارسال شد. آیا فرصت بررسی فراهم گردید؟ با احترام، سنجاق`;
        } else {
          draft = `سلام ${contactName} گرامی، به اطلاع می‌رساند تخفیف ۵ درصدی جشنواره پاییزه تنها تا پایان هفته روی پیش‌فاکتور شما معتبر خواهد بود. برای نهایی‌سازی با ما در تماس باشید. سنجاق`;
        }
      } else {
        draft = `موضوع: پیگیری پیش‌فاکتور شماره ۱۴۰۳/۸۸۲ و نهایی‌سازی قرارداد\n\nبا سلام و احترام خدمت شما ${contactName} گرامی،\n\nپیرو جلسه آنلاین و توافقات حاصله، نسخه نهایی پیش‌فاکتور به پیوست تقدیم می‌گردد.\nتیم فنی ما کلیه نیازمندی‌های استقرار و آموزش کاربران شما را تدوین نموده است. خوشحال می‌شویم در صورت تایید، زمان مناسب جهت عقد قرارداد رسمی را هماهنگ فرمایید.\n\nبا تجدید احترام،\nتیم فروش CRM سنجاق`;
      }
      setGeneratedDraft(draft);
      setIsGenerating(false);
    }, 900);
  };

  const handleCopy = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            نگارش هوشمند پیام‌های پیگیری، خلاصه‌سازی مذاکرات، تحلیل احساسات و پیشنهاد اقدام بعدی
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Follow-up Message Drafter */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              نویسنده هوشمند پیام‌های پیگیری (Follow-up Message Writer)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
              مدل gpt-4o-mini
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">نام مخاطب / مشتری</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">کانال ارسال</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setChannel("SMS")}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      channel === "SMS"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    پیامک (SMS)
                  </button>
                  <button
                    onClick={() => setChannel("EMAIL")}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      channel === "EMAIL"
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
              <label className="block font-semibold mb-1">شرح وضعیت و نیاز پیگیری</label>
              <textarea
                rows={3}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="توضیح دهید پیام برای چه هدفی و در پاسخ به کدام جلسه یا پیش‌فاکتور تنظیم شود..."
                className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>

            <button
              onClick={handleGenerateMessage}
              disabled={isGenerating}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "در حال نگارش هوشمند پیام..." : "تولید پیش‌نویس با هوش مصنوعی"}</span>
            </button>
          </div>

          {/* Generated Result Output */}
          {generatedDraft && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3 pt-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">متن تولید شده توسط AI:</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl border border-border hover:bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "کپی شد!" : "کپی متن"}</span>
                </button>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {generatedDraft}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => alert("پیام در صف ارسال هوشمند BullMQ قرار گرفت.")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال مستقیم به مخاطب</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: AI Capabilities Info */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground border-b border-border pb-3">
              قابلیت‌های هوش مصنوعی فعال
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> خلاصه‌سازی هوشمند مشتری ۳۶۰
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  تحلیل خودکار ۳۰ فعالیت و تماس آخر مشتری، ارزیابی میزان ریسک و ارائه گام بعدی.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                <div className="font-bold text-blue-600 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> یادداشت هوشمند (Smart Note)
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  تبدیل متن‌های آزاد کارشناسان به وظایف ساختاریافته و تغییر خودکار مرحله معامله.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> امتیاز حرارتی هوشمند سرنخ‌ها
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  محاسبه پویای اولویت بر اساس منبع ورودی، زمان آخرین تماس و تمایل به خرید.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
