"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db";
import { requireRole } from "../auth";
import { getRepDetail } from "../team";

const bulkReassignSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
});

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function getRepDetailAction(repId: string) {
  await requireRole("ADMIN", "MANAGER");
  try {
    const detail = await getRepDetail(repId);
    if (!detail) return { ok: false, error: "کارشناس یافت نشد" };
    return { ok: true, data: detail };
  } catch (err) {
    console.error("[getRepDetailAction error]", err);
    return { ok: false, error: "خطا در دریافت جزئیات کارشناس" };
  }
}

export async function bulkReassignRepContactsAction(rawInput: unknown) {
  const currentUser = await requireRole("ADMIN", "MANAGER");
  const parsed = bulkReassignSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "اطلاعات بازتخصیص نامعتبر است" };
  }

  const { fromUserId, toUserId } = parsed.data;
  if (fromUserId === toUserId) {
    return { ok: false, error: "کارشناس مبدأ و مقصد نمی‌توانند یکسان باشند" };
  }

  try {
    const [fromUser, toUser] = await Promise.all([
      db.user.findUnique({ where: { id: fromUserId }, select: { id: true, name: true } }),
      db.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true, isActive: true } }),
    ]);

    if (!fromUser || !toUser || !toUser.isActive) {
      return { ok: false, error: "کارشناس انتخاب‌شده معتبر نیست" };
    }

    const movedCount = await db.$transaction(async (tx) => {
      const contacts = await tx.contact.findMany({
        where: { ownerId: fromUserId, isActive: true },
        select: { id: true },
      });

      if (contacts.length === 0) return 0;

      const ids = contacts.map((c) => c.id);
      await tx.contact.updateMany({
        where: { id: { in: ids } },
        data: { ownerId: toUserId },
      });

      await tx.activity.createMany({
        data: ids.map((contactId) => ({
          type: "ASSIGNMENT",
          body: `مالکیت مخاطب از «${fromUser.name}» به «${toUser.name}» منتقل شد`,
          meta: {
            fromOwnerId: fromUser.id,
            fromOwnerName: fromUser.name,
            toOwnerId: toUser.id,
            toOwnerName: toUser.name,
          },
          contactId,
          userId: currentUser.id,
        })),
      });

      return ids.length;
    });

    safeRevalidatePath("/team");
    safeRevalidatePath("/leads");
    safeRevalidatePath("/contacts");

    return { ok: true, data: { count: movedCount, toUserName: toUser.name } };
  } catch (err) {
    console.error("[bulkReassignRepContactsAction error]", err);
    return { ok: false, error: "خطا در بازتخصیص گروهی" };
  }
}
