import { z } from "zod";
import { Priority } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(2, "عنوان وظیفه باید حداقل ۲ کاراکتر باشد").max(200),
  description: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  assigneeId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "شناسه وظیفه الزامی است"),
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});
