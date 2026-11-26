import { z } from "zod";
import { DealStage } from "@prisma/client";

export const createDealSchema = z.object({
  title: z.string().min(2, "عنوان معامله باید حداقل ۲ کاراکتر باشد").max(150),
  contactId: z.string().min(1, "انتخاب مخاطب الزامی است"),
  amount: z.coerce
    .number({ invalid_type_error: "مبلغ باید عدد معتبر باشد" })
    .min(0, "مبلغ نمی‌تواند منفی باشد"),
  stage: z.nativeEnum(DealStage).default(DealStage.NEW),
  ownerId: z.string().optional().nullable(),
  expectedCloseAt: z.string().optional().nullable(),
});

export const moveDealSchema = z.object({
  dealId: z.string().min(1, "شناسه معامله الزامی است"),
  toStage: z.nativeEnum(DealStage),
  newPosition: z.number().finite("موقعیت نامعتبر است"),
});

export const updateDealSchema = z.object({
  id: z.string().min(1, "شناسه معامله الزامی است"),
  title: z.string().min(2).max(150).optional(),
  amount: z.coerce.number().min(0).optional(),
  stage: z.nativeEnum(DealStage).optional(),
  ownerId: z.string().optional().nullable(),
  expectedCloseAt: z.string().optional().nullable(),
});
