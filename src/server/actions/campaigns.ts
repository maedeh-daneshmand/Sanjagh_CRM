"use server";

import { revalidatePath } from "next/cache";
import { CampaignStatus, Channel } from "@prisma/client";
import { db } from "../db";
import { requireRole } from "../auth";
import { campaignFilterSchema, createCampaignSchema } from "@/lib/schemas/campaigns";
import {
  countCampaignAudience,
  getCampaignFailedMessages,
  listCampaigns,
} from "../campaigns";
import { enqueueCampaignDispatchJob } from "../queue/queues";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function previewCampaignAudienceAction(
  channel: Channel,
  rawFilter: unknown
) {
  await requireRole("ADMIN", "MANAGER");
  const parsed = campaignFilterSchema.safeParse(rawFilter);
  if (!parsed.success) {
    return { ok: false, error: "فیلتر مخاطبان نامعتبر است" };
  }

  try {
    const count = await countCampaignAudience(channel, parsed.data);
    return { ok: true, data: { count } };
  } catch (err) {
    console.error("[previewCampaignAudienceAction error]", err);
    return { ok: false, error: "خطا در محاسبه تعداد مخاطبان" };
  }
}

export async function createAndSendCampaignAction(rawInput: unknown) {
  const currentUser = await requireRole("ADMIN", "MANAGER");
  const parsed = createCampaignSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های کمپین نامعتبر است" };
  }

  const data = parsed.data;

  try {
    const estimatedCount = await countCampaignAudience(data.channel, data.filter);

    const campaign = await db.campaign.create({
      data: {
        name: data.name.trim(),
        channel: data.channel,
        subject: data.channel === Channel.EMAIL ? data.subject || data.name : null,
        body: data.body,
        filter: data.filter,
        status: CampaignStatus.QUEUED,
        totalCount: estimatedCount,
        createdById: currentUser.id,
      },
    });

    await enqueueCampaignDispatchJob(campaign.id);

    safeRevalidatePath("/campaigns");
    safeRevalidatePath("/admin/queues");

    return {
      ok: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        subject: campaign.subject,
        body: campaign.body,
        filter: data.filter,
        status: campaign.status,
        totalCount: campaign.totalCount,
        sentCount: 0,
        failedCount: 0,
        createdByName: currentUser.name,
        startedAt: null,
        finishedAt: null,
        createdAt: campaign.createdAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[createAndSendCampaignAction error]", err);
    return { ok: false, error: "خطا در ایجاد و صف‌بندی کمپین" };
  }
}

export async function refreshCampaignsAction() {
  try {
    const campaigns = await listCampaigns();
    return { ok: true, data: campaigns };
  } catch (err) {
    console.error("[refreshCampaignsAction error]", err);
    return { ok: false, error: "خطا در دریافت وضعیت کمپین‌ها" };
  }
}

export async function getCampaignFailedMessagesAction(campaignId: string) {
  try {
    const messages = await getCampaignFailedMessages(campaignId);
    return { ok: true, data: messages };
  } catch (err) {
    console.error("[getCampaignFailedMessagesAction error]", err);
    return { ok: false, error: "خطا در دریافت پیام‌های ناموفق" };
  }
}
