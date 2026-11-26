"use client";

import React, { useState, useEffect } from "react";
import { Channel, ContactKind, LeadStatus, Source } from "@prisma/client";
import type { SerializableCampaign, FailedCampaignMessage } from "@/server/campaigns";
import type { AssignableUser } from "@/server/contacts";
import type { AudienceFilter } from "@/server/queue/worker";
import {
  createAndSendCampaignAction,
  previewCampaignAudienceAction,
  refreshCampaignsAction,
  getCampaignFailedMessagesAction,
} from "@/server/actions/campaigns";
import { retryFailedMessageAction } from "@/server/actions/messages";
import { formatJalaliDate } from "@/lib/jalali";
import {
  Megaphone,
  Plus,
  Send,
  MessageSquare,
  Mail,
  Sparkles,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function CampaignsClient({
  initialCampaigns,
  assignableUsers,
}: {
  initialCampaigns: SerializableCampaign[];
  assignableUsers: AssignableUser[];
}) {
  const [campaigns, setCampaigns] = useState<SerializableCampaign[]>(initialCampaigns);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Audience preview count
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [countingAudience, setCountingAudience] = useState(false);

  // Failed messages drawer
  const [failedModalCampaign, setFailedModalCampaign] = useState<SerializableCampaign | null>(null);
  const [failedMessages, setFailedMessages] = useState<FailedCampaignMessage[]>([]);
  const [loadingFailed, setLoadingFailed] = useState(false);

  const [newCampaign, setNewCampaign] = useState<{
    name: string;
    channel: Channel;
    subject: string;
    body: string;
    filter: AudienceFilter;
  }>({
    name: "",
    channel: Channel.SMS,
    subject: "",
    body: "سلام {{fullName}} عزیز،\n",
    filter: {
      kind: "ALL",
      source: "ALL",
      leadStatus: "ALL",
      ownerId: "ALL",
    },
  });

  // Auto-refresh when any campaign is QUEUED or SENDING
  const hasActiveCampaign = campaigns.some(
    (c) => c.status === "QUEUED" || c.status === "SENDING"
  );

  useEffect(() => {
    if (!hasActiveCampaign) return;
    const interval = setInterval(async () => {
      const res = await refreshCampaignsAction();
      if (res.ok && res.data) {
        setCampaigns(res.data);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [hasActiveCampaign]);

  const updatePreviewCount = async (channel: Channel, filter: AudienceFilter) => {
    setCountingAudience(true);
    const res = await previewCampaignAudienceAction(channel, filter);
    setCountingAudience(false);
    if (res.ok && res.data) {
      setAudienceCount(res.data.count);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setFormError(null);
    void updatePreviewCount(newCampaign.channel, newCampaign.filter);
  };

  const handleFilterChange = (patch: Partial<AudienceFilter>) => {
    const nextFilter = { ...newCampaign.filter, ...patch };
    setNewCampaign((prev) => ({ ...prev, filter: nextFilter }));
    void updatePreviewCount(newCampaign.channel, nextFilter);
  };

  const handleChannelChange = (channel: Channel) => {
    setNewCampaign((prev) => ({ ...prev, channel }));
    void updatePreviewCount(channel, newCampaign.filter);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim() || !newCampaign.body.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const res = await createAndSendCampaignAction({
      name: newCampaign.name.trim(),
      channel: newCampaign.channel,
      subject: newCampaign.subject.trim() || null,
      body: newCampaign.body,
      filter: newCampaign.filter,
    });

    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setFormError(res.error || "خطا در ایجاد کمپین");
      return;
    }

    setCampaigns([res.data, ...campaigns]);
    setShowCreateModal(false);
    setNewCampaign({
      name: "",
      channel: Channel.SMS,
      subject: "",
      body: "سلام {{fullName}} عزیز،\n",
      filter: { kind: "ALL", source: "ALL", leadStatus: "ALL", ownerId: "ALL" },
    });
  };

  const handleOpenFailed = async (cmp: SerializableCampaign) => {
    setFailedModalCampaign(cmp);
    setLoadingFailed(true);
    const res = await getCampaignFailedMessagesAction(cmp.id);
    setLoadingFailed(false);
    if (res.ok && res.data) {
      setFailedMessages(res.data);
    }
  };

  const handleRetryMessage = async (msgId: string) => {
    const res = await retryFailedMessageAction(msgId);
    if (!res.ok) {
      alert(res.error || "خطا در ارسال مجدد");
      return;
    }
    setFailedMessages((prev) => prev.filter((m) => m.id !== msgId));
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const res = await refreshCampaignsAction();
              if (res.ok && res.data) setCampaigns(res.data);
            }}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
            title="به‌روزرسانی وضعیت"
          >
            <RefreshCw className={`w-4 h-4 ${hasActiveCampaign ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد کمپین جدید</span>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border text-xs text-muted-foreground">
          هنوز کمپینی ایجاد نشده است. برای شروع روی «ایجاد کمپین جدید» کلیک کنید.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {campaigns.map((cmp) => {
            const successPercent =
              cmp.totalCount > 0 ? Math.round((cmp.sentCount / cmp.totalCount) * 100) : 0;

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
                      {cmp.channel === "SMS" ? (
                        <MessageSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      {cmp.channel === "SMS" ? "پیامک انبوه" : "ایمیل مارکتینگ"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cmp.status === "DONE"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : cmp.status === "SENDING"
                          ? "bg-amber-500/10 text-amber-600 animate-pulse"
                          : cmp.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cmp.status === "DONE"
                        ? "ارسال تکمیل شد"
                        : cmp.status === "SENDING"
                        ? "در حال ارسال..."
                        : cmp.status === "FAILED"
                        ? "ناموفق"
                        : "در صف ارسال"}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-foreground pt-1">{cmp.name}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {cmp.body}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">پیشرفت ارسال:</span>
                      <span className="font-mono font-bold text-foreground">
                        {cmp.sentCount} / {cmp.totalCount} ({successPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${successPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">{formatJalaliDate(cmp.createdAt, "short")}</span>
                    {cmp.failedCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleOpenFailed(cmp)}
                        className="text-rose-500 font-bold font-mono hover:underline flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {cmp.failedCount} ناموفق (بررسی)
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold">بدون خطا</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">طراحی و ارسال کمپین جدید</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">نام کمپین *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="مثال: تخفیف ویژه تمدید قراردادها"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">کانال ارسال</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChannelChange(Channel.SMS)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      newCampaign.channel === Channel.SMS
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    پیامک (SMS)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChannelChange(Channel.EMAIL)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      newCampaign.channel === Channel.EMAIL
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    ایمیل (Email)
                  </button>
                </div>
              </div>

              {newCampaign.channel === Channel.EMAIL && (
                <div>
                  <label className="block font-semibold mb-1">عنوان ایمیل (Subject)</label>
                  <input
                    type="text"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    placeholder="موضوع ایمیل را بنویسید..."
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Audience Filter Builder */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">فیلتر مخاطبان هدف</span>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {countingAudience
                      ? "در حال شمارش..."
                      : `گیرندگان واجد شرایط: ${audienceCount ?? 0} نفر`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={newCampaign.filter.kind || "ALL"}
                    onChange={(e) =>
                      handleFilterChange({ kind: e.target.value as ContactKind | "ALL" })
                    }
                    className="p-2 bg-card border border-border rounded-xl text-[11px]"
                  >
                    <option value="ALL">همه مخاطبین (سرنخ + مشتری)</option>
                    <option value="LEAD">فقط سرنخ‌ها</option>
                    <option value="CUSTOMER">فقط مشتریان دائم</option>
                  </select>

                  <select
                    value={newCampaign.filter.source || "ALL"}
                    onChange={(e) =>
                      handleFilterChange({ source: e.target.value as Source | "ALL" })
                    }
                    className="p-2 bg-card border border-border rounded-xl text-[11px]"
                  >
                    <option value="ALL">همه کانال‌های ورود</option>
                    <option value="WEBSITE">وب‌سایت</option>
                    <option value="INSTAGRAM">اینستاگرام</option>
                    <option value="TELEGRAM">تلگرام</option>
                    <option value="REFERRAL">معرفی</option>
                    <option value="PHONE">تماس تلفنی</option>
                    <option value="EVENT">رویداد</option>
                  </select>

                  <select
                    value={newCampaign.filter.leadStatus || "ALL"}
                    onChange={(e) =>
                      handleFilterChange({ leadStatus: e.target.value as LeadStatus | "ALL" })
                    }
                    className="p-2 bg-card border border-border rounded-xl text-[11px]"
                  >
                    <option value="ALL">همه وضعیت‌های پیگیری</option>
                    <option value="NEW">جدید</option>
                    <option value="CONTACTED">تماس گرفته شده</option>
                    <option value="QUALIFIED">واجد شرایط</option>
                  </select>

                  <select
                    value={newCampaign.filter.ownerId || "ALL"}
                    onChange={(e) => handleFilterChange({ ownerId: e.target.value })}
                    className="p-2 bg-card border border-border rounded-xl text-[11px]"
                  >
                    <option value="ALL">همه کارشناسان</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">متن پیام *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewCampaign({ ...newCampaign, body: newCampaign.body + " {{fullName}} " })
                    }
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> درج متغیر نام مشتری
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  placeholder="متن پیام خود را بنویسید..."
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary leading-relaxed"
                />
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "در حال صف‌بندی..." : "ارسال فوری در صف"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Failed Messages Modal */}
      {failedModalCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">
                پیام‌های ناموفق: {failedModalCampaign.name}
              </h3>
              <button
                onClick={() => setFailedModalCampaign(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingFailed ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                در حال بارگذاری...
              </div>
            ) : failedMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                پیام ناموفقی یافت نشد.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {failedMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-foreground truncate">
                        {m.contactName || "مخاطب"} ({m.toAddress})
                      </div>
                      <div className="text-[11px] text-rose-500 truncate">
                        {m.error || "خطای نامشخص"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRetryMessage(m.id)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold shrink-0 hover:opacity-90"
                    >
                      تلاش مجدد
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
