import { db } from "./db";
import { requireRole } from "./auth";

export interface RepDetailData {
  id: string;
  name: string;
  phone: string;
  role: string;
  contacts: {
    id: string;
    fullName: string;
    company: string | null;
    kind: string;
    score: number;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
  }[];
  activities: {
    id: string;
    type: string;
    body: string | null;
    contactName: string;
    createdAt: string;
  }[];
}

export async function getRepDetail(repId: string): Promise<RepDetailData | null> {
  await requireRole("ADMIN", "MANAGER");

  const rep = await db.user.findUnique({
    where: { id: repId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      ownedContacts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, fullName: true, company: true, kind: true, score: true },
      },
      assignedTasks: {
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 10,
        select: { id: true, title: true, status: true, dueAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { contact: { select: { fullName: true } } },
      },
    },
  });

  if (!rep) return null;

  return {
    id: rep.id,
    name: rep.name,
    phone: rep.phone,
    role: rep.role,
    contacts: rep.ownedContacts,
    tasks: rep.assignedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    })),
    activities: rep.activities.map((a) => ({
      id: a.id,
      type: a.type,
      body: a.body,
      contactName: a.contact.fullName,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
