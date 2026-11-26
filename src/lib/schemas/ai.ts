import { z } from "zod";
import { Channel, DealStage, LeadStatus, Priority } from "@prisma/client";

export const aiSummaryResponseSchema = z.object({
  summary: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  nextStep: z.string().min(1),
});

export const aiSuggestionTaskSchema = z.object({
  type: z.literal("CREATE_TASK"),
  title: z.string().min(1),
  dueAt: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
});

export const aiSuggestionDealStageSchema = z.object({
  type: z.literal("CHANGE_DEAL_STAGE"),
  dealId: z.string().min(1),
  toStage: z.nativeEnum(DealStage),
  reason: z.string().optional(),
});

export const aiSuggestionLeadStatusSchema = z.object({
  type: z.literal("CHANGE_LEAD_STATUS"),
  status: z.nativeEnum(LeadStatus),
  reason: z.string().optional(),
});

export const aiSuggestionPayloadSchema = z.discriminatedUnion("type", [
  aiSuggestionTaskSchema,
  aiSuggestionDealStageSchema,
  aiSuggestionLeadStatusSchema,
]);

export type AiSuggestionPayload = z.infer<typeof aiSuggestionPayloadSchema>;

export const aiAnalyzeNoteResponseSchema = z.object({
  suggestions: z.array(aiSuggestionPayloadSchema).max(5),
});

export const aiDraftMessageResponseSchema = z.object({
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
});

export const draftMessageInputSchema = z.object({
  contactId: z.string().min(1, "انتخاب مخاطب الزامی است"),
  channel: z.nativeEnum(Channel),
  tone: z.enum(["formal", "friendly", "short", "persuasive"]),
  contextNote: z.string().optional().nullable(),
});
