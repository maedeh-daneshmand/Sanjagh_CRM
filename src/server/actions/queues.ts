"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireRole } from "../auth";
import { getAutomationsQueue, getMessagesQueue } from "../queue/queues";
import { retryFailedMessageAction } from "./messages";

export async function retryAllFailedJobsAction() {
  await requireRole("ADMIN");

  try {
    const failedMsgs = await db.message.findMany({
      where: { status: "FAILED" },
      take: 50,
      select: { id: true },
    });

    for (const m of failedMsgs) {
      await retryFailedMessageAction(m.id);
    }

    const messagesQueue = getMessagesQueue();
    const failedJobs = await messagesQueue.getFailed(0, 50);
    for (const job of failedJobs) {
      await job.retry().catch(() => {});
    }

    const automationsQueue = getAutomationsQueue();
    const failedAutoJobs = await automationsQueue.getFailed(0, 50);
    for (const job of failedAutoJobs) {
      await job.retry().catch(() => {});
    }

    revalidatePath("/admin/queues");
    return { ok: true, count: failedMsgs.length };
  } catch (err) {
    console.error("[retryAllFailedJobsAction error]", err);
    return { ok: false, error: "خطا در تلاش مجدد صف‌ها" };
  }
}
