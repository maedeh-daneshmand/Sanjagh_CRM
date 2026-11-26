"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { updateProfileAction } from "@/server/actions/users";
import { Settings, Check } from "lucide-react";

export default function SettingsClient({
  initialProfile,
  usage,
}: {
  initialProfile: {
    name: string;
    phone: string;
    email: string;
    role: Role;
  };
  usage: {
    messagesSentCount: number;
    activeUsersCount: number;
    aiRequestsCount: number;
  };
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "security">("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(null);
    const res = await updateProfileAction({
      name: profile.name,
      email: profile.email,
    });
    setSaving(false);
    if (!res.ok) {
      alert(res.error || "خطا در ذخیره پروفایل");
      return;
    }
    setSavedMessage("تغییرات پروفایل با موفقیت ذخیره شد.");
    setTimeout(() => setSavedMessage(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-primary" />
          تنظیمات حساب و سامانه
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          مدیریت پروفایل کاربری، آمار مصرف واقعی و امنیت نشست‌ها
        </p>
      </div>

      {/* Tabs */}
      <div className="p-1 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-1 text-xs font-semibold max-w-md">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          پروفایل کاربری
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "billing"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          آمار مصرف سامانه
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "security"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          امنیت و نشست‌ها
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          className="p-6 rounded-3xl bg-card border border-border shadow-sm max-w-2xl space-y-5"
        >
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
            اطلاعات هویتی و پرسنلی
          </h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-md">
              {profile.name[0] || "U"}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">{profile.name}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{profile.phone}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold mt-1 inline-block">
                نقش:{" "}
                {profile.role === "ADMIN"
                  ? "مدیر ارشد"
                  : profile.role === "MANAGER"
                  ? "مدیر فروش"
                  : "کارشناس فروش"}
              </span>
            </div>
          </div>

          {savedMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
              {savedMessage}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">شماره تماس (شناسه ورود)</label>
                <input
                  type="text"
                  readOnly
                  value={profile.phone}
                  className="w-full p-2.5 bg-muted/20 border border-border rounded-xl font-mono text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">ایمیل سازمانی</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="name@company.ir"
                className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "در حال ذخیره..." : "ذخیره تغییرات پروفایل"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Real Usage Tab */}
      {activeTab === "billing" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm max-w-2xl space-y-5">
          <h3 className="font-bold text-xs text-foreground border-b border-border pb-3">
            گزارش واقعی مصرف منابع در پایگاه‌داده
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground">پیام‌های ارسال‌شده:</span>
              <div className="text-xl font-black font-mono text-foreground">
                {usage.messagesSentCount}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground">کاربران فعال تیم:</span>
              <div className="text-xl font-black font-mono text-primary">
                {usage.activeUsersCount}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground">تحلیل‌ها و پیشنهادهای AI:</span>
              <div className="text-xl font-black font-mono text-purple-600">
                {usage.aiRequestsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
            امنیت و ورود یکبار مصرف (OTP)
          </h2>

          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              ورود به نرم‌افزار CRM سنجاق به صورت بدون رمز عبور و با کد یکبار مصرف پیامکی (OTP) با محدودیت تلاش در سطح سرور و ریدیس امن شده است.
            </p>
            <div className="p-4 rounded-2xl bg-muted/40 space-y-2">
              <div className="font-bold text-foreground">وضعیت نشست جاری:</div>
              <div className="flex items-center justify-between text-[11px]">
                <span>توکن امضاشده (httpOnly Cookie)</span>
                <span className="text-emerald-600 font-bold font-mono">معتبر و فعال</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
