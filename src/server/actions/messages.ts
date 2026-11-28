"use server";

import { revalidatePath } from "next/cache";
import { Channel, MessageStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { requireRole, requireUser } from "../auth";
import { sendSingleMessageSchema } from "@/lib/schemas/campaigns";
import { enqueueMessageJob } from "../queue/queues";
import { renderTemplate } from "../queue/worker";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function sendSingleMessageAction(rawInput: unknown) {
  const parsed = sendSingleMessageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های پیام نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, channel, subject, body } = parsed.data;

  try {
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        optOutSms: true,
        optOutEmail: true,
        ownerId: true,
        isActive: true,
      },
    });

    if (!contact || !contact.isActive) {
      return { ok: false, error: "مخاطب یافت نشد" };
    }

    if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
      return { ok: false, error: "شما مجاز به ارسال پیام به این مخاطب نیستید" };
    }

    if (channel === Channel.SMS) {
      if (contact.optOutSms) {
        return { ok: false, error: "این مخاطب دریافت پیامک را لغو کرده است (Opt-out)" };
      }
      if (!contact.phone?.trim()) {
        return { ok: false, error: "شماره موبایل برای این مخاطب ثبت نشده است" };
      }
    } else {
      if (contact.optOutEmail) {
        return { ok: false, error: "این مخاطب دریافت ایمیل را لغو کرده است (Opt-out)" };
      }
      if (!contact.email?.trim()) {
        return { ok: false, error: "ایمیل برای این مخاطب ثبت نشده است" };
      }
    }

    const toAddress = channel === Channel.SMS ? contact.phone!.trim() : contact.email!.trim();
    const renderedBody = renderTemplate(body, contact.fullName);

    const msg = await db.message.create({
      data: {
        channel,
        toAddress,
        subject: channel === Channel.EMAIL ? subject || "پیام از سنجاق CRM" : null,
        body: renderedBody,
        status: MessageStatus.QUEUED,
        contactId: contact.id,
        sentById: currentUser.id,
      },
    });

    await enqueueMessageJob({ messageId: msg.id });

    safeRevalidatePath(`/contacts/${contactId}`);
    safeRevalidatePath("/admin/queues");

    return {
      ok: true,
      data: {
        id: msg.id,
        channel: msg.channel,
        toAddress: msg.toAddress,
        body: msg.body,
        status: msg.status,
        createdAt: msg.createdAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[sendSingleMessageAction error]", err);
    return { ok: false, error: "خطا در صف‌بندی ارسال پیام" };
  }
}

const messageIdSchema = z.string().min(1, "شناسه پیام نامعتبر است");

export async function retryFailedMessageAction(messageId: string) {
  await requireRole("ADMIN", "MANAGER");
  const parsedId = messageIdSchema.safeParse(messageId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه پیام نامعتبر است" };
  }

  try {
    const msg = await db.message.findUnique({ where: { id: parsedId.data } });
    if (!msg) {
      return { ok: false, error: "پیام یافت نشد" };
    }

    await db.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.QUEUED, error: null },
    });

    await enqueueMessageJob({ messageId });

    safeRevalidatePath("/campaigns");
    safeRevalidatePath("/admin/queues");

    return { ok: true };
  } catch (err) {
    console.error("[retryFailedMessageAction error]", err);
    return { ok: false, error: "خطا در ارسال مجدد پیام" };
  }
}
