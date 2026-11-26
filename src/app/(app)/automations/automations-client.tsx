"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AutomationTrigger } from "@prisma/client";
import type {
  SerializableAutomation,
  SerializableAutomationRun,
} from "@/server/automations/queries";
import { toggleAutomationActiveAction } from "@/server/actions/automations";
import { formatJalaliDate } from "@/lib/jalali";
import {
  Workflow,
  Plus,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Zap,
  Clock,
  ChevronDown,
} from "lucide-react";

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  LEAD_CREATED: "ثبت سرنخ جدید (LEAD_CREATED)",
  LEAD_STATUS_CHANGED: "تغییر وضعیت سرنخ (LEAD_STATUS_CHANGED)",
  DEAL_STAGE_CHANGED: "تغییر مرحله معامله (DEAL_STAGE_CHANGED)",
  CUSTOMER_CREATED: "تبدیل/ثبت مشتری (CUSTOMER_CREATED)",
  LEAD_INACTIVE: "عدم فعالیت سرنخ (LEAD_INACTIVE)",
  TASK_OVERDUE: "معوق شدن وظیفه (TASK_OVERDUE)",
};

export default function AutomationsClient({
  initialAutomations,
  recentRuns,
}: {
  initialAutomations: SerializableAutomation[];
  recentRuns: SerializableAutomationRun[];
}) {
  const [automations, setAutomations] = useState<SerializableAutomation[]>(initialAutomations);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const toggleActive = async (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;

    const nextActive = !target.isActive;
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: nextActive } : a))
    );

    const res = await toggleAutomationActiveAction(id, nextActive);
    if (!res.ok) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !nextActive } : a))
      );
      alert(res.error || "خطا در تغییر وضعیت اتوماسیون");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-primary" />
            اتوماسیون‌های فروش و جریان کار (Workflows)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            اجرای خودکار سناریوها بر اساس رویدادهای سرنخ و معامله، ایجاد وظیفه و ارسال پیامک
          </p>
        </div>
        <Link
          href="/automations/builder"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>طراحی اتوماسیون جدید (Visual Builder)</span>
        </Link>
      </div>

      {/* Automations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((auto) => (
          <div
            key={auto.id}
            className="p-6 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5" />
                  {TRIGGER_LABELS[auto.trigger]}
                </span>

                <button
                  type="button"
                  onClick={() => toggleActive(auto.id)}
                  className="flex items-center gap-1 text-xs font-bold transition-colors"
                >
                  {auto.isActive ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <ToggleRight className="w-6 h-6" /> فعال
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ToggleLeft className="w-6 h-6" /> غیرفعال
                    </span>
                  )}
                </button>
              </div>

              <h3 className="font-bold text-sm text-foreground">{auto.name}</h3>
              {auto.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {auto.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                <span>{auto.steps.length} مرحله</span>
                <span>•</span>
                <span>{auto.runsCount} اجرا</span>
                {auto.isPreset && (
                  <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-sans">
                    پیش‌فرض
                  </span>
                )}
              </div>

              <Link
                href={`/automations/builder?id=${auto.id}`}
                className="flex items-center gap-1 text-primary font-bold hover:underline"
              >
                <span>ویرایش و تست</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Run History */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            تاریخچه اجراهای اخیر ({recentRuns.length})
          </h2>
        </div>

        {recentRuns.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            هنوز هیچ اتوماسیونی اجرا نشده است.
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            {recentRuns.map((run) => {
              const isExpanded = expandedRunId === run.id;
              return (
                <div
                  key={run.id}
                  className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground truncate">
                        {run.automationName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        مخاطب: {run.contactName} •{" "}
                        <span className="font-mono">
                          {formatJalaliDate(run.startedAt, "full")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          run.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : run.status === "RUNNING"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {run.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRunId(isExpanded ? null : run.id)
                        }
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                        title="مشاهده لاگ مراحل"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      {run.log.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground">
                          در انتظار پردازش توسط Worker...
                        </div>
                      ) : (
                        run.log.map((entry, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-card border border-border text-[11px] flex items-center justify-between gap-2"
                          >
                            <span>
                              <strong className="font-mono">[{entry.type}]</strong>{" "}
                              {entry.detail}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {entry.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
