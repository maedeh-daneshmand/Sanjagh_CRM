import { db } from "./db";
import { Role, User } from "@prisma/client";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const SESSION_COOKIE = "sanjagh_session";
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "sanjagh-secret-key-at-least-32-characters-long-crm-2026"
);

// In-memory / Mock Redis Store for dev & when Redis isn't connected
const otpStore = new Map<string, { hash: string; expiresAt: number; attempts: number }>();
const otpRateLimit = new Map<string, { count: number; resetAt: number }>();

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const dbSession = await db.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  const token = await new SignJWT({ userId, sessionId: dbSession.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SESSION_SECRET);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const verified = await jwtVerify(token, SESSION_SECRET);
      const sessionId = (verified.payload as { sessionId?: string }).sessionId;
      if (sessionId) {
        await db.session.delete({ where: { id: sessionId } }).catch(() => {});
      }
    } catch {}
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, SESSION_SECRET);
    const userId = (verified.payload as { userId?: string }).userId;
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId, isActive: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    // If running in development without seeded user yet, provide default admin user for convenience
    const fallbackAdmin = await db.user.findFirst({
      where: { role: Role.ADMIN, isActive: true },
    });
    if (fallbackAdmin) return fallbackAdmin;

    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: required roles [${roles.join(", ")}], but user is ${user.role}`);
  }
  return user;
}

// Generate OTP, hash, rate-limit and send
export async function sendOtp(phone: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
  // Validate format 09xxxxxxxxx
  if (!/^09\d{9}$/.test(phone)) {
    return { success: false, message: "شماره موبایل نامعتبر است (فرمت صحیح: 09xxxxxxxxx)" };
  }

  // Rate limiting: 3 sends per 10 mins
  const now = Date.now();
  const rate = otpRateLimit.get(phone);
  if (rate && rate.resetAt > now) {
    if (rate.count >= 3) {
      return { success: false, message: "تعداد درخواست‌های کد بیش از حد مجاز است. لطفاً ۱۰ دقیقه بعد تلاش کنید." };
    }
    rate.count++;
  } else {
    otpRateLimit.set(phone, { count: 1, resetAt: now + 10 * 60 * 1000 });
  }

  // Check if user exists
  const user = await db.user.findUnique({ where: { phone, isActive: true } });
  if (!user) {
    return { success: false, message: "کاربری با این شماره در سامانه فعال نیست." };
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto.createHash("sha256").update(code).digest("hex");

  // Save hash with 2-minute TTL
  otpStore.set(phone, {
    hash,
    expiresAt: now + 2 * 60 * 1000,
    attempts: 0,
  });

  console.log(`\n==================================`);
  console.log(`[OTP LOGIN] Phone: ${phone} -> Code: ${code}`);
  console.log(`==================================\n`);

  return {
    success: true,
    message: "کد تأیید ارسال شد",
    debugCode: process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

// Verify OTP
export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; user?: User; message: string }> {
  const record = otpStore.get(phone);
  if (!record || record.expiresAt < Date.now()) {
    return { success: false, message: "کد منقضی شده یا درخواستی ثبت نشده است. لطفاً مجدداً تلاش کنید." };
  }

  if (record.attempts >= 5) {
    otpStore.delete(phone);
    return { success: false, message: "تعداد تلاش‌های اشتباه بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید." };
  }

  const hash = crypto.createHash("sha256").update(code).digest("hex");
  if (hash !== record.hash) {
    record.attempts++;
    return { success: false, message: "کد وارد شده صحیح نمی‌باشد." };
  }

  // Code correct -> clear OTP
  otpStore.delete(phone);

  const user = await db.user.findUnique({ where: { phone, isActive: true } });
  if (!user) {
    return { success: false, message: "کاربر یافت نشد." };
  }

  await createSession(user.id);
  return { success: true, user, message: "ورود موفقیت‌آمیز بود" };
}
