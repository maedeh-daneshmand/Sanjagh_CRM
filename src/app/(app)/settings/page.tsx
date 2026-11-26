import React from "react";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const user = await requireUser();

  const [messagesSentCount, activeUsersCount, aiSummariesCount, aiSuggestionsCount] =
    await Promise.all([
      db.message.count({ where: { status: "SENT" } }),
      db.user.count({ where: { isActive: true } }),
      db.aiSummary.count(),
      db.aiSuggestion.count(),
    ]);

  return (
    <SettingsClient
      initialProfile={{
        name: user.name,
        phone: user.phone,
        email: user.email || "",
        role: user.role,
      }}
      usage={{
        messagesSentCount,
        activeUsersCount,
        aiRequestsCount: aiSummariesCount + aiSuggestionsCount,
      }}
    />
  );
}
