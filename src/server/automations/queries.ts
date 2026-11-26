import { AutomationTrigger, Prisma } from "@prisma/client";
import { db } from "../db";
import { requireRole } from "../auth";
import { AutomationCondition, AutomationStep } from "@/lib/schemas/automations";
import { StepLogEntry } from "./engine";

export interface SerializableAutomation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isPreset: boolean;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, unknown> | null;
  conditions: AutomationCondition[];
  steps: AutomationStep[];
  stopOnReply: boolean;
  runsCount: number;
  createdAt: string;
}

export interface SerializableAutomationRun {
  id: string;
  automationId: string;
  automationName: string;
  contactId: string;
  contactName: string;
  status: string;
  currentStep: number;
  log: StepLogEntry[];
  startedAt: string;
  finishedAt: string | null;
}

const PRESET_DEFINITIONS: {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  triggerConfig?: Record<string, unknown>;
  steps: AutomationStep[];
}[] = [
  {
    name: "خوش‌آمدگویی به سرنخ جدید (پیامک + وظیفه پیگیری)",
    description: "به محض ثبت سرنخ، پیامک خوش‌آمد ارسال شده و برای فردا وظیفه پیگیری ثبت می‌شود.",
    trigger: AutomationTrigger.LEAD_CREATED,
    steps: [
      { type: "SEND_SMS", body: "سلام {{fullName}} عزیز، از ثبت درخواست شما در سنجاق متشکریم. همکاران ما به‌زودی با شما تماس می‌گیرند." },
      { type: "WAIT", delayMinutes: 1440 },
      { type: "CREATE_TASK", title: "تماس پیگیری با سرنخ جدید", dueInHours: 24, priority: "HIGH" },
    ],
  },
  {
    name: "یادآوری سرنخ تماس‌گرفته‌شده (بی‌تغییر)",
    description: "پس از تغییر وضعیت سرنخ به تماس‌گرفته‌شده، یادآور پیگیری مجدد ایجاد می‌شود.",
    trigger: AutomationTrigger.LEAD_INACTIVE,
    triggerConfig: { days: 7 },
    steps: [
      { type: "CREATE_TASK", title: "پیگیری مجدد سرنخ راکد (۷ روز بدون فعالیت)", dueInHours: 4, priority: "HIGH" },
    ],
  },
  {
    name: "تبریک و شروع آنبوردینگ معامله برنده (Deal WON)",
    description: "به محض برنده شدن معامله، پیامک تشکر برای مشتری ارسال می‌شود.",
    trigger: AutomationTrigger.DEAL_STAGE_CHANGED,
    triggerConfig: { toStage: "WON" },
    steps: [
      { type: "SEND_SMS", body: "تبریک {{fullName}} عزیز! همکاری رسمی ما با سنجاق آغاز شد." },
      { type: "CREATE_TASK", title: "هماهنگی جلسه آنبوردینگ مشتری جدید", dueInHours: 24, priority: "MEDIUM" },
    ],
  },
  {
    name: "ایمیل نظرسنجی دلایل باخت معامله (Deal LOST)",
    description: "در صورت از دست رفتن معامله، ایمیل نظرسنجی جهت بهبود خدمات ارسال می‌شود.",
    trigger: AutomationTrigger.DEAL_STAGE_CHANGED,
    triggerConfig: { toStage: "LOST" },
    steps: [
      {
        type: "SEND_EMAIL",
        subject: "بازخورد شما برای ما ارزشمند است",
        body: "سلام {{fullName}} گرامی، خوشحال می‌شویم نظر خود را درباره تجربه گفتگو با تیم ما به اشتراک بگذارید.",
      },
    ],
  },
];

export async function ensurePresetAutomations(userId: string) {
  const existingCount = await db.automation.count({ where: { isPreset: true } });
  if (existingCount > 0) return;

  for (const preset of PRESET_DEFINITIONS) {
    await db.automation.create({
      data: {
        name: preset.name,
        description: preset.description,
        isActive: false,
        isPreset: true,
        trigger: preset.trigger,
        triggerConfig: (preset.triggerConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        conditions: [],
        steps: preset.steps as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }
}

export async function listAutomations(): Promise<{
  automations: SerializableAutomation[];
  recentRuns: SerializableAutomationRun[];
}> {
  const user = await requireRole("ADMIN", "MANAGER");
  await ensurePresetAutomations(user.id);

  const [rows, runs] = await Promise.all([
    db.automation.findMany({
      orderBy: [{ isPreset: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { runs: true } } },
    }),
    db.automationRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 25,
      include: {
        automation: { select: { name: true } },
        contact: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    automations: rows.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      isActive: a.isActive,
      isPreset: a.isPreset,
      trigger: a.trigger,
      triggerConfig: (a.triggerConfig ?? null) as Record<string, unknown> | null,
      conditions: (Array.isArray(a.conditions) ? a.conditions : []) as AutomationCondition[],
      steps: (Array.isArray(a.steps) ? a.steps : []) as AutomationStep[],
      stopOnReply: a.stopOnReply,
      runsCount: a._count.runs,
      createdAt: a.createdAt.toISOString(),
    })),
    recentRuns: runs.map((r) => ({
      id: r.id,
      automationId: r.automationId,
      automationName: r.automation.name,
      contactId: r.contactId,
      contactName: r.contact.fullName,
      status: r.status,
      currentStep: r.currentStep,
      log: (Array.isArray(r.log) ? r.log : []) as unknown as StepLogEntry[],
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    })),
  };
}

export async function getAutomationById(id: string): Promise<SerializableAutomation | null> {
  await requireRole("ADMIN", "MANAGER");
  const a = await db.automation.findUnique({
    where: { id },
    include: { _count: { select: { runs: true } } },
  });
  if (!a) return null;

  return {
    id: a.id,
    name: a.name,
    description: a.description,
    isActive: a.isActive,
    isPreset: a.isPreset,
    trigger: a.trigger,
    triggerConfig: (a.triggerConfig ?? null) as Record<string, unknown> | null,
    conditions: (Array.isArray(a.conditions) ? a.conditions : []) as AutomationCondition[],
    steps: (Array.isArray(a.steps) ? a.steps : []) as AutomationStep[],
    stopOnReply: a.stopOnReply,
    runsCount: a._count.runs,
    createdAt: a.createdAt.toISOString(),
  };
}
