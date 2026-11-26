"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AutomationTrigger, LeadStatus, Priority } from "@prisma/client";
import type { SerializableAutomation } from "@/server/automations/queries";
import type { StepLogEntry } from "@/server/automations/engine";
import type { AutomationStep } from "@/lib/schemas/automations";
import type { DealContactOption } from "@/server/deals";
import type { AssignableUser } from "@/server/contacts";
import {
  saveAutomationAction,
  testRunAutomationAction,
} from "@/server/actions/automations";
import { draftTemplateWithAiAction } from "@/server/actions/ai";
import { Channel } from "@prisma/client";
import {
  Play,
  Save,
  ArrowRight,
  Zap,
  Clock,
  MessageSquare,
  Mail,
  CheckSquare,
  UserCheck,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

export default function BuilderClient({
  initialAutomation,
  contactOptions,
  assignableUsers,
}: {
  initialAutomation: SerializableAutomation | null;
  contactOptions: DealContactOption[];
  assignableUsers: AssignableUser[];
}) {
  const router = useRouter();

  const [automationId, setAutomationId] = useState<string | undefined>(
    initialAutomation?.id
  );
  const [name, setName] = useState(
    initialAutomation?.name || "اتوماسیون جدید فروش"
  );
  const [description, setDescription] = useState(
    initialAutomation?.description || ""
  );
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    initialAutomation?.trigger || AutomationTrigger.LEAD_CREATED
  );
  const [toStage, setToStage] = useState<string>(
    typeof initialAutomation?.triggerConfig?.toStage === "string"
      ? initialAutomation.triggerConfig.toStage
      : "WON"
  );
  const [stopOnReply, setStopOnReply] = useState(
    initialAutomation?.stopOnReply ?? false
  );
  const [isActive, setIsActive] = useState(
    initialAutomation?.isActive ?? true
  );
  const [steps, setSteps] = useState<AutomationStep[]>(
    initialAutomation?.steps && initialAutomation.steps.length > 0
      ? initialAutomation.steps
      : [
          {
            type: "SEND_SMS",
            body: "سلام {{fullName}} عزیز، درخواست شما ثبت شد.",
          },
          { type: "WAIT", delayMinutes: 1440 },
          {
            type: "CREATE_TASK",
            title: "تماس پیگیری با مخاطب",
            dueInHours: 24,
            priority: Priority.HIGH,
          },
        ]
  );

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testContactId, setTestContactId] = useState(contactOptions[0]?.id || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<StepLogEntry[] | null>(null);

  const handleAddStep = (type: AutomationStep["type"]) => {
    switch (type) {
      case "SEND_SMS":
        setSteps([...steps, { type: "SEND_SMS", body: "سلام {{fullName}} عزیز،" }]);
        break;
      case "SEND_EMAIL":
        setSteps([...steps, { type: "SEND_EMAIL", subject: "پیام از سنجاق", body: "سلام {{fullName}}،" }]);
        break;
      case "WAIT":
        setSteps([...steps, { type: "WAIT", delayMinutes: 60 }]);
        break;
      case "CREATE_TASK":
        setSteps([...steps, { type: "CREATE_TASK", title: "پیگیری جدید", dueInHours: 24, priority: Priority.MEDIUM }]);
        break;
      case "ASSIGN_OWNER":
        setSteps([...steps, { type: "ASSIGN_OWNER", ownerId: assignableUsers[0]?.id || "" }]);
        break;
      case "CHANGE_LEAD_STATUS":
        setSteps([...steps, { type: "CHANGE_LEAD_STATUS", status: LeadStatus.CONTACTED }]);
        break;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const res = await saveAutomationAction({
      id: automationId,
      name,
      description,
      trigger,
      triggerConfig:
        trigger === AutomationTrigger.DEAL_STAGE_CHANGED ? { toStage } : null,
      conditions: [],
      steps,
      stopOnReply,
      isActive,
    });

    setSaving(false);
    if (!res.ok || !res.data) {
      alert(res.error || "خطا در ذخیره اتوماسیون");
      return;
    }

    setAutomationId(res.data.id);
    setSaveMessage("گردش کار با موفقیت در پایگاه‌داده ذخیره شد.");
    router.refresh();
  };

  const handleTestRun = async () => {
    if (!automationId) {
      alert("لطفاً ابتدا اتوماسیون را ذخیره کنید.");
      return;
    }
    if (!testContactId) {
      alert("مخاطبی برای تست وجود ندارد.");
      return;
    }

    setIsTesting(true);
    setTestLogs(null);
    const res = await testRunAutomationAction(automationId, testContactId);
    setIsTesting(false);

    if (!res.ok || !res.data) {
      alert(res.error || "خطا در اجرای آزمایشی");
      return;
    }
    setTestLogs(res.data);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/automations"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-foreground">
              طراح بصری گردش کار (Visual Automation Builder)
            </h1>
            <p className="text-xs text-muted-foreground">
              تنظیم محرک‌ها (Trigger)، مراحل اجرا و آزمایش با مخاطب واقعی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contactOptions.length > 0 && (
            <select
              value={testContactId}
              onChange={(e) => setTestContactId(e.target.value)}
              className="p-2 rounded-xl border border-border bg-card text-xs"
            >
              {contactOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  تست روی: {c.fullName}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleTestRun}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            <span>{isTesting ? "در حال اجرای تست..." : "اجرای تست (Fake)"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "در حال ذخیره..." : "ذخیره اتوماسیون"}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {testLogs && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
          <div className="font-bold text-primary">نتیجه اجرای آزمایشی (بدون ارسال پیام واقعی):</div>
          {testLogs.map((l, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-card border border-border flex justify-between">
              <span>
                <strong className="font-mono">[{l.type}]</strong> {l.detail}
              </span>
              <span className="font-mono text-emerald-600">{l.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Canvas */}
      <div className="p-6 md:p-8 rounded-3xl bg-muted/30 border border-border flex flex-col items-center space-y-4">
        {/* Meta & Trigger Node */}
        <div className="w-full max-w-md p-5 rounded-2xl bg-card border-2 border-primary shadow-lg space-y-3 text-right text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
              محرک (Trigger)
            </span>
            <Zap className="w-4 h-4 text-primary" />
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام اتوماسیون..."
            className="w-full p-2 bg-muted/40 border border-border rounded-xl font-bold text-foreground"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات کوتاه..."
            className="w-full p-2 bg-muted/40 border border-border rounded-xl text-muted-foreground"
          />

          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
            className="w-full p-2 bg-muted/40 border border-border rounded-xl font-semibold"
          >
            <option value="LEAD_CREATED">ثبت سرنخ جدید (LEAD_CREATED)</option>
            <option value="LEAD_STATUS_CHANGED">تغییر وضعیت سرنخ (LEAD_STATUS_CHANGED)</option>
            <option value="DEAL_STAGE_CHANGED">تغییر مرحله معامله (DEAL_STAGE_CHANGED)</option>
            <option value="CUSTOMER_CREATED">تبدیل/ثبت مشتری (CUSTOMER_CREATED)</option>
            <option value="LEAD_INACTIVE">عدم فعالیت سرنخ (LEAD_INACTIVE)</option>
          </select>

          {trigger === AutomationTrigger.DEAL_STAGE_CHANGED && (
            <select
              value={toStage}
              onChange={(e) => setToStage(e.target.value)}
              className="w-full p-2 bg-muted/40 border border-border rounded-xl"
            >
              <option value="NEW">مرحله مقصد: سرنخ جدید</option>
              <option value="CONTACTED">مرحله مقصد: تماس اولیه</option>
              <option value="PROPOSAL">مرحله مقصد: پیش‌فاکتور</option>
              <option value="NEGOTIATION">مرحله مقصد: مذاکره نهایی</option>
              <option value="WON">مرحله مقصد: برنده (WON)</option>
              <option value="LOST">مرحله مقصد: از دست رفته (LOST)</option>
            </select>
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
              <span>اتوماسیون فعال باشد</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground" title="ردیابی پاسخ ورودی هنوز پیاده‌سازی نشده است">
              <input
                type="checkbox"
                checked={stopOnReply}
                onChange={(e) => setStopOnReply(e.target.checked)}
                className="accent-primary"
              />
              <span>توقف با پاسخ (ذخیره تنظیم)</span>
            </label>
          </div>
        </div>

        {/* Steps Nodes */}
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="w-0.5 h-6 bg-primary/40" />

            <div className="w-full max-w-md p-4 rounded-2xl bg-card border border-border shadow-md space-y-2.5 text-right text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground flex items-center gap-1">
                  {step.type === "WAIT" ? (
                    <Clock className="w-3 h-3 text-amber-500" />
                  ) : step.type === "SEND_SMS" ? (
                    <MessageSquare className="w-3 h-3 text-emerald-500" />
                  ) : step.type === "SEND_EMAIL" ? (
                    <Mail className="w-3 h-3 text-blue-500" />
                  ) : step.type === "CREATE_TASK" ? (
                    <CheckSquare className="w-3 h-3 text-purple-500" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-primary" />
                  )}
                  گام {index + 1}: {step.type}
                </span>

                <button
                  type="button"
                  onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                  disabled={steps.length <= 1}
                  className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {step.type === "WAIT" && (
                <div className="flex items-center gap-2">
                  <span>تأخیر به مدت:</span>
                  <input
                    type="number"
                    min={1}
                    value={step.delayMinutes}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...step, delayMinutes: Number(e.target.value) || 1 } : s
                        )
                      )
                    }
                    className="w-24 p-1.5 bg-muted/40 border border-border rounded-lg font-mono"
                  />
                  <span>دقیقه</span>
                </div>
              )}

              {step.type === "SEND_SMS" && (
                <div className="space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await draftTemplateWithAiAction({
                          channel: Channel.SMS,
                          topic: name,
                        });
                        if (res.ok && res.data) {
                          setSteps(
                            steps.map((s, i) =>
                              i === index ? { ...step, body: res.data!.body } : s
                            )
                          );
                        } else {
                          alert(res.error || "خطا در نگارش با هوش مصنوعی");
                        }
                      }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      ✨ نگارش با AI
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={step.body}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...step, body: e.target.value } : s
                        )
                      )
                    }
                    className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                  />
                </div>
              )}

              {step.type === "SEND_EMAIL" && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await draftTemplateWithAiAction({
                          channel: Channel.EMAIL,
                          topic: name,
                        });
                        if (res.ok && res.data) {
                          setSteps(
                            steps.map((s, i) =>
                              i === index
                                ? {
                                    ...step,
                                    subject: res.data!.subject || step.subject,
                                    body: res.data!.body,
                                  }
                                : s
                            )
                          );
                        } else {
                          alert(res.error || "خطا در نگارش با هوش مصنوعی");
                        }
                      }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      ✨ نگارش با AI
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step.subject}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...step, subject: e.target.value } : s
                        )
                      )
                    }
                    placeholder="عنوان ایمیل"
                    className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                  />
                  <textarea
                    rows={2}
                    value={step.body}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...step, body: e.target.value } : s
                        )
                      )
                    }
                    className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                  />
                </div>
              )}

              {step.type === "CREATE_TASK" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s, i) =>
                          i === index ? { ...step, title: e.target.value } : s
                        )
                      )
                    }
                    placeholder="عنوان وظیفه"
                    className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                  />
                  <div className="flex items-center gap-2">
                    <span>سررسید (ساعت بعد):</span>
                    <input
                      type="number"
                      min={0}
                      value={step.dueInHours}
                      onChange={(e) =>
                        setSteps(
                          steps.map((s, i) =>
                            i === index ? { ...step, dueInHours: Number(e.target.value) || 0 } : s
                          )
                        )
                      }
                      className="w-20 p-1.5 bg-muted/40 border border-border rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              {step.type === "ASSIGN_OWNER" && (
                <select
                  value={step.ownerId}
                  onChange={(e) =>
                    setSteps(
                      steps.map((s, i) =>
                        i === index ? { ...step, ownerId: e.target.value } : s
                      )
                    )
                  }
                  className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                >
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}

              {step.type === "CHANGE_LEAD_STATUS" && (
                <select
                  value={step.status}
                  onChange={(e) =>
                    setSteps(
                      steps.map((s, i) =>
                        i === index ? { ...step, status: e.target.value as LeadStatus } : s
                      )
                    )
                  }
                  className="w-full p-2 bg-muted/40 border border-border rounded-xl"
                >
                  <option value="NEW">جدید</option>
                  <option value="CONTACTED">تماس گرفته شد</option>
                  <option value="QUALIFIED">واجد شرایط</option>
                  <option value="LOST">از دست رفته</option>
                </select>
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Add Step Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          {(
            [
              { type: "SEND_SMS", label: "+ پیامک" },
              { type: "SEND_EMAIL", label: "+ ایمیل" },
              { type: "WAIT", label: "+ تأخیر" },
              { type: "CREATE_TASK", label: "+ وظیفه" },
              { type: "CHANGE_LEAD_STATUS", label: "+ تغییر وضعیت" },
            ] as const
          ).map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => handleAddStep(btn.type)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary text-xs font-semibold transition-colors"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
