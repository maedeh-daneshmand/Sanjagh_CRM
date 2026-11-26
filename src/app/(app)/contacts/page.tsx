import React from "react";
import { ContactKind } from "@prisma/client";
import { requireUser } from "@/server/auth";
import { listContacts, listAssignableUsers } from "@/server/contacts";
import ContactsClient from "./contacts-client";

export default async function ContactsPage() {
  const currentUser = await requireUser();
  const canAssign = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [{ items }, assignableUsers] = await Promise.all([
    listContacts({ kind: ContactKind.CUSTOMER }),
    canAssign ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return <ContactsClient initialContacts={items} assignableUsers={assignableUsers} />;
}
