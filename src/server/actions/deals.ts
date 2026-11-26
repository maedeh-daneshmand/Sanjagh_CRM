"use server";

import { revalidatePath } from "next/cache";
import { DealStage } from "@prisma/client";
import { db } from "../db";
import { requireUser } from "../auth";
import { recalculateAndSaveContactScore } from "../contacts";
import { createDealSchema, moveDealSchema, updateDealSchema } from "@/lib/schemas/deals";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in non-request contexts like unit tests
  }
}

const STAGE_LABELS: Record<DealStage, string> = {
  NEW: "سرنخ جدید",
  CONTACTED: "تماس و ارزیابی",
  PROPOSAL: "پیش‌فاکتور و دمو",
  NEGOTIATION: "مذاکره نهایی",
  WON: "بسته شده (برنده)",
  LOST: "از دست رفته",
};

function isClosedStage(stage: DealStage): boolean {
  return stage === DealStage.WON || stage === DealStage.LOST;
}

export async function createDealAction(rawInput: unknown) {
  const parsed = createDealSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const data = parsed.data;

  try {
    const contact = await db.contact.findUnique({
      where: { id: data.contactId },
      select: { id: true, fullName: true, company: true, ownerId: true, isActive: true },
    });

    if (!contact || !contact.isActive) {
      return { ok: false, error: "مخاطب انتخاب‌شده یافت نشد" };
    }

    if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به ثبت معامله برای این مخاطب نیستید" };
    }

    let ownerId = currentUser.id;
    let ownerName = currentUser.name;

    if (currentUser.role !== "SALES" && data.ownerId) {
      const targetUser = await db.user.findUnique({
        where: { id: data.ownerId },
        select: { id: true, name: true, isActive: true },
      });
      if (!targetUser || !targetUser.isActive) {
        return { ok: false, error: "کارشناس انتخاب‌شده معتبر نیست" };
      }
      ownerId = targetUser.id;
      ownerName = targetUser.name;
    }

    // Place at the bottom of the target stage column
    const lastDeal = await db.deal.findFirst({
      where: { stage: data.stage },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = lastDeal ? lastDeal.position + 1000 : 1000;
    const closedAt = isClosedStage(data.stage) ? new Date() : null;

    const deal = await db.deal.create({
      data: {
        title: data.title,
        amount: data.amount,
        stage: data.stage,
        position,
        contactId: contact.id,
        ownerId,
        expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
        closedAt,
      },
    });

    await db.activity.create({
      data: {
        type: "STAGE_CHANGE",
        body: `معامله «${deal.title}» در مرحله «${STAGE_LABELS[data.stage]}» ثبت شد`,
        meta: { to: data.stage },
        contactId: contact.id,
        dealId: deal.id,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contact.id);

    safeRevalidatePath("/pipeline");
    safeRevalidatePath(`/contacts/${contact.id}`);
    safeRevalidatePath("/");

    return {
      ok: true,
      data: {
        id: deal.id,
        title: deal.title,
        amount: Number(deal.amount),
        stage: deal.stage,
        position: deal.position,
        contactId: deal.contactId,
        contactName: contact.fullName,
        company: contact.company || "شخصی",
        ownerId,
        ownerName,
        expectedCloseAt: deal.expectedCloseAt ? deal.expectedCloseAt.toISOString() : null,
        closedAt: deal.closedAt ? deal.closedAt.toISOString() : null,
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[createDealAction error]", err);
    return { ok: false, error: "خطا در ثبت معامله جدید" };
  }
}

export async function moveDealAction(rawInput: unknown) {
  const parsed = moveDealSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های انتقال نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { dealId, toStage, newPosition } = parsed.data;

  try {
    const existing = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        stage: true,
        position: true,
        ownerId: true,
        contactId: true,
        closedAt: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "معامله یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به جابه‌جایی این معامله نیستید" };
    }

    const stageChanged = existing.stage !== toStage;
    let nextClosedAt = existing.closedAt;

    if (isClosedStage(toStage)) {
      if (!isClosedStage(existing.stage) || !existing.closedAt) {
        nextClosedAt = new Date();
      }
    } else {
      // Reopened from WON/LOST -> clear closedAt
      nextClosedAt = null;
    }

    const updated = await db.deal.update({
      where: { id: dealId },
      data: {
        stage: toStage,
        position: newPosition,
        closedAt: nextClosedAt,
      },
    });

    if (stageChanged) {
      await db.activity.create({
        data: {
          type: "STAGE_CHANGE",
          body: `مرحله معامله «${existing.title}» از «${STAGE_LABELS[existing.stage]}» به «${STAGE_LABELS[toStage]}» تغییر کرد`,
          meta: { from: existing.stage, to: toStage },
          contactId: existing.contactId,
          dealId: existing.id,
          userId: currentUser.id,
        },
      });

      await recalculateAndSaveContactScore(existing.contactId);
    }

    safeRevalidatePath("/pipeline");
    safeRevalidatePath(`/contacts/${existing.contactId}`);
    safeRevalidatePath("/");

    return {
      ok: true,
      data: {
        id: updated.id,
        stage: updated.stage,
        position: updated.position,
        closedAt: updated.closedAt ? updated.closedAt.toISOString() : null,
      },
    };
  } catch (err) {
    console.error("[moveDealAction error]", err);
    return { ok: false, error: "خطا در انتقال معامله" };
  }
}

export async function updateDealAction(rawInput: unknown) {
  const parsed = updateDealSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ویرایش نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { id, ...updates } = parsed.data;

  try {
    const existing = await db.deal.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        stage: true,
        ownerId: true,
        contactId: true,
        closedAt: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "معامله یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به ویرایش این معامله نیستید" };
    }

    const targetStage = updates.stage ?? existing.stage;
    const stageChanged = targetStage !== existing.stage;
    let nextClosedAt = existing.closedAt;

    if (updates.stage !== undefined) {
      if (isClosedStage(targetStage)) {
        if (!isClosedStage(existing.stage) || !existing.closedAt) {
          nextClosedAt = new Date();
        }
      } else {
        nextClosedAt = null;
      }
    }

    await db.deal.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.stage !== undefined && { stage: updates.stage, closedAt: nextClosedAt }),
        ...(currentUser.role !== "SALES" && updates.ownerId ? { ownerId: updates.ownerId } : {}),
        ...(updates.expectedCloseAt !== undefined && {
          expectedCloseAt: updates.expectedCloseAt ? new Date(updates.expectedCloseAt) : null,
        }),
      },
    });

    if (stageChanged) {
      await db.activity.create({
        data: {
          type: "STAGE_CHANGE",
          body: `مرحله معامله «${updates.title ?? existing.title}» از «${STAGE_LABELS[existing.stage]}» به «${STAGE_LABELS[targetStage]}» تغییر کرد`,
          meta: { from: existing.stage, to: targetStage },
          contactId: existing.contactId,
          dealId: existing.id,
          userId: currentUser.id,
        },
      });
    }

    safeRevalidatePath("/pipeline");
    safeRevalidatePath(`/contacts/${existing.contactId}`);
    safeRevalidatePath("/");

    return { ok: true };
  } catch (err) {
    console.error("[updateDealAction error]", err);
    return { ok: false, error: "خطا در ویرایش معامله" };
  }
}

export async function deleteDealAction(dealId: string) {
  const currentUser = await requireUser();

  try {
    const existing = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, ownerId: true, contactId: true },
    });

    if (!existing) {
      return { ok: false, error: "معامله یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به حذف این معامله نیستید" };
    }

    await db.deal.delete({ where: { id: dealId } });

    safeRevalidatePath("/pipeline");
    safeRevalidatePath(`/contacts/${existing.contactId}`);
    safeRevalidatePath("/");

    return { ok: true };
  } catch (err) {
    console.error("[deleteDealAction error]", err);
    return { ok: false, error: "خطا در حذف معامله" };
  }
}
