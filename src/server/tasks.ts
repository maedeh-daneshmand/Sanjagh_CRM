import { Priority, Prisma, TaskOrigin, TaskStatus } from "@prisma/client";
import { db } from "./db";
import { requireUser } from "./auth";

export type TaskCategory = "OVERDUE" | "TODAY" | "UPCOMING" | "DONE";

export interface SerializableTask {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: TaskStatus;
  priority: Priority;
  origin: TaskOrigin;
  category: TaskCategory;
  assigneeId: string;
  assigneeName: string;
  contactId: string | null;
  contactName: string | null;
  contactCompany: string | null;
  dealId: string | null;
  dealTitle: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns the UTC start and end Date objects for the current calendar day in Asia/Tehran.
 */
export function getTehranDayBounds(referenceDate: Date = new Date()): {
  startOfToday: Date;
  endOfToday: Date;
  tehranYmd: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const tehranYmd = formatter.format(referenceDate); // YYYY-MM-DD in Asia/Tehran
  const startOfToday = new Date(`${tehranYmd}T00:00:00.000+03:30`);
  const endOfToday = new Date(`${tehranYmd}T23:59:59.999+03:30`);
  return { startOfToday, endOfToday, tehranYmd };
}

export function classifyTaskCategory(
  status: TaskStatus,
  dueAt: Date | null,
  referenceDate: Date = new Date()
): TaskCategory {
  if (status === TaskStatus.DONE) return "DONE";
  if (!dueAt) return "TODAY";

  const { startOfToday, endOfToday } = getTehranDayBounds(referenceDate);
  if (dueAt < startOfToday) return "OVERDUE";
  if (dueAt <= endOfToday) return "TODAY";
  return "UPCOMING";
}

export interface ListTasksParams {
  tab?: "ALL" | TaskCategory;
  assigneeFilterId?: string;
  now?: Date;
}

export async function listTasks(params: ListTasksParams = {}): Promise<{
  tasks: SerializableTask[];
  counts: {
    all: number;
    overdue: number;
    today: number;
    upcoming: number;
    done: number;
  };
}> {
  const currentUser = await requireUser();
  const now = params.now ?? new Date();

  const where: Prisma.TaskWhereInput = {};
  if (currentUser.role === "SALES") {
    where.assigneeId = currentUser.id;
  } else if (params.assigneeFilterId) {
    where.assigneeId = params.assigneeFilterId;
  }

  const rawTasks = await db.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true } },
      contact: { select: { id: true, fullName: true, company: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  let overdue = 0;
  let today = 0;
  let upcoming = 0;
  let done = 0;

  const allMapped: SerializableTask[] = rawTasks.map((t) => {
    const category = classifyTaskCategory(t.status, t.dueAt, now);
    if (category === "OVERDUE") overdue += 1;
    else if (category === "TODAY") today += 1;
    else if (category === "UPCOMING") upcoming += 1;
    else done += 1;

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      status: t.status,
      priority: t.priority,
      origin: t.origin,
      category,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee.name,
      contactId: t.contactId,
      contactName: t.contact?.fullName ?? null,
      contactCompany: t.contact?.company ?? null,
      dealId: t.dealId,
      dealTitle: t.deal?.title ?? null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const tasks =
    params.tab && params.tab !== "ALL"
      ? allMapped.filter((t) => t.category === params.tab)
      : allMapped;

  return {
    tasks,
    counts: {
      all: allMapped.length,
      overdue,
      today,
      upcoming,
      done,
    },
  };
}

export async function getTasksByRange(
  fromIso: string,
  toIso: string,
  assigneeFilterId?: string
): Promise<SerializableTask[]> {
  const currentUser = await requireUser();
  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);

  const where: Prisma.TaskWhereInput = {
    dueAt: {
      gte: fromDate,
      lte: toDate,
    },
  };

  if (currentUser.role === "SALES") {
    where.assigneeId = currentUser.id;
  } else if (assigneeFilterId) {
    where.assigneeId = assigneeFilterId;
  }

  const rawTasks = await db.task.findMany({
    where,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true } },
      contact: { select: { id: true, fullName: true, company: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  const now = new Date();
  return rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    status: t.status,
    priority: t.priority,
    origin: t.origin,
    category: classifyTaskCategory(t.status, t.dueAt, now),
    assigneeId: t.assigneeId,
    assigneeName: t.assignee.name,
    contactId: t.contactId,
    contactName: t.contact?.fullName ?? null,
    contactCompany: t.contact?.company ?? null,
    dealId: t.dealId,
    dealTitle: t.deal?.title ?? null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function getOverdueTaskCount(): Promise<number> {
  const currentUser = await requireUser();
  const { startOfToday } = getTehranDayBounds();

  const where: Prisma.TaskWhereInput = {
    status: TaskStatus.TODO,
    dueAt: { lt: startOfToday },
  };

  if (currentUser.role === "SALES") {
    where.assigneeId = currentUser.id;
  }

  return db.task.count({ where });
}
