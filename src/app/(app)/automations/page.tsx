import React from "react";
import { requireRole } from "@/server/auth";
import { listAutomations } from "@/server/automations/queries";
import AutomationsClient from "./automations-client";

export default async function AutomationsPage() {
  await requireRole("ADMIN", "MANAGER");
  const { automations, recentRuns } = await listAutomations();

  return (
    <AutomationsClient
      initialAutomations={automations}
      recentRuns={recentRuns}
    />
  );
}
