"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/utils";
import {
  Megaphone,
  Plus,
  Send,
  MessageSquare,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Filter,
  X,
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  channel: "SMS" | "EMAIL";
  status: "DONE" | "SENDING" | "QUEUED" | "DRAFT";
  totalCount: number;
  sentCount: number;
  failedCount: number;
  date: string;
  bodyPreview: string;
}

const initialCampaigns: CampaignItem[] = [
  { id: "cmp1", name: "پیشنهاد تخفیف پاییزی اشتراک سالانه", channel: "SMS", status: "DONE", totalCount: 240, sentCount: 236, failedCount: 4, date: "20 آبان 1403", bodyPreview: "سلام {{fullName}} عزیز، به مناسبت جشنواره پاییز سنجاق..." },
  { id: "cmp2", name: "خبرنامه رونمایی از ماژول هوش مصنوعی", channel: "EMAIL", status: "DONE", totalCount: 480, sentCount: 472, failedCount: 8, date: "15 آبان 1403", bodyPreview: "کاربر گرامی {{fullName}}، با افتخار نسخه جدید CRM رونمایی شد..." },
  { id: "cmp3", name: "پیگیری سرنخ‌های نمایشگاه تهران", channel: "SMS", status: "SENDING", totalCount: 150, sentCount: 85, failedCount: 1, date: "امروز", bodyPreview: "سلام {{fullName}} گرامی، پیرو حضور گرم شما در غرفه سنجاق..." },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "SMS" as "SMS" | "EMAIL",
    subject: "",
    body: "سلام {{fullName}} عزیز،\n",
    targetAudience: "ALL",
  });

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.body) return;

    const created: CampaignItem = {
      id: `cmp_${Date.now()}`,
      name: newCampaign.name,
      channel: newCampaign.channel,
      status: "QUEUED",
      totalCount: 120,
      sentCount: 0,
      failedCount: 0,
      date: "هم‌اکنون",
      bodyPreview: newCampaign.body.slice(0, 50) + "...",
    };

    setCampaigns([created, ...campaigns]);
    setShowCreateModal(false);
    setNewCampaign({
      name: "",
      channel: "SMS",
      subject: "",
      body: "سلام {{fullName}} عزیز،\n",
      targetAudience: "ALL",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-primary" />
            کمپین‌های پیامکی و ایمیل (Campaigns)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            ارسال پیام‌های گروهی هوشمند با متغیرهای نام مشتری، صف ارسال BullMQ و گزارش تحویل
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد کمپین جدید</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {campaigns.map((cmp) => {
          const successPercent = cmp.totalCount > 0 ? Math.round((cmp.sentCount / cmp.totalCount) * 100) : 0;

          return (
            <div
              key={cmp.id}
              className="p-5 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                      cmp.channel === "SMS"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    }`}
                  >
                    {cmp.channel === "SMS" ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    {cmp.channel === "SMS" ? "پیامک انبوه" : "ایمیل مارکتینگ"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cmp.status === "DONE"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : cmp.status === "SENDING"
                        ? "bg-amber-500/10 text-amber-600 animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cmp.status === "DONE"
                      ? "پایان ارسال"
                      : cmp.status === "SENDING"
                      ? "در حال ارسال..."
                      : "در صف ارسال"}
                  </span>
                </div>

                <h3 className="font-bold text-foreground text-sm leading-snug">{cmp.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {cmp.bodyPreview}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">پیشرفت ارسال:</span>
                  <span className="font-bold font-mono text-foreground">{successPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${successPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
                  <span>کل: {cmp.totalCount}</span>
                  <span className="text-emerald-600">ارسال‌شده: {cmp.sentCount}</span>
                  <span className="text-rose-500">ناموفق: {cmp.failedCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">طراحی کمپین ارسال پیامک یا ایمیل</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">نام کمپین *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="مثال: تخفیف بلک فرایدی به سرنخ‌های داغ"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">کانال ارتباطی</label>
                  <select
                    value={newCampaign.channel}
                    onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value as any })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="SMS">پیامک (SMS عبر کاوه‌نگار)</option>
                    <option value="EMAIL">ایمیل (SMTP)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">جامعه هدف (مخاطبین)</label>
                  <select
                    value={newCampaign.targetAudience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">همه مخاطبین (۱۲۸ نفر)</option>
                    <option value="LEADS">فقط سرنخ‌های جدید (۴۲ نفر)</option>
                    <option value="CUSTOMERS">مشتریان دائم (۸۶ نفر)</option>
                    <option value="VIP">مشتریان برچسب VIP (۱۸ نفر)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">متن پیام (پشتیبانی از متغیرها)</label>
                  <span className="text-[10px] text-primary font-bold">متغیر: {"{{fullName}}"}</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary leading-relaxed font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>پیام‌ها با استفاده از متغیر {"{{fullName}}"} با نام دقیق هر مخاطب شخصی‌سازی می‌شوند.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>قرار دادن در صف ارسال</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
