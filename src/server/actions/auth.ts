"use server";

import { headers } from "next/headers";
import { requestOtp, verifyOtp, logout } from "../auth";

export async function requestOtpAction(phone: string) {
  let clientIp: string | undefined;
  try {
    const forwarded = headers().get("x-forwarded-for");
    if (forwarded) {
      clientIp = forwarded.split(",")[0]?.trim();
    }
  } catch {
    // Ignore error if headers() cannot be read
  }
  return requestOtp(phone, clientIp);
}

export async function verifyOtpAction(phone: string, code: string) {
  return verifyOtp(phone, code);
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
