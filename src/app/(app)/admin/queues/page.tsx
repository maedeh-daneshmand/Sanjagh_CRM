import React from "react";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { getAutomationsQueue, getMessagesQueue } from "@/server/queue/queues";
import { isWorkerRunning } from "@/server/queue/worker";
import QueuesClient from "./queues-client";

export const dynamic = "force-dynamic";

export default async function AdminQueuesPage() {
  await requireRole("ADMIN");

  let msgCounts = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  let autoCounts = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };

  try {
    const [m, a] = await Promise.all([
      getMessagesQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      getAutomationsQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    ]);
    msgCounts = {
      waiting: m.waiting ?? 0,
      active: m.active ?? 0,
      completed: m.completed ?? 0,
      failed: m.failed ?? 0,
      delayed: m.delayed ?? 0,
    };
    autoCounts = {
      waiting: a.waiting ?? 0,
      active: a.active ?? 0,
      completed: a.completed ?? 0,
      failed: a.failed ?? 0,
      delayed: a.delayed ?? 0,
    };
  } catch {
    // Redis might be unavailable during build
  }

  const failedMessages = await db.message.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      channel: true,
      toAddress: true,
      error: true,
      createdAt: true,
    },
  });

  return (
    <QueuesClient
      workerRunning={isWorkerRunning()}
      msgCounts={msgCounts}
      autoCounts={autoCounts}
      failedMessages={failedMessages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
