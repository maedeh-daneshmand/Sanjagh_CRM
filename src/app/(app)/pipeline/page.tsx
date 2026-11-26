import React from "react";
import { requireUser } from "@/server/auth";
import { listAssignableUsers } from "@/server/contacts";
import { listDealsByStage, listContactsForDealSelect } from "@/server/deals";
import PipelineClient from "./pipeline-client";

export default async function PipelinePage() {
  const currentUser = await requireUser();
  const canFilterByOwner =
    currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [pipelineData, contactOptions, assignableUsers] = await Promise.all([
    listDealsByStage(),
    listContactsForDealSelect(),
    canFilterByOwner ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return (
    <PipelineClient
      initialDeals={pipelineData.deals}
      contactOptions={contactOptions}
      assignableUsers={assignableUsers}
    />
  );
}
