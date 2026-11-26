import { DealStage, Prisma } from "@prisma/client";
import { db } from "./db";
import { requireUser } from "./auth";

export interface SerializableDeal {
  id: string;
  title: string;
  amount: number;
  stage: DealStage;
  position: number;
  contactId: string;
  contactName: string;
  company: string;
  ownerId: string;
  ownerName: string;
  expectedCloseAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StageColumnSummary {
  stage: DealStage;
  count: number;
  totalAmount: number;
  deals: SerializableDeal[];
}

export interface PipelineData {
  columns: Record<DealStage, StageColumnSummary>;
  deals: SerializableDeal[];
  totalPipelineValue: number;
  wonDealsValue: number;
  totalCount: number;
}

export interface DealContactOption {
  id: string;
  fullName: string;
  company: string | null;
  kind: string;
}

const ALL_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.CONTACTED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST,
];

export async function listDealsByStage(ownerFilterId?: string): Promise<PipelineData> {
  const currentUser = await requireUser();

  const where: Prisma.DealWhereInput = {};
  if (currentUser.role === "SALES") {
    where.ownerId = currentUser.id;
  } else if (ownerFilterId) {
    where.ownerId = ownerFilterId;
  }

  const rawDeals = await db.deal.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      contact: { select: { id: true, fullName: true, company: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  const columns = {} as Record<DealStage, StageColumnSummary>;
  for (const stage of ALL_STAGES) {
    columns[stage] = {
      stage,
      count: 0,
      totalAmount: 0,
      deals: [],
    };
  }

  const deals: SerializableDeal[] = rawDeals.map((d) => ({
    id: d.id,
    title: d.title,
    amount: Number(d.amount),
    stage: d.stage,
    position: d.position,
    contactId: d.contactId,
    contactName: d.contact.fullName,
    company: d.contact.company || "شخصی",
    ownerId: d.ownerId,
    ownerName: d.owner.name,
    expectedCloseAt: d.expectedCloseAt ? d.expectedCloseAt.toISOString() : null,
    closedAt: d.closedAt ? d.closedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  let totalPipelineValue = 0;
  let wonDealsValue = 0;

  for (const deal of deals) {
    const col = columns[deal.stage];
    col.deals.push(deal);
    col.count += 1;
    col.totalAmount += deal.amount;

    if (deal.stage !== DealStage.LOST) {
      totalPipelineValue += deal.amount;
    }
    if (deal.stage === DealStage.WON) {
      wonDealsValue += deal.amount;
    }
  }

  return {
    columns,
    deals,
    totalPipelineValue,
    wonDealsValue,
    totalCount: deals.length,
  };
}

export async function listContactsForDealSelect(): Promise<DealContactOption[]> {
  const currentUser = await requireUser();

  const where: Prisma.ContactWhereInput = { isActive: true };
  if (currentUser.role === "SALES") {
    where.ownerId = currentUser.id;
  }

  return db.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      fullName: true,
      company: true,
      kind: true,
    },
  });
}
