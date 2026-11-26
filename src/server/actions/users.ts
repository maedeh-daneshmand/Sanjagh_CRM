"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { normalizePhone, requireRole, requireUser } from "../auth";
import {
  createUserSchema,
  changeUserRoleSchema,
  toggleUserActiveSchema,
  updateProfileSchema,
} from "@/lib/schemas/users";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function createUserAction(rawInput: unknown) {
  await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل باید ۱۱ رقم و با 09 شروع شود" };
  }

  try {
    const existing = await db.user.findUnique({ where: { phone } });
    if (existing) {
      return { ok: false, error: "کاربری با این شماره موبایل قبلاً ثبت شده است" };
    }

    const user = await db.user.create({
      data: {
        name: parsed.data.name.trim(),
        phone,
        email: parsed.data.email ? parsed.data.email.trim() : null,
        role: parsed.data.role,
        isActive: true,
      },
    });

    safeRevalidatePath("/users");
    safeRevalidatePath("/team");

    return {
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        _count: { ownedContacts: 0, ownedDeals: 0, assignedTasks: 0 },
      },
    };
  } catch (err) {
    console.error("[createUserAction error]", err);
    return { ok: false, error: "خطا در ایجاد کاربر جدید" };
  }
}

export async function changeUserRoleAction(rawInput: unknown) {
  const admin = await requireRole("ADMIN");

  const parsed = changeUserRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر" };
  }

  const { userId, role } = parsed.data;
  if (userId === admin.id && role !== "ADMIN") {
    return { ok: false, error: "نمی‌توانید نقش مدیر ارشد خودتان را تغییر دهید" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { role },
    });

    safeRevalidatePath("/users");
    safeRevalidatePath("/team");
    return { ok: true };
  } catch (err) {
    console.error("[changeUserRoleAction error]", err);
    return { ok: false, error: "خطا در تغییر نقش کاربر" };
  }
}

export async function toggleUserActiveAction(rawInput: unknown) {
  const admin = await requireRole("ADMIN");

  const parsed = toggleUserActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر" };
  }

  const { userId, isActive } = parsed.data;
  if (userId === admin.id && !isActive) {
    return { ok: false, error: "نمی‌توانید حساب کاربری خودتان را غیرفعال کنید" };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive },
      });

      // When deactivating a user, immediately delete all their active sessions
      if (!isActive) {
        await tx.session.deleteMany({ where: { userId } });
      }
    });

    safeRevalidatePath("/users");
    safeRevalidatePath("/team");
    return { ok: true };
  } catch (err) {
    console.error("[toggleUserActiveAction error]", err);
    return { ok: false, error: "خطا در تغییر وضعیت کاربر" };
  }
}

export async function updateProfileAction(rawInput: unknown) {
  const currentUser = await requireUser();
  const parsed = updateProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های پروفایل نامعتبر است" };
  }

  try {
    await db.user.update({
      where: { id: currentUser.id },
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email ? parsed.data.email.trim() : null,
      },
    });
    safeRevalidatePath("/settings");
    safeRevalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateProfileAction error]", err);
    return { ok: false, error: "خطا در ذخیره پروفایل" };
  }
}
