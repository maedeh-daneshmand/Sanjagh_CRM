import React from "react";
import { requireUser } from "@/server/auth";
import { getManagerDashboard, getSalesDashboard } from "@/server/dashboard";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const user = await requireUser();
  const data =
    user.role === "SALES"
      ? await getSalesDashboard(user.id)
      : await getManagerDashboard();

  return <DashboardClient data={data} />;
}
