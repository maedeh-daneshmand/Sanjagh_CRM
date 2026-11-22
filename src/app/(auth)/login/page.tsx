"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pin,
  Phone,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [timer, setTimer] = useState(120);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^09\d{9}$/.test(phone)) {
      setError("شماره موبایل باید ۱۱ رقم بوده و با ۰۹ شروع شود (فرمت انگلیسی: 09xxxxxxxxx)");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const generatedCode = "123456";
      setDebugCode(generatedCode);
      setStep("code");
      setTimer(120);
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("کد تایید باید ۶ رقم باشد.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Success -> navigate to dashboard
      router.push("/");
    }, 600);
  };

  const quickLoginAs = (demoPhone: string) => {
    setPhone(demoPhone);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-8 space-y-6 text-right">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <Pin className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            ورود به سامانه سنجاق
          </h1>
          <p className="text-xs text-muted-foreground">
            نرم‌افزار هوشمند مدیریت فروش و ارتباط با مشتری (CRM)
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {debugCode && step === "code" && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between">
            <span>کد تایید شبیه‌سازی شده:</span>
            <span className="font-mono font-bold text-sm tracking-widest">{debugCode}</span>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1.5 text-foreground">
                شماره موبایل (ورود بدون پسورد)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full pl-3 pr-10 py-3 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono text-sm text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "در حال ارسال کد..." : "دریافت کد تایید یکبار مصرف"}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-foreground">کد تایید ۶ رقمی</label>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-primary hover:underline"
                >
                  ویرایش شماره
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-3 pr-10 py-3 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono text-base tracking-widest text-center"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "در حال ورود..." : "ورود به پیشخوان فروش"}</span>
            </button>
          </form>
        )}

        {/* Quick Demo Access */}
        <div className="pt-4 border-t border-border space-y-2.5">
          <div className="text-[11px] font-bold text-muted-foreground text-center">
            ورود سریع با نقش‌های دمو (تست آسان)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => quickLoginAs("09123456789")}
              className="p-2 rounded-xl border border-border hover:bg-primary/10 hover:border-primary text-center transition-all font-semibold"
            >
              مدیر ارشد
            </button>
            <button
              onClick={() => quickLoginAs("09120000002")}
              className="p-2 rounded-xl border border-border hover:bg-primary/10 hover:border-primary text-center transition-all font-semibold"
            >
              مدیر فروش
            </button>
            <button
              onClick={() => quickLoginAs("09120000003")}
              className="p-2 rounded-xl border border-border hover:bg-primary/10 hover:border-primary text-center transition-all font-semibold"
            >
              کارشناس
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
