"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/utils";
import { useThemeCustomizer } from "@/components/theme/theme-context";
import {
  Settings,
  User,
  CreditCard,
  Shield,
  Palette,
  Check,
  Zap,
  Building,
  Mail,
  Phone,
  Sliders,
} from "lucide-react";

export default function SettingsPage() {
  const { actingRole, setIsCustomizerOpen } = useThemeCustomizer();
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "security">("profile");

  const [profile, setProfile] = useState({
    name: "مدیر ارشد سنجاق",
    phone: "09123456789",
    email: "admin@sanjagh.ir",
    company: "سامانه مدیریت ارتباط با مشتری سنجاق",
    bio: "راهبر ارشد سیستم فروش و توسعه نرم‌افزار",
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-primary" />
          تنظیمات حساب و سامانه
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          مدیریت پروفایل کاربری، اشتراک و لایسنس، امنیت و اتصال خطوط ارتباطی
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
          اشتراک و لایسنس (Billing)
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
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm max-w-2xl space-y-5">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
            اطلاعات هویتی و پرسنلی
          </h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-md">
              {profile.name[0]}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">{profile.name}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{profile.phone}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold mt-1 inline-block">
                نقش: {actingRole}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">ایمیل سازمانی</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">نام سازمان / برند</label>
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">درباره و بیوگرافی</label>
              <textarea
                rows={2}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => alert("تغییرات پروفایل با موفقیت ذخیره شد.")}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab matching Screenshot (101).png */}
      {activeTab === "billing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">پلن فعلی: نسخه پیشرفته سازمانی (Pro Plan)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">لایسنس فعال تا پایان سال ۱۴۰۴</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                فعال
              </span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-black text-foreground font-mono">1,490,000</span>
              <span className="text-xs text-muted-foreground mr-1.5">تومان / ماهانه</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                "پایپ‌لاین نامحدود معاملات و کانبان",
                "اتصال مستقیم وب‌سایت، اینستاگرام و تلگرام",
                "اتصال پنل پیامکی کاوه‌نگار با خط اختصاصی",
                "دستیار هوش مصنوعی تحلیل مکالمات و یادداشت هوشمند",
                "اتوماسیون‌های نامحدود و جریان کار بصری",
                "پشتیبانی فنی ۲۴ ساعته و SLA طلایی",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-foreground font-medium">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border flex items-center gap-3">
              <button
                onClick={() => alert("درگاه پرداخت در حال شبیه‌سازی است.")}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-90"
              >
                تمدید یا ارتقای اشتراک
              </button>
            </div>
          </div>

          {/* Usage meters */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4 flex flex-col justify-between">
            <h3 className="font-bold text-xs text-foreground border-b border-border pb-3">
              میزان مصرف منابع ماه جاری
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">پیامک‌های ارسال‌شده:</span>
                  <span className="font-mono font-bold">1,840 / 5,000</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[36%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">کاربران فعال تیم:</span>
                  <span className="font-mono font-bold">5 / 10 صندلی</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[50%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">درخواست‌های هوش مصنوعی:</span>
                  <span className="font-mono font-bold">420 / 1,000</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-[42%]" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 text-[11px] text-muted-foreground">
              دوره بعدی تمدید منابع: <strong>۰۱ دی ۱۴۰۳</strong>
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
              <div className="font-bold text-foreground">نشست‌های فعال شما:</div>
              <div className="flex items-center justify-between text-[11px]">
                <span>مرورگر فعلی (Chrome در Windows)</span>
                <span className="text-emerald-600 font-bold font-mono">آنلاین (اکنون)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
