"use server";

import { revalidatePath } from "next/cache";
import { TaskOrigin, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../auth";
import { createTaskSchema, updateTaskSchema } from "@/lib/schemas/tasks";
import { classifyTaskCategory, getTasksByRange } from "../tasks";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in non-request contexts like unit tests
  }
}

export async function createTaskAction(rawInput: unknown) {
  const parsed = createTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های وظیفه نامعتبر است" };
  }

  const currentUser = await requireUser();
  const data = parsed.data;

  // SALES can only create tasks for themselves
  if (
    currentUser.role === "SALES" &&
    data.assigneeId &&
    data.assigneeId !== currentUser.id
  ) {
    return {
      ok: false,
      error: "کارشناس فروش مجاز به تخصیص وظیفه به همکاران دیگر نیست",
    };
  }

  const assigneeId =
    currentUser.role === "SALES"
      ? currentUser.id
      : data.assigneeId || currentUser.id;
  const origin: TaskOrigin =
    currentUser.role === "SALES" ? TaskOrigin.SELF : TaskOrigin.MANAGER;

  try {
    const assignee = await db.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, name: true, isActive: true },
    });
    if (!assignee || !assignee.isActive) {
      return { ok: false, error: "کاربر انتخاب‌شده یافت نشد یا غیرفعال است" };
    }

    let contactName: string | null = null;
    let contactCompany: string | null = null;
    if (data.contactId) {
      const contact = await db.contact.findUnique({
        where: { id: data.contactId },
        select: { id: true, fullName: true, company: true, ownerId: true, isActive: true },
      });
      if (!contact || !contact.isActive) {
        return { ok: false, error: "مخاطب انتخاب‌شده یافت نشد" };
      }
      if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
        return { ok: false, error: "شما مجاز به ثبت وظیفه برای این مخاطب نیستید" };
      }
      contactName = contact.fullName;
      contactCompany = contact.company;
    }

    const dueAt = data.dueAt ? new Date(data.dueAt) : null;

    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        dueAt,
        priority: data.priority,
        origin,
        assigneeId: assignee.id,
        createdById: currentUser.id,
        contactId: data.contactId || null,
        dealId: data.dealId || null,
      },
    });

    // When a manager assigns a task linked to a contact, write a TASK activity on the contact
    if (origin === TaskOrigin.MANAGER && data.contactId) {
      await db.activity.create({
        data: {
          type: "TASK",
          body: `وظیفه «${task.title}» برای ${assignee.name} ثبت شد`,
          contactId: data.contactId,
          dealId: data.dealId || null,
          userId: currentUser.id,
        },
      });
    }

    safeRevalidatePath("/tasks");
    safeRevalidatePath("/calendar");
    if (data.contactId) safeRevalidatePath(`/contacts/${data.contactId}`);
    safeRevalidatePath("/");

    return {
      ok: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt ? task.dueAt.toISOString() : null,
        status: task.status,
        priority: task.priority,
        origin: task.origin,
        category: classifyTaskCategory(task.status, task.dueAt),
        assigneeId: task.assigneeId,
        assigneeName: assignee.name,
        contactId: task.contactId,
        contactName,
        contactCompany,
        dealId: task.dealId,
        dealTitle: null,
        completedAt: null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[createTaskAction error]", err);
    return { ok: false, error: "خطا در ثبت وظیفه جدید" };
  }
}

export async function updateTaskAction(rawInput: unknown) {
  const parsed = updateTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ویرایش نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { id, ...updates } = parsed.data;

  try {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, error: "وظیفه یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.assigneeId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به ویرایش این وظیفه نیستید" };
    }

    if (
      currentUser.role === "SALES" &&
      updates.assigneeId &&
      updates.assigneeId !== currentUser.id
    ) {
      return {
        ok: false,
        error: "کارشناس فروش مجاز به تغییر مسئول وظیفه به فرد دیگری نیست",
      };
    }

    await db.task.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.dueAt !== undefined && {
          dueAt: updates.dueAt ? new Date(updates.dueAt) : null,
        }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(currentUser.role !== "SALES" && updates.assigneeId
          ? { assigneeId: updates.assigneeId }
          : {}),
      },
    });

    safeRevalidatePath("/tasks");
    safeRevalidatePath("/calendar");
    safeRevalidatePath("/");

    return { ok: true };
  } catch (err) {
    console.error("[updateTaskAction error]", err);
    return { ok: false, error: "خطا در ویرایش وظیفه" };
  }
}

const taskIdSchema = z.string().min(1, "شناسه وظیفه نامعتبر است");
const tasksByRangeSchema = z.object({
  fromIso: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), "تاریخ شروع نامعتبر است"),
  toIso: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v))),
  assigneeFilterId: z.string().min(1).optional(),
});

export async function toggleTaskDoneAction(taskId: string) {
  const currentUser = await requireUser();
  const parsedId = taskIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه وظیفه نامعتبر است" };
  }

  try {
    const existing = await db.task.findUnique({ where: { id: parsedId.data } });
    if (!existing) {
      return { ok: false, error: "وظیفه یافت نشد" };
    }

    if (currentUser.role === "SALES" && existing.assigneeId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به تغییر وضعیت این وظیفه نیستید" };
    }

    const nextStatus =
      existing.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    const nextCompletedAt = nextStatus === TaskStatus.DONE ? new Date() : null;

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        completedAt: nextCompletedAt,
      },
    });

    safeRevalidatePath("/tasks");
    safeRevalidatePath("/calendar");
    safeRevalidatePath("/");

    return {
      ok: true,
      data: {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
        category: classifyTaskCategory(updated.status, updated.dueAt),
      },
    };
  } catch (err) {
    console.error("[toggleTaskDoneAction error]", err);
    return { ok: false, error: "خطا در تغییر وضعیت وظیفه" };
  }
}

export async function deleteTaskAction(taskId: string) {
  const currentUser = await requireUser();
  const parsedId = taskIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه وظیفه نامعتبر است" };
  }

  try {
    const existing = await db.task.findUnique({ where: { id: parsedId.data } });
    if (!existing) {
      return { ok: false, error: "وظیفه یافت نشد" };
    }

    if (
      currentUser.role === "SALES" &&
      existing.assigneeId !== currentUser.id &&
      existing.createdById !== currentUser.id
    ) {
      return { ok: false, error: "شما مجاز به حذف این وظیفه نیستید" };
    }

    await db.task.delete({ where: { id: taskId } });

    safeRevalidatePath("/tasks");
    safeRevalidatePath("/calendar");
    safeRevalidatePath("/");

    return { ok: true };
  } catch (err) {
    console.error("[deleteTaskAction error]", err);
    return { ok: false, error: "خطا در حذف وظیفه" };
  }
}

export async function getTasksByRangeAction(
  fromIso: string,
  toIso: string,
  assigneeFilterId?: string
) {
  await requireUser();
  const parsed = tasksByRangeSchema.safeParse({ fromIso, toIso, assigneeFilterId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "بازه زمانی نامعتبر است" };
  }

  try {
    const tasks = await getTasksByRange(
      parsed.data.fromIso,
      parsed.data.toIso,
      parsed.data.assigneeFilterId
    );
    return { ok: true, data: tasks };
  } catch (err) {
    console.error("[getTasksByRangeAction error]", err);
    return { ok: false, error: "خطا در دریافت رویدادهای تقویم" };
  }
}
