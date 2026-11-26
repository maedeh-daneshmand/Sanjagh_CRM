import { z } from "zod";
import { AutomationTrigger, LeadStatus, Priority } from "@prisma/client";

export const automationConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "in"]),
  value: z.union([z.string(), z.array(z.string())]),
});

export const waitStepSchema = z.object({
  type: z.literal("WAIT"),
  delayMinutes: z.coerce.number().min(1, "مدت تأخیر باید حداقل ۱ دقیقه باشد"),
});

export const sendSmsStepSchema = z.object({
  type: z.literal("SEND_SMS"),
  body: z.string().min(1, "متن پیامک الزامی است"),
});

export const sendEmailStepSchema = z.object({
  type: z.literal("SEND_EMAIL"),
  subject: z.string().min(1, "عنوان ایمیل الزامی است"),
  body: z.string().min(1, "متن ایمیل الزامی است"),
});

export const createTaskStepSchema = z.object({
  type: z.literal("CREATE_TASK"),
  title: z.string().min(1, "عنوان وظیفه الزامی است"),
  dueInHours: z.coerce.number().min(0).default(24),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
});

export const assignOwnerStepSchema = z.object({
  type: z.literal("ASSIGN_OWNER"),
  ownerId: z.string().min(1, "انتخاب کارشناس الزامی است"),
});

export const changeLeadStatusStepSchema = z.object({
  type: z.literal("CHANGE_LEAD_STATUS"),
  status: z.nativeEnum(LeadStatus),
});

export const automationStepSchema = z.discriminatedUnion("type", [
  waitStepSchema,
  sendSmsStepSchema,
  sendEmailStepSchema,
  createTaskStepSchema,
  assignOwnerStepSchema,
  changeLeadStatusStepSchema,
]);

export type AutomationCondition = z.infer<typeof automationConditionSchema>;
export type AutomationStep = z.infer<typeof automationStepSchema>;

export const saveAutomationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "نام اتوماسیون باید حداقل ۲ کاراکتر باشد").max(150),
  description: z.string().optional().nullable(),
  trigger: z.nativeEnum(AutomationTrigger),
  triggerConfig: z.record(z.string(), z.unknown()).optional().nullable(),
  conditions: z.array(automationConditionSchema).optional().nullable(),
  steps: z.array(automationStepSchema).min(1, "حداقل یک مرحله اقدام الزامی است"),
  stopOnReply: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
