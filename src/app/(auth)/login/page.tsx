"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  AlertCircle,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";
import { SplashScreen } from "@/components/auth/splash-screen";
import { useThemeCustomizer, ColorPalette } from "@/components/theme/theme-context";
import {
  requestOtpAction,
  verifyOtpAction,
  getLoginConfigAction,
} from "@/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const { color, setColor, theme, setTheme } = useThemeCustomizer();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [timer, setTimer] = useState(120);
  const [forceSplash, setForceSplash] = useState(false);

  const [demoConfig, setDemoConfig] = useState<{
    demoMode: boolean;
    demoPhones: { admin: string; manager: string; sales: string };
  }>({
    demoMode: false,
    demoPhones: {
      admin: "09123456789",
      manager: "09120000002",
      sales: "09120000003",
    },
  });

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Load demo configuration from server
  useEffect(() => {
    let mounted = true;
    getLoginConfigAction().then((cfg) => {
      if (mounted) {
        setDemoConfig(cfg);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2-minute countdown timer for OTP
  useEffect(() => {
    if (step !== "code" || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Normalize Persian/Arabic digits to Latin if entered
    const normalizedPhone = phone.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setError("شماره موبایل باید ۱۱ رقم بوده و با 09 شروع شود (مثال: 09123456789)");
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtpAction(normalizedPhone);
      if (!res.ok) {
        setError(res.error || "خطا در ارسال کد ورود");
        setLoading(false);
        return;
      }

      setDebugCode(res.demoCode || null);
      setStep("code");
      setTimer(120);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch {
      setError("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    setError(null);
    const char = value.slice(-1).replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto advance to next box
    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = otp.join("");
    if (fullCode.length !== 6) {
      setError("لطفاً کد ۶ رقمی تایید را به طور کامل وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpAction(phone, fullCode);
      if (!res.ok) {
        setError(res.error || "کد وارد شده صحیح نمی‌باشد.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("خطا در تایید کد ورود. لطفاً مجدداً تلاش فرمایید.");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtpAction(phone);
      if (!res.ok) {
        setError(res.error || "خطا در ارسال مجدد کد");
        setLoading(false);
        return;
      }
      setTimer(120);
      setDebugCode(res.demoCode || null);
      setOtp(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch {
      setError("خطا در ارسال مجدد کد.");
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (demoPhone: string) => {
    if (!demoConfig.demoMode) return;
    setPhone(demoPhone);
    setLoading(true);
    setError(null);

    try {
      const reqRes = await requestOtpAction(demoPhone);
      if (!reqRes.ok) {
        setError(reqRes.error || "خطا در ورود تستی");
        setLoading(false);
        return;
      }
      const code = reqRes.demoCode || "123456";
      const verifyRes = await verifyOtpAction(demoPhone, code);
      if (!verifyRes.ok) {
        setError(verifyRes.error || "خطا در تایید کد تستی");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("خطا در ورود سریع");
      setLoading(false);
    }
  };

  const palettes: { key: ColorPalette; colorHex: string; title: string }[] = [
    { key: "emerald", colorHex: "#059669", title: "زمردی (پیش‌فرض)" },
    { key: "blue", colorHex: "#2563eb", title: "آبی نیلی" },
    { key: "violet", colorHex: "#7c3aed", title: "بنفش آمتیست" },
    { key: "rose", colorHex: "#e11d48", title: "رز کوارتز" },
    { key: "orange", colorHex: "#ea580c", title: "نارنجی کهربایی" },
    { key: "slate", colorHex: "#475569", title: "خاکستری مدرن" },
  ];

  return (
    <>
      {/* Branded Splash Screen */}
      <SplashScreen forceShow={forceSplash} onDismiss={() => setForceSplash(false)} />

      {/* Login Page Container with dynamic theme gradient */}
      <div
        className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 select-none"
        style={{
          background: `radial-gradient(1200px 700px at 80% -10%, hsl(var(--primary) / 0.8), transparent 60%), linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 100%, #000 45%))`,
        }}
      >
        {/* Decorative Blurred Blobs */}
        <div className="absolute top-[-80px] left-[-60px] w-80 h-80 rounded-full bg-white opacity-25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[10%] w-72 h-72 rounded-full bg-white opacity-15 blur-3xl pointer-events-none" />

        {/* Floating Theme & Tool Toolbar */}
        <div
          dir="ltr"
          className="fixed top-4 left-4 z-40 flex items-center gap-2 bg-white/90 dark:bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-white/20 text-xs"
        >
          {palettes.map((p) => (
            <button
              key={p.key}
              onClick={() => setColor(p.key)}
              title={p.title}
              className={`w-5 h-5 rounded-full transition-transform border-2 border-white shadow-sm ${
                color === p.key ? "scale-125 ring-2 ring-primary" : "hover:scale-110 opacity-80"
              }`}
              style={{ backgroundColor: p.colorHex }}
            />
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="تغییر تم تاریک / روشن"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Replay Splash */}
          <button
            onClick={() => setForceSplash(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
            title="مشاهده انیمیشن اسپلش"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Splash</span>
          </button>
        </div>

        {/* Elevated Glass Card */}
        <div className="relative w-full max-w-[420px] bg-white/95 dark:bg-card/90 backdrop-blur-xl border border-white/40 dark:border-border/60 rounded-[26px] shadow-2xl p-7 sm:p-8 space-y-6 text-right z-10 my-auto">
          {/* Brand header */}
          <div className="text-center space-y-1">
            <div
              dir="ltr"
              className="text-xs font-black tracking-[0.35em] text-primary uppercase select-none"
            >
              SANJAGH
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight pt-1">
              ورود به سنجاق
            </h1>
            <p className="text-xs text-muted-foreground">
              {step === "phone"
                ? "برای ورود شماره موبایل خود را وارد کنید"
                : `کد تایید ۶ رقمی به شماره ${phone} ارسال شد`}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Simulated Code Helper for dev & test */}
          {debugCode && step === "code" && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold flex items-center justify-between">
              <span>کد تایید تستی (دمو):</span>
              <span className="font-mono font-bold text-sm tracking-widest">{debugCode}</span>
            </div>
          )}

          {/* Step 1: Phone number */}
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1.5 text-foreground text-[13px]">
                  شماره موبایل
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full pl-3 pr-10 py-3.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-base text-left text-foreground transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "در حال ارسال کد..." : "دریافت کد ورود"}</span>
              </button>

              <div className="text-center text-[11px] text-muted-foreground pt-1">
                کد ۶ رقمی ورود برای شما پیامک خواهد شد
              </div>
            </form>
          ) : (
            /* Step 2: 6-digit OTP Inputs */
            <form onSubmit={handleVerifyOtp} className="space-y-5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-foreground text-[13px]">
                    کد تایید ۶ رقمی
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-primary hover:underline font-semibold text-xs flex items-center gap-1"
                  >
                    <span>ویرایش شماره</span>
                  </button>
                </div>

                {/* 6 Digit Input Boxes */}
                <div dir="ltr" className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className="w-11 h-13 sm:w-12 sm:h-14 bg-muted/40 border border-border rounded-xl text-center font-mono text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown and Resend */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1 font-mono text-sm font-semibold text-foreground">
                  <span>{formatTimer(timer)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={timer > 0 || loading}
                  className={`font-semibold transition-colors ${
                    timer === 0
                      ? "text-primary hover:underline cursor-pointer"
                      : "text-muted-foreground/60 cursor-not-allowed"
                  }`}
                >
                  ارسال مجدد کد
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "در حال ورود..." : "ورود به پیشخوان فروش"}</span>
              </button>
            </form>
          )}

          {/* Quick Demo Access (renders only when DEMO_MODE=true and fake provider) */}
          {demoConfig.demoMode && (
            <div className="pt-4 border-t border-border/80 space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground text-center">
                ورود سریع با نقش‌های سازمانی (تست دمو)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickLoginAs(demoConfig.demoPhones.admin)}
                  className="p-2.5 rounded-xl border border-border bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground text-center transition-all font-semibold active:scale-95"
                >
                  مدیر ارشد
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs(demoConfig.demoPhones.manager)}
                  className="p-2.5 rounded-xl border border-border bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground text-center transition-all font-semibold active:scale-95"
                >
                  مدیر فروش
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs(demoConfig.demoPhones.sales)}
                  className="p-2.5 rounded-xl border border-border bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground text-center transition-all font-semibold active:scale-95"
                >
                  کارشناس
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
