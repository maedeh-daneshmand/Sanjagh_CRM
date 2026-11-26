import { z } from "zod";
import { Source, Priority, LeadStatus, ContactKind } from "@prisma/client";

export const createContactSchema = z.object({
  fullName: z.string().min(2, "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد").max(100),
  kind: z.nativeEnum(ContactKind).default(ContactKind.LEAD),
  phone: z.string().optional().nullable(),
  email: z.string().email("فرمت ایمیل نامعتبر است").optional().nullable().or(z.literal("")),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.nativeEnum(Source).default(Source.OTHER),
  sourceNote: z.string().optional().nullable(),
  leadStatus: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export const updateContactSchema = z.object({
  id: z.string().min(1, "شناسه الزامی است"),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.nativeEnum(Source).optional(),
  sourceNote: z.string().optional().nullable(),
  leadStatus: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export const assignOwnerSchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  ownerId: z.string().nullable(),
});

export const assignManySchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, "حداقل یک مخاطب باید انتخاب شود"),
  ownerId: z.string().nullable(),
});

export const changeLeadStatusSchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  status: z.nativeEnum(LeadStatus),
});

export const changePrioritySchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  priority: z.nativeEnum(Priority),
});

export const addNoteSchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  body: z.string().min(1, "متن یادداشت نمی‌تواند خالی باشد"),
});

export const logActivitySchema = z.object({
  contactId: z.string().min(1, "شناسه مخاطب الزامی است"),
  type: z.enum(["CALL", "MEETING", "NOTE"]),
  title: z.string().optional().nullable(),
  body: z.string().min(1, "توضیحات فعالیت الزامی است"),
});
