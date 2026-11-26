import React from "react";
import { requireRole } from "@/server/auth";
import { getTeamPerformanceRows } from "@/server/dashboard";
import TeamClient from "./team-client";

export default async function TeamPage() {
  await requireRole("ADMIN", "MANAGER");
  const reps = await getTeamPerformanceRows();

  return <TeamClient initialReps={reps} />;
}
