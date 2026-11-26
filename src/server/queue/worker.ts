import { Worker, Job } from "bullmq";
import { CampaignStatus, Channel, ContactKind, LeadStatus, MessageStatus, Prisma, Source } from "@prisma/client";
import { db } from "../db";
import { sendMessage } from "../messaging";
import { getBullConnection } from "./connection";
import {
  AutomationStepJobData,
  CampaignDispatchJobData,
  SendMessageJobData,
  enqueueMessageJob,
} from "./queues";
import { executeAutomationStep } from "../automations/engine";

export interface AudienceFilter {
  kind?: ContactKind | "ALL";
  source?: Source | "ALL";
  leadStatus?: LeadStatus | "ALL";
  ownerId?: string | "ALL";
  tags?: string[];
}

export function buildAudienceWhere(filter: AudienceFilter): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { isActive: true };
  if (filter.kind && filter.kind !== "ALL") where.kind = filter.kind;
  if (filter.source && filter.source !== "ALL") where.source = filter.source;
  if (filter.leadStatus && filter.leadStatus !== "ALL") where.leadStatus = filter.leadStatus;
  if (filter.ownerId && filter.ownerId !== "ALL") where.ownerId = filter.ownerId;
  if (filter.tags && filter.tags.length > 0) where.tags = { hasSome: filter.tags };
  return where;
}

export function renderTemplate(template: string, fullName: string): string {
  return template.replace(/\{\{\s*fullName\s*\}\}/g, fullName);
}

async function updateCampaignProgress(campaignId: string, outcome: "SENT" | "FAILED") {
  const updated = await db.campaign.update({
    where: { id: campaignId },
    data:
      outcome === "SENT"
        ? { sentCount: { increment: 1 } }
        : { failedCount: { increment: 1 } },
    select: { id: true, totalCount: true, sentCount: true, failedCount: true, status: true },
  });

  if (
    updated.totalCount > 0 &&
    updated.sentCount + updated.failedCount >= updated.totalCount &&
    updated.status !== CampaignStatus.DONE
  ) {
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.DONE,
        finishedAt: new Date(),
      },
    });
  }
}

export async function processSendMessageJob(
  data: SendMessageJobData,
  attemptsMade: number = 0,
  maxAttempts: number = 3
): Promise<void> {
  const msg = await db.message.findUnique({
    where: { id: data.messageId },
    include: {
      contact: {
        select: { id: true, fullName: true, optOutSms: true, optOutEmail: true },
      },
    },
  });

  if (!msg || msg.status === MessageStatus.SENT) {
    return;
  }

  // Respect opt-out flags on contact
  if (msg.contact) {
    const optedOut =
      (msg.channel === Channel.SMS && msg.contact.optOutSms) ||
      (msg.channel === Channel.EMAIL && msg.contact.optOutEmail);
    if (optedOut) {
      await db.message.update({
        where: { id: msg.id },
        data: {
          status: MessageStatus.FAILED,
          error: "مخاطب دریافت پیام در این کانال را لغو کرده است (Opt-out)",
        },
      });
      if (msg.campaignId) {
        await updateCampaignProgress(msg.campaignId, "FAILED");
      }
      return;
    }
  }

  const result = await sendMessage({
    to: msg.toAddress,
    body: msg.body,
    subject: msg.subject ?? undefined,
    template: data.template,
    token: data.token,
  });

  if (result.success) {
    await db.message.update({
      where: { id: msg.id },
      data: {
        status: MessageStatus.SENT,
        providerMessageId: result.messageId ?? null,
        sentAt: new Date(),
        error: null,
      },
    });

    if (msg.contactId) {
      await db.activity.create({
        data: {
          type: "MESSAGE",
          body: `${msg.channel === Channel.SMS ? "پیامک" : "ایمیل"} ارسال شد: ${msg.body.slice(0, 120)}`,
          contactId: msg.contactId,
          userId: msg.sentById ?? null,
        },
      });
    }

    if (msg.campaignId) {
      await updateCampaignProgress(msg.campaignId, "SENT");
    }
    return;
  }

  const errorText = result.error || "ارسال پیام توسط سرویس‌دهنده ناموفق بود";
  const isFinalAttempt = attemptsMade + 1 >= maxAttempts;

  if (isFinalAttempt) {
    await db.message.update({
      where: { id: msg.id },
      data: {
        status: MessageStatus.FAILED,
        error: errorText,
      },
    });
    if (msg.campaignId) {
      await updateCampaignProgress(msg.campaignId, "FAILED");
    }
  }

  throw new Error(errorText);
}

export async function processCampaignDispatchJob(data: CampaignDispatchJobData): Promise<void> {
  const campaign = await db.campaign.findUnique({ where: { id: data.campaignId } });
  if (!campaign) return;

  const filter = (campaign.filter ?? {}) as AudienceFilter;
  const where = buildAudienceWhere(filter);

  if (campaign.channel === Channel.SMS) {
    where.optOutSms = false;
    where.phone = { not: null };
  } else {
    where.optOutEmail = false;
    where.email = { not: null };
  }

  const contacts = await db.contact.findMany({
    where,
    select: { id: true, fullName: true, phone: true, email: true },
  });

  const eligible = contacts.filter((c) =>
    campaign.channel === Channel.SMS ? Boolean(c.phone?.trim()) : Boolean(c.email?.trim())
  );

  if (eligible.length === 0) {
    await db.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.DONE,
        totalCount: 0,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    return;
  }

  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      status: CampaignStatus.SENDING,
      totalCount: eligible.length,
      startedAt: new Date(),
    },
  });

  // Create Message rows and enqueue child jobs in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const createdMessages = await Promise.all(
      batch.map((c) =>
        db.message.create({
          data: {
            channel: campaign.channel,
            toAddress: campaign.channel === Channel.SMS ? c.phone! : c.email!,
            subject: campaign.subject,
            body: renderTemplate(campaign.body, c.fullName),
            status: MessageStatus.QUEUED,
            contactId: c.id,
            campaignId: campaign.id,
            sentById: campaign.createdById,
          },
          select: { id: true },
        })
      )
    );

    await Promise.all(
      createdMessages.map((m) => enqueueMessageJob({ messageId: m.id }))
    );
  }
}

const globalForWorker = globalThis as unknown as {
  messagesWorker?: Worker;
  automationsWorker?: Worker;
  workersStarted?: boolean;
};

export function isWorkerRunning(): boolean {
  return Boolean(globalForWorker.workersStarted && globalForWorker.messagesWorker);
}

export function startWorkers(): void {
  if (globalForWorker.workersStarted) return;
  globalForWorker.workersStarted = true;

  const messagesWorker = new Worker(
    "messages",
    async (job: Job) => {
      if (job.name === "campaign-dispatch") {
        await processCampaignDispatchJob(job.data as CampaignDispatchJobData);
        return;
      }
      await processSendMessageJob(
        job.data as SendMessageJobData,
        job.attemptsMade,
        job.opts.attempts ?? 3
      );
    },
    {
      connection: getBullConnection(),
      concurrency: 5,
    }
  );

  messagesWorker.on("error", (err) => {
    console.error("[BullMQ messages worker error]", err);
  });

  const automationsWorker = new Worker(
    "automations",
    async (job: Job) => {
      const data = job.data as AutomationStepJobData;
      await executeAutomationStep(data.runId, data.stepIndex);
    },
    {
      connection: getBullConnection(),
      concurrency: 5,
    }
  );

  automationsWorker.on("error", (err) => {
    console.error("[BullMQ automations worker error]", err);
  });

  globalForWorker.messagesWorker = messagesWorker;
  globalForWorker.automationsWorker = automationsWorker;

  const shutdown = async () => {
    try {
      await Promise.all([messagesWorker.close(), automationsWorker.close()]);
    } catch {
      // Ignore shutdown error
    }
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log("[BullMQ] Messages and Automations workers started.");
}
