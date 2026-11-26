"use client";

import React, { useState } from "react";
import { retryAllFailedJobsAction } from "@/server/actions/queues";
import { retryFailedMessageAction } from "@/server/actions/messages";
import { formatJalaliDate } from "@/lib/jalali";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export default function QueuesClient({
  workerRunning,
  msgCounts,
  autoCounts,
  failedMessages: initialFailed,
}: {
  workerRunning: boolean;
  msgCounts: QueueCounts;
  autoCounts: QueueCounts;
  failedMessages: {
    id: string;
    channel: string;
    toAddress: string;
    error: string | null;
    createdAt: string;
  }[];
}) {
  const [failedMessages, setFailedMessages] = useState(initialFailed);
  const [retrying, setRetrying] = useState(false);

  const handleRetryAll = async () => {
    setRetrying(true);
    const res = await retryAllFailedJobsAction();
    setRetrying(false);
    if (res.ok) {
      setFailedMessages([]);
    } else {
      alert(res.error || "خطا در اجرای مجدد");
    }
  };

  const handleRetryOne = async (id: string) => {
    const res = await retryFailedMessageAction(id);
    if (res.ok) {
      setFailedMessages((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert(res.error || "خطا در ارسال مجدد");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-primary" />
            مانیتورینگ صف‌های BullMQ
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            وضعیت Worker، شمارنده صف پیام‌ها و اتوماسیون‌ها و مدیریت خطاها
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              workerRunning
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {workerRunning ? "Worker داخلی فعال" : "Worker غیرفعال (یا پروسه جداگانه)"}
          </span>

          <button
            type="button"
            onClick={handleRetryAll}
            disabled={retrying || failedMessages.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            <span>تلاش مجدد ناموفق‌ها</span>
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "صف پیام‌ها (messages)", counts: msgCounts },
          { title: "صف اتوماسیون‌ها (automations)", counts: autoCounts },
        ].map((q) => (
          <div key={q.title} className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-foreground">{q.title}</h2>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40">
                <div className="font-mono font-black text-base">{q.counts.waiting}</div>
                <div className="text-[10px] text-muted-foreground">در انتظار</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <div className="font-mono font-black text-base">{q.counts.active}</div>
                <div className="text-[10px]">در حال اجرا</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                <div className="font-mono font-black text-base">{q.counts.delayed}</div>
                <div className="text-[10px]">زمان‌بندی‌شده</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <div className="font-mono font-black text-base">{q.counts.completed}</div>
                <div className="text-[10px]">تکمیل‌شده</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                <div className="font-mono font-black text-base">{q.counts.failed}</div>
                <div className="text-[10px]">ناموفق</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Failed Messages Table */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          پیام‌های ناموفق اخیر ({failedMessages.length})
        </h2>

        {failedMessages.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            هیچ پیام ناموفقی وجود ندارد.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {failedMessages.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-foreground font-mono">
                    [{m.channel}] {m.toAddress}
                  </div>
                  <div className="text-[11px] text-rose-500 truncate">
                    {m.error || "خطای نامشخص"} • {formatJalaliDate(m.createdAt, "full")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryOne(m.id)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shrink-0"
                >
                  تلاش مجدد
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
