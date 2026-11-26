import React from "react";
import { requireUser } from "@/server/auth";
import { listContactsForDealSelect } from "@/server/deals";
import { getAiModelName, isAiConfigured } from "@/server/ai/client";
import AiAssistantClient from "./ai-assistant-client";

export default async function AiAssistantPage() {
  await requireUser();
  const contacts = await listContactsForDealSelect();

  return (
    <AiAssistantClient
      contacts={contacts}
      aiConfigured={isAiConfigured()}
      aiModel={getAiModelName()}
    />
  );
}
