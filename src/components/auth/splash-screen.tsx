"use client";

import React, { useEffect, useState, useCallback } from "react";

export const SPLASH_STORAGE_KEY = "sanjagh_splash_seen";

interface SplashScreenProps {
  forceShow?: boolean;
  onDismiss?: () => void;
}

export function SplashScreen({ forceShow = false, onDismiss }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);
  const [slidingOut, setSlidingOut] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this browser session
    try {
      const alreadySeen = sessionStorage.getItem(SPLASH_STORAGE_KEY);
      if (!alreadySeen || forceShow) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- check sessionStorage on client mount to avoid hydration mismatch
        setVisible(true);
      }
    } catch {
      // If sessionStorage fails (e.g. private mode blocked), don't block
      if (forceShow) {
        setVisible(true);
      }
    }
  }, [forceShow]);

  const dismiss = useCallback(() => {
    if (slidingOut || !visible) return;
    setSlidingOut(true);

    try {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
    } catch {
      // safe ignore
    }

    // After slide up animation finishes (600ms), hide completely
    setTimeout(() => {
      setVisible(false);
      setSlidingOut(false);
      onDismiss?.();
    }, 600);
  }, [slidingOut, visible, onDismiss]);

  useEffect(() => {
    if (!visible || slidingOut) return;

    // Auto-dismiss after 2.4 seconds
    const autoDismissTimer = setTimeout(() => {
      dismiss();
    }, 2400);

    const handleKeyDown = () => {
      dismiss();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(autoDismissTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, slidingOut, dismiss]);

  if (!visible) return null;

  const letters = ["S", "A", "N", "J", "A", "G", "H"];

  return (
    <div
      role="status"
      aria-label="در حال بارگذاری سنجاق"
      onClick={dismiss}
      className={`fixed inset-0 z-50 flex items-center justify-center cursor-pointer select-none overflow-hidden transition-all ${
        slidingOut ? "splash-slide-out" : ""
      }`}
      style={{
        background: `radial-gradient(900px 600px at 50% 40%, color-mix(in srgb, hsl(var(--primary)) 100%, #fff 14%), color-mix(in srgb, hsl(var(--primary)) 100%, #000 45%))`,
      }}
    >
      <span className="sr-only">در حال بارگذاری سنجاق</span>

      <div className="text-center text-white p-6 relative z-10 flex flex-col items-center">
        {/* Animated Pin Icon */}
        <svg
          className="w-12 h-12 text-white mb-4 splash-animate-pin drop-shadow-md"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 17v5" />
          <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
        </svg>

        {/* Wordmark SANJAGH */}
        <div
          dir="ltr"
          className="flex justify-center items-center gap-[0.12em] font-black text-4xl sm:text-6xl md:text-7xl tracking-[0.15em] text-white drop-shadow-lg"
          aria-hidden="true"
        >
          {letters.map((char, index) => (
            <span
              key={index}
              className="splash-animate-letter inline-block"
              style={{ animationDelay: `${0.45 + index * 0.12}s` }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Progress Fill Bar */}
        <div className="w-48 sm:w-64 h-1 bg-white/20 rounded-full overflow-hidden mt-7">
          <div className="h-full bg-white rounded-full splash-animate-bar" />
        </div>

        <p className="text-[11px] text-white/60 mt-4 font-medium tracking-wide">
          برای رد کردن کلیک کنید
        </p>
      </div>
    </div>
  );
}
