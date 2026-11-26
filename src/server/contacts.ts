import { ContactKind, LeadStatus, Priority, Source, Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { requireUser, requireRole } from "./auth";
import { calculateLeadScore } from "@/lib/lead-score";

export interface AssignableUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  await requireRole("ADMIN", "MANAGER");

  return db.user.findMany({
    where: {
      isActive: true,
      role: { in: [Role.SALES, Role.MANAGER] },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
    },
  });
}

export interface ListContactsParams {
  kind: ContactKind;
  search?: string;
  source?: Source;
  status?: LeadStatus;
  priority?: Priority;
  ownerId?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface SerializableContact {
  id: string;
  kind: ContactKind;
  fullName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  source: Source;
  sourceNote: string | null;
  leadStatus: LeadStatus;
  priority: Priority;
  score: number;
  tags: string[];
  notes: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdById: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  dealsCount: number;
  totalSpent: number;
}

export async function recalculateAndSaveContactScore(contactId: string): Promise<number> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { activities: true },
      },
    },
  });

  if (!contact) return 0;

  let recentActivityDaysAgo: number | undefined;
  if (contact.activities.length > 0) {
    const diffMs = Date.now() - new Date(contact.activities[0].createdAt).getTime();
    recentActivityDaysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const score = calculateLeadScore({
    source: contact.source,
    priority: contact.priority,
    activitiesCount: contact._count.activities,
    recentActivityDaysAgo,
  });

  await db.contact.update({
    where: { id: contactId },
    data: { score },
  });

  return score;
}

export async function listContacts(params: ListContactsParams): Promise<{
  items: SerializableContact[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const currentUser = await requireUser();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 50));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactWhereInput = {
    kind: params.kind,
    isActive: true,
  };

  // Scope by role: SALES only sees their assigned contacts
  if (currentUser.role === "SALES") {
    where.ownerId = currentUser.id;
  } else if (params.ownerId) {
    where.ownerId = params.ownerId;
  }

  if (params.source) {
    where.source = params.source;
  }

  if (params.status) {
    where.leadStatus = params.status;
  }

  if (params.priority) {
    where.priority = params.priority;
  }

  if (params.tags && params.tags.length > 0) {
    where.tags = { hasSome: params.tags };
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { fullName: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, rawItems] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        deals: { select: { id: true, amount: true, stage: true } },
        _count: { select: { deals: true } },
      },
    }),
  ]);

  const items: SerializableContact[] = rawItems.map((c) => {
    const totalSpent = c.deals
      .filter((d) => d.stage === "WON")
      .reduce((acc, d) => acc + Number(d.amount), 0);

    return {
      id: c.id,
      kind: c.kind,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      company: c.company,
      city: c.city,
      source: c.source,
      sourceNote: c.sourceNote,
      leadStatus: c.leadStatus,
      priority: c.priority,
      score: c.score,
      tags: c.tags,
      notes: c.notes,
      ownerId: c.ownerId,
      ownerName: c.owner?.name || null,
      createdById: c.createdById,
      convertedAt: c.convertedAt ? c.convertedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      dealsCount: c._count.deals,
      totalSpent,
    };
  });

  return { items, total, page, pageSize };
}

export interface ContactDetailData {
  id: string;
  kind: ContactKind;
  fullName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  source: Source;
  sourceNote: string | null;
  leadStatus: LeadStatus;
  priority: Priority;
  score: number;
  tags: string[];
  notes: string | null;
  ownerId: string | null;
  ownerName: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; phone: string } | null;
  deals: {
    id: string;
    title: string;
    amount: number;
    stage: string;
    createdAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    createdAt: string;
  }[];
  activities: {
    id: string;
    type: string;
    body: string | null;
    meta: unknown;
    createdAt: string;
    userName: string | null;
  }[];
  messages: {
    id: string;
    channel: string;
    toAddress: string;
    body: string;
    status: string;
    createdAt: string;
  }[];
  aiSummary: {
    summary: string;
    risk: string | null;
    nextStep: string | null;
  } | null;
}

export async function getContact(id: string): Promise<ContactDetailData | null> {
  const currentUser = await requireUser();

  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, amount: true, stage: true, createdAt: true },
      },
      tasks: {
        orderBy: { dueAt: "asc" },
        select: { id: true, title: true, status: true, dueAt: true, createdAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, channel: true, toAddress: true, body: true, status: true, createdAt: true },
      },
      aiSummary: {
        select: { summary: true, risk: true, nextStep: true },
      },
    },
  });

  if (!contact || !contact.isActive) return null;

  // Scoping: SALES only allowed to see contacts they own
  if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
    return null;
  }

  return {
    id: contact.id,
    kind: contact.kind,
    fullName: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    company: contact.company,
    city: contact.city,
    source: contact.source,
    sourceNote: contact.sourceNote,
    leadStatus: contact.leadStatus,
    priority: contact.priority,
    score: contact.score,
    tags: contact.tags,
    notes: contact.notes,
    ownerId: contact.ownerId,
    ownerName: contact.owner?.name || null,
    convertedAt: contact.convertedAt ? contact.convertedAt.toISOString() : null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    owner: contact.owner,
    deals: contact.deals.map((d) => ({
      id: d.id,
      title: d.title,
      amount: Number(d.amount),
      stage: d.stage,
      createdAt: d.createdAt.toISOString(),
    })),
    tasks: contact.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    })),
    activities: contact.activities.map((a) => ({
      id: a.id,
      type: a.type,
      body: a.body,
      meta: a.meta,
      createdAt: a.createdAt.toISOString(),
      userName: a.user?.name || null,
    })),
    messages: contact.messages.map((m) => ({
      id: m.id,
      channel: m.channel,
      toAddress: m.toAddress,
      body: m.body,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
    })),
    aiSummary: contact.aiSummary,
  };
}
