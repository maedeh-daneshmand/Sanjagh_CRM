"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { requireRole } from "../auth";
import { saveAutomationSchema } from "@/lib/schemas/automations";
import { dryRunAutomation } from "../automations/engine";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function toggleAutomationActiveAction(
  automationId: string,
  isActive: boolean
) {
  await requireRole("ADMIN", "MANAGER");

  try {
    await db.automation.update({
      where: { id: automationId },
      data: { isActive },
    });

    safeRevalidatePath("/automations");
    return { ok: true };
  } catch (err) {
    console.error("[toggleAutomationActiveAction error]", err);
    return { ok: false, error: "خطا در تغییر وضعیت اتوماسیون" };
  }
}

export async function saveAutomationAction(rawInput: unknown) {
  const currentUser = await requireRole("ADMIN", "MANAGER");
  const parsed = saveAutomationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های اتوماسیون نامعتبر است" };
  }

  const data = parsed.data;

  try {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      trigger: data.trigger,
      triggerConfig: (data.triggerConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      conditions: (data.conditions ?? []) as unknown as Prisma.InputJsonValue,
      steps: data.steps as unknown as Prisma.InputJsonValue,
      stopOnReply: data.stopOnReply,
      isActive: data.isActive,
    };

    const saved = data.id
      ? await db.automation.update({
          where: { id: data.id },
          data: payload,
        })
      : await db.automation.create({
          data: {
            ...payload,
            isPreset: false,
            createdById: currentUser.id,
          },
        });

    safeRevalidatePath("/automations");
    safeRevalidatePath("/automations/builder");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    console.error("[saveAutomationAction error]", err);
    return { ok: false, error: "خطا در ذخیره اتوماسیون" };
  }
}

export async function testRunAutomationAction(
  automationId: string,
  contactId: string
) {
  await requireRole("ADMIN", "MANAGER");

  try {
    const logs = await dryRunAutomation(automationId, contactId);
    return { ok: true, data: logs };
  } catch (err) {
    console.error("[testRunAutomationAction error]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "خطا در اجرای آزمایشی اتوماسیون",
    };
  }
}
