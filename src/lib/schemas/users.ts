import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100),
  phone: z.string().min(10, "شماره موبایل معتبر وارد کنید"),
  email: z.string().email("فرمت ایمیل نامعتبر است").optional().nullable().or(z.literal("")),
  role: z.nativeEnum(Role).default(Role.SALES),
});

export const changeUserRoleSchema = z.object({
  userId: z.string().min(1, "شناسه کاربر الزامی است"),
  role: z.nativeEnum(Role),
});

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1, "شناسه کاربر الزامی است"),
  isActive: z.boolean(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100),
  email: z.string().email("فرمت ایمیل نامعتبر است").optional().nullable().or(z.literal("")),
});
