import React from "react";
import { requireRole } from "@/server/auth";
import { listCampaigns } from "@/server/campaigns";
import { listAssignableUsers } from "@/server/contacts";
import CampaignsClient from "./campaigns-client";

export default async function CampaignsPage() {
  await requireRole("ADMIN", "MANAGER");
  const [campaigns, assignableUsers] = await Promise.all([
    listCampaigns(),
    listAssignableUsers(),
  ]);

  return (
    <CampaignsClient
      initialCampaigns={campaigns}
      assignableUsers={assignableUsers}
    />
  );
}
