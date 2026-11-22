"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
  Clock,
} from "lucide-react";

export default function JalaliCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState("آبان 1403");
  const [selectedDay, setSelectedDay] = useState<number | null>(25);

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  // Mock tasks mapped to calendar days
  const taskEvents: Record<number, { title: string; type: "call" | "meeting" | "task" }[]> = {
    4: [{ title: "دمو آنلاین نوین", type: "meeting" }],
    10: [{ title: "ارسال فاکتور رشد", type: "task" }],
    15: [{ title: "جلسه حضوری مهر", type: "meeting" }],
    22: [{ title: "پیگیری قرارداد جهان گستر", type: "call" }],
    25: [
      { title: "جلسه آنلاین با مهندس رستمی", type: "meeting" },
      { title: "تماس پیگیری پیش‌فاکتور", type: "call" },
    ],
    28: [{ title: "تماس تمدید اشتراک", type: "call" }],
  };

  const weekdays = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary" />
            تقویم جلالی فروش و پیگیری‌ها
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مشاهده جلسات، وظایف و برنامه‌ریزی ماهانه با اعداد انگلیسی
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-2xl shadow-sm text-xs font-bold">
            <button
              onClick={() => setCurrentMonth("مهر 1403")}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono">{currentMonth}</span>
            <button
              onClick={() => setCurrentMonth("آذر 1403")}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 text-center font-bold text-xs text-muted-foreground border-b border-border pb-3">
          {weekdays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty offset days for Saturday start */}
          <div className="h-28 rounded-2xl bg-muted/20 opacity-40 border border-transparent" />
          <div className="h-28 rounded-2xl bg-muted/20 opacity-40 border border-transparent" />

          {daysInMonth.map((day) => {
            const events = taskEvents[day] || [];
            const isSelected = selectedDay === day;
            const isToday = day === 25;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`h-28 p-2.5 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : isToday
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[10px] font-bold text-primary font-mono">
                      {events.length} کار
                    </span>
                  )}
                </div>

                {/* Event previews in cell */}
                <div className="space-y-1 overflow-hidden">
                  {events.slice(0, 2).map((ev, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-medium p-1 rounded-lg bg-card border border-border truncate text-foreground flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {events.length > 2 && (
                    <span className="text-[9px] text-muted-foreground block text-left">
                      +{events.length - 2} مورد دیگر
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer/Card */}
      {selectedDay && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              برنامه روز {selectedDay} {currentMonth}
            </h3>
            <button
              onClick={() => alert(`ثبت رویداد جدید در روز ${selectedDay} آبان`)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت رویداد برای این روز</span>
            </button>
          </div>

          <div className="space-y-2">
            {(taskEvents[selectedDay] || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                رویدادی برای این روز ثبت نشده است. روی «ثبت رویداد جدید» کلیک کنید.
              </p>
            ) : (
              taskEvents[selectedDay].map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="font-bold text-foreground">{ev.title}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {ev.type === "meeting" ? "جلسه تصویری" : "تماس پیگیری"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
