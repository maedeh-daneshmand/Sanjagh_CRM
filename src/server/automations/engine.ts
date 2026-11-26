import {
  AutomationTrigger,
  Channel,
  MessageStatus,
  Prisma,
  RunStatus,
  TaskOrigin,
} from "@prisma/client";
import { db } from "../db";
import { AutomationCondition, AutomationStep } from "@/lib/schemas/automations";
import { enqueueAutomationStepJob, enqueueMessageJob } from "../queue/queues";
import { FakeMessagingProvider } from "../messaging/fake";

export interface AutomationEventPayload {
  contactId: string;
  dealId?: string;
  source?: string;
  priority?: string;
  leadStatus?: string;
  kind?: string;
  fromStage?: string;
  toStage?: string;
  stage?: string;
  fromStatus?: string;
  toStatus?: string;
  [key: string]: unknown;
}

export interface StepLogEntry {
  stepIndex: number;
  type: string;
  status: "DONE" | "DELAYED" | "SKIPPED" | "FAILED";
  detail: string;
  at: string;
}

function renderTemplate(template: string, fullName: string): string {
  return template.replace(/\{\{\s*fullName\s*\}\}/g, fullName);
}

export function matchesConditions(
  triggerConfig: Record<string, unknown> | null | undefined,
  conditions: AutomationCondition[] | null | undefined,
  payload: AutomationEventPayload
): boolean {
  if (triggerConfig && typeof triggerConfig.toStage === "string") {
    if (payload.toStage !== triggerConfig.toStage) {
      return false;
    }
  }

  if (!conditions || conditions.length === 0) return true;

  for (const cond of conditions) {
    const actual = payload[cond.field];
    if (cond.op === "eq") {
      if (String(actual ?? "") !== String(cond.value)) return false;
    } else if (cond.op === "neq") {
      if (String(actual ?? "") === String(cond.value)) return false;
    } else if (cond.op === "in") {
      const list = Array.isArray(cond.value) ? cond.value : [cond.value];
      if (!list.includes(String(actual ?? ""))) return false;
    }
  }
  return true;
}

export async function emitEvent(
  trigger: AutomationTrigger,
  payload: AutomationEventPayload
): Promise<string[]> {
  const automations = await db.automation.findMany({
    where: { trigger, isActive: true },
  });

  const startedRunIds: string[] = [];

  for (const auto of automations) {
    const triggerConfig = (auto.triggerConfig ?? null) as Record<string, unknown> | null;
    const conditions = (auto.conditions ?? null) as AutomationCondition[] | null;
    const steps = (Array.isArray(auto.steps) ? auto.steps : []) as AutomationStep[];

    if (steps.length === 0) continue;
    if (!matchesConditions(triggerConfig, conditions, payload)) continue;

    const run = await db.automationRun.create({
      data: {
        automationId: auto.id,
        contactId: payload.contactId,
        dealId: payload.dealId ?? null,
        status: RunStatus.RUNNING,
        currentStep: 0,
        log: [],
      },
    });

    await enqueueAutomationStepJob({ runId: run.id, stepIndex: 0 });
    startedRunIds.push(run.id);
  }

  return startedRunIds;
}

async function runSingleStep(
  step: AutomationStep,
  stepIndex: number,
  context: {
    runId: string;
    automationId: string;
    fallbackUserId: string | null;
    contact: {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
      ownerId: string | null;
      createdById: string;
      optOutSms: boolean;
      optOutEmail: boolean;
    };
    dealId: string | null;
    dryRun: boolean;
  }
): Promise<{ entry: StepLogEntry; delayNextMinutes?: number }> {
  const nowIso = new Date().toISOString();
  const { contact, dryRun } = context;

  switch (step.type) {
    case "WAIT": {
      return {
        entry: {
          stepIndex,
          type: "WAIT",
          status: dryRun ? "DONE" : "DELAYED",
          detail: dryRun
            ? `تأخیر شبیه‌سازی‌شده: ${step.delayMinutes} دقیقه`
            : `زمان‌بندی ادامه اجرا پس از ${step.delayMinutes} دقیقه`,
          at: nowIso,
        },
        delayNextMinutes: dryRun ? undefined : step.delayMinutes,
      };
    }

    case "SEND_SMS": {
      if (contact.optOutSms || !contact.phone?.trim()) {
        return {
          entry: {
            stepIndex,
            type: "SEND_SMS",
            status: "SKIPPED",
            detail: "شماره موبایل ثبت نشده یا مخاطب پیامک را لغو کرده است",
            at: nowIso,
          },
        };
      }

      const rendered = renderTemplate(step.body, contact.fullName);
      if (dryRun) {
        const fake = new FakeMessagingProvider();
        await fake.send({ to: contact.phone, body: rendered });
        return {
          entry: {
            stepIndex,
            type: "SEND_SMS",
            status: "DONE",
            detail: `[تست ساختگی] پیامک به ${contact.phone}: ${rendered}`,
            at: nowIso,
          },
        };
      }

      const msg = await db.message.create({
        data: {
          channel: Channel.SMS,
          toAddress: contact.phone.trim(),
          body: rendered,
          status: MessageStatus.QUEUED,
          contactId: contact.id,
          automationRunId: context.runId,
        },
      });
      await enqueueMessageJob({ messageId: msg.id });

      return {
        entry: {
          stepIndex,
          type: "SEND_SMS",
          status: "DONE",
          detail: `پیامک در صف ارسال قرار گرفت (${contact.phone})`,
          at: nowIso,
        },
      };
    }

    case "SEND_EMAIL": {
      if (contact.optOutEmail || !contact.email?.trim()) {
        return {
          entry: {
            stepIndex,
            type: "SEND_EMAIL",
            status: "SKIPPED",
            detail: "ایمیل ثبت نشده یا مخاطب ایمیل را لغو کرده است",
            at: nowIso,
          },
        };
      }

      const rendered = renderTemplate(step.body, contact.fullName);
      if (dryRun) {
        const fake = new FakeMessagingProvider();
        await fake.send({ to: contact.email, subject: step.subject, body: rendered });
        return {
          entry: {
            stepIndex,
            type: "SEND_EMAIL",
            status: "DONE",
            detail: `[تست ساختگی] ایمیل به ${contact.email} با موضوع «${step.subject}»`,
            at: nowIso,
          },
        };
      }

      const msg = await db.message.create({
        data: {
          channel: Channel.EMAIL,
          toAddress: contact.email.trim(),
          subject: step.subject,
          body: rendered,
          status: MessageStatus.QUEUED,
          contactId: contact.id,
          automationRunId: context.runId,
        },
      });
      await enqueueMessageJob({ messageId: msg.id });

      return {
        entry: {
          stepIndex,
          type: "SEND_EMAIL",
          status: "DONE",
          detail: `ایمیل در صف ارسال قرار گرفت (${contact.email})`,
          at: nowIso,
        },
      };
    }

    case "CREATE_TASK": {
      if (dryRun) {
        return {
          entry: {
            stepIndex,
            type: "CREATE_TASK",
            status: "DONE",
            detail: `[تست ساختگی] ایجاد وظیفه «${step.title}» با سررسید ${step.dueInHours} ساعت بعد`,
            at: nowIso,
          },
        };
      }

      const assigneeId = contact.ownerId || context.fallbackUserId || contact.createdById;
      const dueAt = new Date(Date.now() + step.dueInHours * 60 * 60 * 1000);

      await db.task.create({
        data: {
          title: step.title,
          dueAt,
          priority: step.priority,
          origin: TaskOrigin.AUTOMATION,
          assigneeId,
          contactId: contact.id,
          dealId: context.dealId,
        },
      });

      await db.activity.create({
        data: {
          type: "TASK",
          body: `وظیفه خودکار «${step.title}» توسط اتوماسیون ایجاد شد`,
          contactId: contact.id,
          dealId: context.dealId,
        },
      });

      return {
        entry: {
          stepIndex,
          type: "CREATE_TASK",
          status: "DONE",
          detail: `وظیفه «${step.title}» ایجاد شد`,
          at: nowIso,
        },
      };
    }

    case "ASSIGN_OWNER": {
      if (dryRun) {
        return {
          entry: {
            stepIndex,
            type: "ASSIGN_OWNER",
            status: "DONE",
            detail: `[تست ساختگی] تغییر مالک مخاطب به شناسه ${step.ownerId}`,
            at: nowIso,
          },
        };
      }

      await db.contact.update({
        where: { id: contact.id },
        data: { ownerId: step.ownerId },
      });

      await db.activity.create({
        data: {
          type: "ASSIGNMENT",
          body: "مالکیت مخاطب توسط اتوماسیون تغییر یافت",
          contactId: contact.id,
        },
      });

      return {
        entry: {
          stepIndex,
          type: "ASSIGN_OWNER",
          status: "DONE",
          detail: `مالکیت مخاطب به ${step.ownerId} منتقل شد`,
          at: nowIso,
        },
      };
    }

    case "CHANGE_LEAD_STATUS": {
      if (dryRun) {
        return {
          entry: {
            stepIndex,
            type: "CHANGE_LEAD_STATUS",
            status: "DONE",
            detail: `[تست ساختگی] تغییر وضعیت سرنخ به ${step.status}`,
            at: nowIso,
          },
        };
      }

      await db.contact.update({
        where: { id: contact.id },
        data: { leadStatus: step.status },
      });

      await db.activity.create({
        data: {
          type: "STATUS_CHANGE",
          body: `وضعیت سرنخ توسط اتوماسیون به ${step.status} تغییر یافت`,
          contactId: contact.id,
        },
      });

      return {
        entry: {
          stepIndex,
          type: "CHANGE_LEAD_STATUS",
          status: "DONE",
          detail: `وضعیت سرنخ به ${step.status} تغییر یافت`,
          at: nowIso,
        },
      };
    }
  }
}

export async function executeAutomationStep(
  runId: string,
  stepIndex: number
): Promise<void> {
  const run = await db.automationRun.findUnique({
    where: { id: runId },
    include: {
      automation: true,
      contact: true,
    },
  });

  if (!run || run.status !== RunStatus.RUNNING) return;

  const steps = (Array.isArray(run.automation.steps) ? run.automation.steps : []) as AutomationStep[];
  const existingLog = (Array.isArray(run.log) ? run.log : []) as unknown as StepLogEntry[];

  if (stepIndex >= steps.length) {
    await db.automationRun.update({
      where: { id: run.id },
      data: { status: RunStatus.COMPLETED, finishedAt: new Date() },
    });
    return;
  }

  const { entry, delayNextMinutes } = await runSingleStep(steps[stepIndex], stepIndex, {
    runId: run.id,
    automationId: run.automationId,
    fallbackUserId: run.automation.createdById,
    contact: run.contact,
    dealId: run.dealId,
    dryRun: false,
  });

  const nextLog = [...existingLog, entry];
  const hasMore = stepIndex + 1 < steps.length;

  await db.automationRun.update({
    where: { id: run.id },
    data: {
      currentStep: stepIndex + 1,
      log: nextLog as unknown as Prisma.InputJsonValue,
      status: hasMore ? RunStatus.RUNNING : RunStatus.COMPLETED,
      finishedAt: hasMore ? null : new Date(),
    },
  });

  if (hasMore) {
    await enqueueAutomationStepJob({
      runId: run.id,
      stepIndex: stepIndex + 1,
      delayMs: delayNextMinutes ? delayNextMinutes * 60 * 1000 : undefined,
    });
  }
}

export async function dryRunAutomation(
  automationId: string,
  contactId: string
): Promise<StepLogEntry[]> {
  const [auto, contact] = await Promise.all([
    db.automation.findUnique({ where: { id: automationId } }),
    db.contact.findUnique({ where: { id: contactId } }),
  ]);

  if (!auto) throw new Error("اتوماسیون یافت نشد");
  if (!contact) throw new Error("مخاطب یافت نشد");

  const steps = (Array.isArray(auto.steps) ? auto.steps : []) as AutomationStep[];
  const logs: StepLogEntry[] = [];

  for (let i = 0; i < steps.length; i++) {
    const { entry } = await runSingleStep(steps[i], i, {
      runId: "dry-run",
      automationId: auto.id,
      fallbackUserId: auto.createdById,
      contact,
      dealId: null,
      dryRun: true,
    });
    logs.push(entry);
  }

  return logs;
}
