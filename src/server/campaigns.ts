import { CampaignStatus, Channel } from "@prisma/client";
import { db } from "./db";
import { requireRole } from "./auth";
import { AudienceFilter, buildAudienceWhere } from "./queue/worker";

export interface SerializableCampaign {
  id: string;
  name: string;
  channel: Channel;
  subject: string | null;
  body: string;
  filter: AudienceFilter;
  status: CampaignStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdByName: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface FailedCampaignMessage {
  id: string;
  toAddress: string;
  error: string | null;
  contactName: string | null;
  createdAt: string;
}

export async function listCampaigns(): Promise<SerializableCampaign[]> {
  await requireRole("ADMIN", "MANAGER");

  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    subject: c.subject,
    body: c.body,
    filter: (c.filter ?? {}) as AudienceFilter,
    status: c.status,
    totalCount: c.totalCount,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    createdByName: c.createdBy.name,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    finishedAt: c.finishedAt ? c.finishedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getCampaignFailedMessages(
  campaignId: string
): Promise<FailedCampaignMessage[]> {
  await requireRole("ADMIN", "MANAGER");

  const rows = await db.message.findMany({
    where: { campaignId, status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contact: { select: { fullName: true } },
    },
  });

  return rows.map((m) => ({
    id: m.id,
    toAddress: m.toAddress,
    error: m.error,
    contactName: m.contact?.fullName ?? null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function countCampaignAudience(
  channel: Channel,
  filter: AudienceFilter
): Promise<number> {
  await requireRole("ADMIN", "MANAGER");
  const where = buildAudienceWhere(filter);
  if (channel === Channel.SMS) {
    where.optOutSms = false;
    where.phone = { not: null };
  } else {
    where.optOutEmail = false;
    where.email = { not: null };
  }
  return db.contact.count({ where });
}
