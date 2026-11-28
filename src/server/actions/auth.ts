"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requestOtp, verifyOtp, logout } from "../auth";

const phoneInputSchema = z.string().min(1, "شماره موبایل الزامی است");
const verifyOtpInputSchema = z.object({
  phone: z.string().min(1, "شماره موبایل الزامی است"),
  code: z.string().min(1, "کد ورود الزامی است"),
});

export async function requestOtpAction(phone: string) {
  const parsed = phoneInputSchema.safeParse(phone);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "شماره موبایل نامعتبر است" };
  }
  let clientIp: string | undefined;
  try {
    const forwarded = headers().get("x-forwarded-for");
    if (forwarded) {
      clientIp = forwarded.split(",")[0]?.trim();
    }
  } catch {
    // Ignore error if headers() cannot be read
  }
  return requestOtp(parsed.data, clientIp);
}

export async function verifyOtpAction(phone: string, code: string) {
  const parsed = verifyOtpInputSchema.safeParse({ phone, code });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "ورودی نامعتبر است" };
  }
  return verifyOtp(parsed.data.phone, parsed.data.code);
}

export async function logoutAction() {
  return logout();
}

export async function getLoginConfigAction() {
  const isDemo =
    process.env.DEMO_MODE === "true" &&
    (process.env.MESSAGING_PROVIDER === "fake" || !process.env.MESSAGING_PROVIDER);

  return {
    demoMode: isDemo,
    demoPhones: {
      admin: process.env.SEED_ADMIN_PHONE || "09123456789",
      manager: process.env.SEED_MANAGER_PHONE || "09120000002",
      sales: process.env.SEED_SALES_PHONE || "09120000003",
    },
  };
}
