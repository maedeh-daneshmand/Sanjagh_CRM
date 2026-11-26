import { z } from "zod";
import { Channel, ContactKind, LeadStatus, Source } from "@prisma/client";

export const campaignFilterSchema = z.object({
  kind: z.union([z.nativeEnum(ContactKind), z.literal("ALL")]).optional(),
  source: z.union([z.nativeEnum(Source), z.literal("ALL")]).optional(),
  leadStatus: z.union([z.nativeEnum(LeadStatus), z.literal("ALL")]).optional(),
  ownerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(2, "نام کمپین باید حداقل ۲ کاراکتر باشد").max(150),
  channel: z.nativeEnum(Channel),
  subject: z.string().optional().nullable(),
  body: z.string().min(3, "متن پیام کمپین نمی‌تواند خالی باشد"),
  filter: campaignFilterSchema.default({}),
});

export const sendSingleMessageSchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  channel: z.nativeEnum(Channel),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, "متن پیام نمی‌تواند خالی باشد"),
});
