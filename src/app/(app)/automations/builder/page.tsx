import React from "react";
import { requireRole } from "@/server/auth";
import { getAutomationById } from "@/server/automations/queries";
import { listContactsForDealSelect } from "@/server/deals";
import { listAssignableUsers } from "@/server/contacts";
import BuilderClient from "./builder-client";

export default async function AutomationBuilderPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  await requireRole("ADMIN", "MANAGER");

  const [existing, contactOptions, assignableUsers] = await Promise.all([
    searchParams.id ? getAutomationById(searchParams.id) : Promise.resolve(null),
    listContactsForDealSelect(),
    listAssignableUsers(),
  ]);

  return (
    <BuilderClient
      initialAutomation={existing}
      contactOptions={contactOptions}
      assignableUsers={assignableUsers}
    />
  );
}
