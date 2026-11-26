import React from "react";
import { ContactKind } from "@prisma/client";
import { requireUser } from "@/server/auth";
import { listContacts, listAssignableUsers } from "@/server/contacts";
import LeadsClient from "./leads-client";

export default async function LeadsPage() {
  const currentUser = await requireUser();
  const canAssign = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [{ items }, assignableUsers] = await Promise.all([
    listContacts({ kind: ContactKind.LEAD }),
    canAssign ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return <LeadsClient initialLeads={items} assignableUsers={assignableUsers} />;
}
