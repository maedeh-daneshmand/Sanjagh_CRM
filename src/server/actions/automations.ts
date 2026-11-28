"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
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

const toggleAutomationSchema = z.object({
  automationId: z.string().min(1, "شناسه اتوماسیون نامعتبر است"),
  isActive: z.boolean(),
});

const testRunAutomationSchema = z.object({
  automationId: z.string().min(1, "شناسه اتوماسیون نامعتبر است"),
  contactId: z.string().min(1, "شناسه مخاطب نامعتبر است"),
});

export async function toggleAutomationActiveAction(
  automationId: string,
  isActive: boolean
) {
  await requireRole("ADMIN", "MANAGER");
  const parsed = toggleAutomationSchema.safeParse({ automationId, isActive });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر است" };
  }

  try {
    await db.automation.update({
      where: { id: parsed.data.automationId },
      data: { isActive: parsed.data.isActive },
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
  const parsed = testRunAutomationSchema.safeParse({ automationId, contactId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر است" };
  }

  try {
    const logs = await dryRunAutomation(parsed.data.automationId, parsed.data.contactId);
    return { ok: true, data: logs };
  } catch (err) {
    console.error("[testRunAutomationAction error]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "خطا در اجرای آزمایشی اتوماسیون",
    };
  }
}
