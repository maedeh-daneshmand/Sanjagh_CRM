"use server";

import { revalidatePath } from "next/cache";
import { Channel, Prisma, SuggestionStatus, SuggestionType } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { requireRole, requireUser } from "../auth";
import { callAiJson, getAiModelName, isAiConfigured } from "../ai/client";
import {
  aiAnalyzeNoteResponseSchema,
  aiDraftMessageResponseSchema,
  aiSuggestionPayloadSchema,
  aiSummaryResponseSchema,
  draftMessageInputSchema,
} from "@/lib/schemas/ai";
import { recalculateAndSaveContactScore } from "../contacts";
import { createTaskAction } from "./tasks";
import { moveDealAction } from "./deals";
import { changeLeadStatusAction } from "./contacts";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in unit tests
  }
}

export async function getAiStatusAction() {
  await requireUser();
  return {
    configured: isAiConfigured(),
    model: getAiModelName(),
  };
}

const idSchema = z.string().min(1, "شناسه نامعتبر است");
const analyzeNoteInputSchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب نامعتبر است"),
  text: z.string().trim().min(1, "متن یادداشت نمی‌تواند خالی باشد"),
});
const draftTemplateInputSchema = z.object({
  channel: z.nativeEnum(Channel),
  topic: z.string().max(500),
});

export async function summarizeContactAction(contactId: string) {
  const currentUser = await requireUser();
  const parsedId = idSchema.safeParse(contactId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه مخاطب نامعتبر است" };
  }

  const contact = await db.contact.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      fullName: true,
      company: true,
      kind: true,
      leadStatus: true,
      priority: true,
      score: true,
      ownerId: true,
      isActive: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { type: true, body: true, createdAt: true },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { title: true, amount: true, stage: true },
      },
    },
  });

  if (!contact || !contact.isActive) {
    return { ok: false, error: "مخاطب یافت نشد" };
  }

  if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
    return { ok: false, error: "شما مجاز به دسترسی به این مخاطب نیستید" };
  }

  const contextData = {
    fullName: contact.fullName,
    company: contact.company,
    kind: contact.kind,
    leadStatus: contact.leadStatus,
    priority: contact.priority,
    score: contact.score,
    deals: contact.deals.map((d) => ({
      title: d.title,
      amount: Number(d.amount),
      stage: d.stage,
    })),
    recentActivities: contact.activities.map((a) => ({
      type: a.type,
      body: a.body,
      date: a.createdAt.toISOString(),
    })),
  };

  const aiResult = await callAiJson({
    systemPrompt:
      "شما دستیار هوشمند CRM سنجاق هستید. فقط یک آبجکت JSON با کلیدهای summary (متن خلاصه وضعیت به فارسی), risk (یکی از مقادیر low یا medium یا high), nextStep (پیشنهاد گام بعدی عملی به فارسی) برگردانید.",
    userPrompt: `اطلاعات و تاریخچه فعالیت‌های این مخاطب:\n${JSON.stringify(contextData)}`,
    schema: aiSummaryResponseSchema,
  });

  if (!aiResult.ok) {
    return {
      ok: false,
      error: aiResult.error,
      notConfigured: aiResult.notConfigured,
    };
  }

  await db.aiSummary.upsert({
    where: { contactId: contact.id },
    create: {
      contactId: contact.id,
      summary: aiResult.data.summary,
      risk: aiResult.data.risk,
      nextStep: aiResult.data.nextStep,
    },
    update: {
      summary: aiResult.data.summary,
      risk: aiResult.data.risk,
      nextStep: aiResult.data.nextStep,
    },
  });

  safeRevalidatePath(`/contacts/${contact.id}`);

  return { ok: true, data: aiResult.data };
}

export async function analyzeNoteAction(contactId: string, text: string) {
  const currentUser = await requireUser();
  const parsed = analyzeNoteInputSchema.safeParse({ contactId, text });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر است" };
  }
  const cleanText = parsed.data.text;

  const contact = await db.contact.findUnique({
    where: { id: parsed.data.contactId },
    select: {
      id: true,
      fullName: true,
      kind: true,
      leadStatus: true,
      ownerId: true,
      isActive: true,
      deals: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, stage: true },
      },
    },
  });

  if (!contact || !contact.isActive) {
    return { ok: false, error: "مخاطب یافت نشد" };
  }

  if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
    return { ok: false, error: "شما مجاز به ثبت یادداشت برای این مخاطب نیستید" };
  }

  // Always save the note as a NOTE activity
  const noteActivity = await db.activity.create({
    data: {
      type: "NOTE",
      body: cleanText,
      contactId: contact.id,
      userId: currentUser.id,
    },
  });
  await recalculateAndSaveContactScore(contact.id);

  const aiResult = await callAiJson({
    systemPrompt: `شما دستیار هوشمند CRM سنجاق هستید. متن یادداشت را تحلیل کرده و حداکثر ۳ پیشنهاد اقدام به صورت JSON با کلید suggestions برگردانید.
هر پیشنهاد باید یکی از این سه ساختار را داشته باشد:
1. {"type":"CREATE_TASK","title":"عنوان فارسی","dueAt":"ISO8601 یا null","priority":"HIGH|MEDIUM|LOW"}
2. {"type":"CHANGE_DEAL_STAGE","dealId":"شناسه معامله از لیست معاملات مخاطب","toStage":"NEW|CONTACTED|PROPOSAL|NEGOTIATION|WON|LOST","reason":"دلیل فارسی"}
3. {"type":"CHANGE_LEAD_STATUS","status":"NEW|CONTACTED|QUALIFIED|LOST","reason":"دلیل فارسی"}
امروز: ${new Date().toISOString()}`,
    userPrompt: `مخاطب: ${contact.fullName} (وضعیت فعلی: ${contact.leadStatus})\nمعاملات این مخاطب: ${JSON.stringify(contact.deals)}\nمتن یادداشت:\n${cleanText}`,
    schema: aiAnalyzeNoteResponseSchema,
  });

  if (!aiResult.ok) {
    safeRevalidatePath(`/contacts/${contact.id}`);
    return {
      ok: false,
      error: aiResult.error,
      notConfigured: aiResult.notConfigured,
      noteSaved: true,
      noteActivity: {
        id: noteActivity.id,
        type: noteActivity.type,
        body: noteActivity.body,
        meta: noteActivity.meta,
        createdAt: noteActivity.createdAt.toISOString(),
        userName: currentUser.name,
      },
    };
  }

  const validDealIds = new Set(contact.deals.map((d) => d.id));
  const createdSuggestions = [];

  for (const sug of aiResult.data.suggestions) {
    if (sug.type === "CHANGE_DEAL_STAGE" && !validDealIds.has(sug.dealId)) {
      continue;
    }

    const row = await db.aiSuggestion.create({
      data: {
        type: sug.type as SuggestionType,
        payload: sug as unknown as Prisma.InputJsonValue,
        sourceText: cleanText,
        status: SuggestionStatus.PENDING,
        contactId: contact.id,
        dealId: sug.type === "CHANGE_DEAL_STAGE" ? sug.dealId : null,
        createdById: currentUser.id,
      },
    });

    createdSuggestions.push({
      id: row.id,
      type: row.type,
      payload: sug,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    });
  }

  safeRevalidatePath(`/contacts/${contact.id}`);

  return {
    ok: true,
    data: {
      suggestions: createdSuggestions,
      noteActivity: {
        id: noteActivity.id,
        type: noteActivity.type,
        body: noteActivity.body,
        meta: noteActivity.meta,
        createdAt: noteActivity.createdAt.toISOString(),
        userName: currentUser.name,
      },
    },
  };
}

export async function approveSuggestionAction(suggestionId: string) {
  const currentUser = await requireUser();
  const parsedId = idSchema.safeParse(suggestionId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه پیشنهاد نامعتبر است" };
  }

  const suggestion = await db.aiSuggestion.findUnique({
    where: { id: parsedId.data },
    include: {
      contact: { select: { id: true, ownerId: true, isActive: true } },
    },
  });

  if (!suggestion || !suggestion.contact.isActive) {
    return { ok: false, error: "پیشنهاد یافت نشد" };
  }

  if (
    currentUser.role === "SALES" &&
    suggestion.contact.ownerId !== currentUser.id
  ) {
    return { ok: false, error: "شما مجاز به تایید پیشنهاد برای این مخاطب نیستید" };
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    return { ok: false, error: "این پیشنهاد قبلاً بررسی شده است" };
  }

  const parsedPayload = aiSuggestionPayloadSchema.safeParse(suggestion.payload);
  if (!parsedPayload.success) {
    return { ok: false, error: "ساختار پیشنهاد معتبر نیست" };
  }

  const payload = parsedPayload.data;

  // Apply through the SAME server actions used elsewhere
  if (payload.type === "CREATE_TASK") {
    const taskRes = await createTaskAction({
      title: payload.title,
      dueAt: payload.dueAt ?? null,
      priority: payload.priority,
      contactId: suggestion.contactId,
    });
    if (!taskRes.ok) {
      return { ok: false, error: taskRes.error || "خطا در ایجاد وظیفه" };
    }
  } else if (payload.type === "CHANGE_DEAL_STAGE") {
    const deal = await db.deal.findUnique({
      where: { id: payload.dealId },
      select: { id: true, contactId: true, position: true },
    });
    if (!deal || deal.contactId !== suggestion.contactId) {
      return { ok: false, error: "معامله مرتبط با این مخاطب یافت نشد" };
    }
    const moveRes = await moveDealAction({
      dealId: deal.id,
      toStage: payload.toStage,
      newPosition: deal.position,
    });
    if (!moveRes.ok) {
      return { ok: false, error: moveRes.error || "خطا در تغییر مرحله معامله" };
    }
  } else if (payload.type === "CHANGE_LEAD_STATUS") {
    const statusRes = await changeLeadStatusAction({
      contactId: suggestion.contactId,
      status: payload.status,
    });
    if (!statusRes.ok) {
      return { ok: false, error: statusRes.error || "خطا در تغییر وضعیت سرنخ" };
    }
  }

  await db.aiSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: SuggestionStatus.ACCEPTED,
      decidedAt: new Date(),
    },
  });

  safeRevalidatePath(`/contacts/${suggestion.contactId}`);
  return { ok: true };
}

export async function rejectSuggestionAction(suggestionId: string) {
  const currentUser = await requireUser();
  const parsedId = idSchema.safeParse(suggestionId);
  if (!parsedId.success) {
    return { ok: false, error: "شناسه پیشنهاد نامعتبر است" };
  }

  const suggestion = await db.aiSuggestion.findUnique({
    where: { id: parsedId.data },
    include: {
      contact: { select: { id: true, ownerId: true } },
    },
  });

  if (!suggestion) {
    return { ok: false, error: "پیشنهاد یافت نشد" };
  }

  if (
    currentUser.role === "SALES" &&
    suggestion.contact.ownerId !== currentUser.id
  ) {
    return { ok: false, error: "شما مجاز به رد پیشنهاد برای این مخاطب نیستید" };
  }

  await db.aiSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: SuggestionStatus.REJECTED,
      decidedAt: new Date(),
    },
  });

  safeRevalidatePath(`/contacts/${suggestion.contactId}`);
  return { ok: true };
}

export async function draftMessageAction(rawInput: unknown) {
  const parsed = draftMessageInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "داده‌های ورودی نامعتبر است" };
  }

  const currentUser = await requireUser();
  const { contactId, channel, tone, contextNote } = parsed.data;

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      fullName: true,
      company: true,
      kind: true,
      leadStatus: true,
      ownerId: true,
      isActive: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { type: true, body: true },
      },
    },
  });

  if (!contact || !contact.isActive) {
    return { ok: false, error: "مخاطب یافت نشد" };
  }

  if (currentUser.role === "SALES" && contact.ownerId !== currentUser.id) {
    return { ok: false, error: "شما مجاز به دسترسی به این مخاطب نیستید" };
  }

  const toneLabel =
    tone === "formal"
      ? "رسمی و اداری"
      : tone === "friendly"
      ? "دوستانه و صمیمی"
      : tone === "short"
      ? "کوتاه و مستقیم"
      : "ترغیبی و متقاعدکننده";

  const aiResult = await callAiJson({
    systemPrompt:
      "شما نویسنده حرفه‌ای پیام‌های فروش فارسی در CRM سنجاق هستید. خروجی را فقط به صورت JSON با کلیدهای subject (فقط برای ایمیل، در غیر این صورت null) و body (متن کامل پیام فارسی) برگردانید.",
    userPrompt: `کانال: ${channel}\nلحن: ${toneLabel}\nنام مخاطب: ${contact.fullName}\nشرکت: ${contact.company || "-"}\nتوضیحات تکمیلی: ${contextNote || "-"}\nفعالیت‌های اخیر: ${JSON.stringify(contact.activities)}`,
    schema: aiDraftMessageResponseSchema,
  });

  if (!aiResult.ok) {
    return {
      ok: false,
      error: aiResult.error,
      notConfigured: aiResult.notConfigured,
    };
  }

  return { ok: true, data: aiResult.data };
}

export async function draftTemplateWithAiAction(params: {
  channel: Channel;
  topic: string;
}) {
  await requireRole("ADMIN", "MANAGER");
  const parsed = draftTemplateInputSchema.safeParse(params);
  if (!parsed.success) {
    return { ok: false, error: "پارامترهای تولید قالب نامعتبر است" };
  }

  const aiResult = await callAiJson({
    systemPrompt:
      "شما نویسنده قالب پیام تبلیغاتی و پیگیری فروش فارسی در CRM سنجاق هستید. در متن از متغیر {{fullName}} برای نام مخاطب استفاده کنید. خروجی فقط JSON با کلیدهای subject (برای ایمیل) و body باشد.",
    userPrompt: `کانال: ${parsed.data.channel}\nموضوع یا هدف پیام: ${parsed.data.topic || "پیگیری و ارائه پیشنهاد ویژه"}`,
    schema: aiDraftMessageResponseSchema,
  });

  if (!aiResult.ok) {
    return {
      ok: false,
      error: aiResult.error,
      notConfigured: aiResult.notConfigured,
    };
  }

  return { ok: true, data: aiResult.data };
}
