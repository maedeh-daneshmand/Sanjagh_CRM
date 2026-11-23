import React from "react";
import { ContactKind } from "@prisma/client";
import { listContacts } from "@/server/contacts";
import LeadsClient from "./leads-client";

export default async function LeadsPage() {
  const { items } = await listContacts({
    kind: ContactKind.LEAD,
  });

  return <LeadsClient initialLeads={items} />;
}
