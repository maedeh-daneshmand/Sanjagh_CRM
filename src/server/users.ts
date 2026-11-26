import { Role } from "@prisma/client";
import { db } from "./db";
import { requireRole } from "./auth";

export interface SerializableUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  _count: {
    ownedContacts: number;
    ownedDeals: number;
    assignedTasks: number;
  };
}

export async function listUsers(): Promise<SerializableUser[]> {
  await requireRole("ADMIN");

  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          ownedContacts: true,
          ownedDeals: true,
          assignedTasks: true,
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    _count: u._count,
  }));
}
