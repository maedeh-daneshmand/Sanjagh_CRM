"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireRole } from "../auth";
import { recalculateAndSaveContactScore } from "../contacts";
import { emitEvent } from "../automations/engine";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in non-request contexts like unit tests
  }
}
import {
  createContactSchema,
  updateContactSchema,
  assignOwnerSchema,
  assignManySchema,
  changeLeadStatusSchema,
  changePrioritySchema,
  addNoteSchema,
  logActivitySchema,
} from "@/lib/schemas/contacts";

export async function createContactAction(rawInput: unknown) {
  const parsed = createContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const data = parsed.data;

  // SALES can only create contacts owned by themselves; ignore any ownerId sent by SALES
  let ownerId: string | null = currentUser.id;
  let ownerName: string | null = currentUser.name;

  if (currentUser.role !== "SALES" && data.ownerId !== undefined) {
    if (data.ownerId) {
      const targetUser = await db.user.findUnique({ where: { id: data.ownerId } });
      if (!targetUser || !targetUser.isActive) {
        return { ok: false, error: "کارشناس انتخاب‌شده معتبر نیست" };
      }
      ownerId = targetUser.id;
      ownerName = targetUser.name;
    } else {
      ownerId = null;
      ownerName = null;
    }
  }

  try {
    const contact = await db.contact.create({
      data: {
        fullName: data.fullName,
        kind: data.kind,
        phone: data.phone || null,
        email: data.email || null,
        company: data.company || null,
        city: data.city || null,
        source: data.source,
        sourceNote: data.sourceNote || null,
        leadStatus: data.leadStatus,
        priority: data.priority,
        tags: data.tags,
        notes: data.notes || null,
        ownerId,
        createdById: currentUser.id,
      },
    });

    // Write initial Activity
    await db.activity.create({
      data: {
        type: "NOTE",
        body: data.kind === "CUSTOMER" ? "مشتری جدید ایجاد شد" : "سرنخ جدید ثبت شد",
        contactId: contact.id,
        userId: currentUser.id,
      },
    });

    const score = await recalculateAndSaveContactScore(contact.id);

    try {
      await emitEvent(
        contact.kind === "CUSTOMER" ? "CUSTOMER_CREATED" : "LEAD_CREATED",
        {
          contactId: contact.id,
          source: contact.source,
          priority: contact.priority,
          leadStatus: contact.leadStatus,
          kind: contact.kind,
        }
      );
    } catch (autoErr) {
      console.error("[createContactAction emitEvent error]", autoErr);
    }

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");

    return { ok: true, data: { id: contact.id, ownerId, ownerName, score } };
  } catch (err) {
    console.error("[createContactAction error]", err);
    return { ok: false, error: "خطا در ثبت مخاطب در پایگاه داده" };
  }
}

export async function updateContactAction(rawInput: unknown) {
  const parsed = updateContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { id, ...updates } = parsed.data;

  try {
    const existing = await db.contact.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به ویرایش این مخاطب نیستید" };
    }

    await db.contact.update({
      where: { id },
      data: {
        ...(updates.fullName && { fullName: updates.fullName }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.company !== undefined && { company: updates.company }),
        ...(updates.city !== undefined && { city: updates.city }),
        ...(updates.source && { source: updates.source }),
        ...(updates.sourceNote !== undefined && { sourceNote: updates.sourceNote }),
        ...(updates.leadStatus && { leadStatus: updates.leadStatus }),
        ...(updates.priority && { priority: updates.priority }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(currentUser.role !== "SALES" && updates.ownerId !== undefined && { ownerId: updates.ownerId }),
      },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        body: "اطلاعات مخاطب به‌روزرسانی شد",
        contactId: id,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(id);

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");
    safeRevalidatePath(`/contacts/${id}`);

    return { ok: true };
  } catch (err) {
    console.error("[updateContactAction error]", err);
    return { ok: false, error: "خطا در ویرایش مخاطب" };
  }
}

export async function deleteContactAction(id: string) {
  const currentUser = await requireUser();

  try {
    const existing = await db.contact.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "شما دسترسی حذف این مخاطب را ندارید" };
    }

    await db.contact.update({
      where: { id },
      data: { isActive: false },
    });

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");

    return { ok: true };
  } catch (err) {
    console.error("[deleteContactAction error]", err);
    return { ok: false, error: "خطا در حذف مخاطب" };
  }
}

export async function assignOwnerAction(rawInput: unknown) {
  const parsed = assignOwnerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  // Only MANAGER and ADMIN can assign owners
  const currentUser = await requireRole("ADMIN", "MANAGER");
  const { contactId, ownerId } = parsed.data;

  try {
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: { owner: { select: { name: true } } },
    });
    if (!contact || !contact.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    const fromName = contact.owner?.name || "تخصیص‌نیافته";
    let toName = "تخصیص‌نیافته";

    if (ownerId) {
      const targetUser = await db.user.findUnique({ where: { id: ownerId } });
      if (!targetUser || !targetUser.isActive) {
        return { ok: false, error: "کارشناس انتخاب‌شده معتبر نیست" };
      }
      toName = targetUser.name;
    }

    await db.contact.update({
      where: { id: contactId },
      data: { ownerId },
    });

    await db.activity.create({
      data: {
        type: "ASSIGNMENT",
        body: `مالکیت مخاطب از «${fromName}» به «${toName}» تغییر یافت`,
        meta: {
          fromOwnerId: contact.ownerId,
          fromOwnerName: fromName,
          toOwnerId: ownerId,
          toOwnerName: toName,
        },
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");
    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true, data: { ownerId, ownerName: ownerId ? toName : null } };
  } catch (err) {
    console.error("[assignOwnerAction error]", err);
    return { ok: false, error: "خطا در تخصیص کارشناس" };
  }
}

export async function assignManyAction(rawInput: unknown) {
  const parsed = assignManySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  // Only MANAGER and ADMIN can bulk-assign owners
  const currentUser = await requireRole("ADMIN", "MANAGER");
  const { contactIds, ownerId } = parsed.data;

  try {
    let toName = "تخصیص‌نیافته";
    if (ownerId) {
      const targetUser = await db.user.findUnique({ where: { id: ownerId } });
      if (!targetUser || !targetUser.isActive) {
        return { ok: false, error: "کارشناس انتخاب‌شده معتبر نیست" };
      }
      toName = targetUser.name;
    }

    const updatedContacts = await db.$transaction(async (tx) => {
      const contacts = await tx.contact.findMany({
        where: { id: { in: contactIds }, isActive: true },
        include: { owner: { select: { name: true } } },
      });

      if (contacts.length === 0) {
        return [];
      }

      const ids = contacts.map((c) => c.id);
      await tx.contact.updateMany({
        where: { id: { in: ids } },
        data: { ownerId },
      });

      await tx.activity.createMany({
        data: contacts.map((c) => {
          const fromName = c.owner?.name || "تخصیص‌نیافته";
          return {
            type: "ASSIGNMENT",
            body: `مالکیت مخاطب از «${fromName}» به «${toName}» تغییر یافت`,
            meta: {
              fromOwnerId: c.ownerId,
              fromOwnerName: fromName,
              toOwnerId: ownerId,
              toOwnerName: toName,
            },
            contactId: c.id,
            userId: currentUser.id,
          };
        }),
      });

      return contacts;
    });

    if (updatedContacts.length === 0) {
      return { ok: false, error: "مخاطب فعالی برای تخصیص یافت نشد" };
    }

    await Promise.all(updatedContacts.map((c) => recalculateAndSaveContactScore(c.id)));

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");
    for (const c of updatedContacts) {
      safeRevalidatePath(`/contacts/${c.id}`);
    }

    return {
      ok: true,
      data: {
        count: updatedContacts.length,
        ownerId,
        ownerName: ownerId ? toName : null,
      },
    };
  } catch (err) {
    console.error("[assignManyAction error]", err);
    return { ok: false, error: "خطا در تخصیص گروهی کارشناس" };
  }
}

export async function changeLeadStatusAction(rawInput: unknown) {
  const parsed = changeLeadStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, status } = parsed.data;

  try {
    const existing = await db.contact.findUnique({ where: { id: contactId } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "دسترسی غیرمجاز" };
    }

    const prevStatus = existing.leadStatus;
    await db.contact.update({
      where: { id: contactId },
      data: { leadStatus: status },
    });

    await db.activity.create({
      data: {
        type: "STATUS_CHANGE",
        body: `وضعیت سرنخ از ${prevStatus} به ${status} تغییر کرد`,
        meta: { from: prevStatus, to: status },
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    try {
      await emitEvent("LEAD_STATUS_CHANGED", {
        contactId,
        fromStatus: prevStatus,
        toStatus: status,
        leadStatus: status,
      });
    } catch (autoErr) {
      console.error("[changeLeadStatusAction emitEvent error]", autoErr);
    }

    safeRevalidatePath("/leads");
    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true };
  } catch (err) {
    console.error("[changeLeadStatusAction error]", err);
    return { ok: false, error: "خطا در تغییر وضعیت سرنخ" };
  }
}

export async function changePriorityAction(rawInput: unknown) {
  const parsed = changePrioritySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, priority } = parsed.data;

  try {
    const existing = await db.contact.findUnique({ where: { id: contactId } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "دسترسی غیرمجاز" };
    }

    await db.contact.update({
      where: { id: contactId },
      data: { priority },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        body: `اولویت به ${priority} تغییر یافت`,
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    safeRevalidatePath("/contacts");
    safeRevalidatePath("/leads");
    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true };
  } catch (err) {
    console.error("[changePriorityAction error]", err);
    return { ok: false, error: "خطا در تغییر اولویت" };
  }
}

export async function addNoteAction(rawInput: unknown) {
  const parsed = addNoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "متن یادداشت نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, body } = parsed.data;

  try {
    const existing = await db.contact.findUnique({ where: { id: contactId } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "دسترسی غیرمجاز" };
    }

    await db.activity.create({
      data: {
        type: "NOTE",
        body,
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true };
  } catch (err) {
    console.error("[addNoteAction error]", err);
    return { ok: false, error: "خطا در ذخیره یادداشت" };
  }
}

export async function logActivityAction(rawInput: unknown) {
  const parsed = logActivitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "اطلاعات فعالیت نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, type, body, title } = parsed.data;

  try {
    const existing = await db.contact.findUnique({ where: { id: contactId } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "دسترسی غیرمجاز" };
    }

    const text = title ? `${title}: ${body}` : body;

    await db.activity.create({
      data: {
        type,
        body: text,
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true };
  } catch (err) {
    console.error("[logActivityAction error]", err);
    return { ok: false, error: "خطا در ثبت فعالیت" };
  }
}

export async function convertLeadToCustomerAction(contactId: string) {
  const currentUser = await requireUser();

  try {
    const existing = await db.contact.findUnique({ where: { id: contactId } });
    if (!existing || !existing.isActive) {
      return { ok: false, error: "سرنخ یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.ownerId !== currentUser.id) {
      return { ok: false, error: "دسترسی غیرمجاز" };
    }

    const convertedAt = new Date();

    await db.contact.update({
      where: { id: contactId },
      data: {
        kind: "CUSTOMER",
        convertedAt,
      },
    });

    await db.activity.create({
      data: {
        type: "CONVERSION",
        body: `سرنخ «${existing.fullName}» به مشتری دائم تبدیل شد`,
        contactId,
        userId: currentUser.id,
      },
    });

    await recalculateAndSaveContactScore(contactId);

    try {
      await emitEvent("CUSTOMER_CREATED", {
        contactId,
        kind: "CUSTOMER",
        source: existing.source,
        priority: existing.priority,
      });
    } catch (autoErr) {
      console.error("[convertLeadToCustomerAction emitEvent error]", autoErr);
    }

    safeRevalidatePath("/leads");
    safeRevalidatePath("/contacts");
    safeRevalidatePath(`/contacts/${contactId}`);

    return { ok: true };
  } catch (err) {
    console.error("[convertLeadToCustomerAction error]", err);
    return { ok: false, error: "خطا در تبدیل سرنخ به مشتری" };
  }
}
