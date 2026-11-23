import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { Role, User } from "@prisma/client";
import { db } from "./db";
import { redis } from "./redis";
import { sendMessage } from "./messaging";

export const SESSION_COOKIE = "sanjagh_session";

export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is mandatory in production!");
    }
    return new TextEncoder().encode("sanjagh-default-secret-key-at-least-32-chars-long");
  }
  return new TextEncoder().encode(secret);
}

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  // Map Persian and Arabic numbers to Latin
  return rawPhone
    .trim()
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

interface OtpRecord {
  hash: string;
  attempts: number;
}

export async function requestOtp(
  phoneInput: string,
  clientIp?: string
): Promise<{ ok: boolean; message?: string; error?: string; demoCode?: string }> {
  const phone = normalizePhone(phoneInput);

  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل نامعتبر است. فرمت صحیح: 09xxxxxxxxx" };
  }

  try {
    // 1. Check if locked out
    const isLocked = await redis.get(`lockout:${phone}`);
    if (isLocked) {
      return {
        ok: false,
        error: "حساب شما موقتاً به دلیل تلاش‌های ناموفق قفل شده است. لطفاً ۱۰ دقیقه بعد مجدداً تلاش کنید.",
      };
    }

    // 2. Rate limiting: 3 per 10 mins per phone
    const phoneLimitKey = `ratelimit:phone:${phone}`;
    const phoneReqCount = await redis.incr(phoneLimitKey);
    if (phoneReqCount === 1) {
      await redis.expire(phoneLimitKey, 600);
    }
    if (phoneReqCount > 3) {
      return {
        ok: false,
        error: "تعداد درخواست‌های کد بیش از حد مجاز است. لطفاً ۱۰ دقیقه بعد مجدداً تلاش کنید.",
      };
    }

    // Rate limiting: 3 per 10 mins per IP
    if (clientIp) {
      const ipLimitKey = `ratelimit:ip:${clientIp}`;
      const ipReqCount = await redis.incr(ipLimitKey);
      if (ipReqCount === 1) {
        await redis.expire(ipLimitKey, 600);
      }
      if (ipReqCount > 3) {
        return {
          ok: false,
          error: "تعداد درخواست‌های مجاز از این IP تکمیل شده است. لطفاً ۱۰ دقیقه بعد تلاش کنید.",
        };
      }
    }

    // 3. User check: Only active users can log in
    // Generic response to avoid phone enumeration
    const user = await db.user.findUnique({
      where: { phone, isActive: true },
    });

    let demoCode: string | undefined;

    if (user) {
      // 4. Generate 6-digit code
      const isDemoMode =
        process.env.DEMO_MODE === "true" && (process.env.MESSAGING_PROVIDER || "fake") === "fake";
      const demoPhones = [
        process.env.SEED_ADMIN_PHONE || "09123456789",
        process.env.SEED_MANAGER_PHONE || "09120000002",
        process.env.SEED_SALES_PHONE || "09120000003",
      ];

      let code = "";
      if (isDemoMode && demoPhones.includes(phone)) {
        code = process.env.DEMO_CODE || "123456";
        demoCode = code;
      } else {
        code = crypto.randomInt(100000, 1000000).toString();
      }

      // Hash code with SHA-256
      const hash = crypto.createHash("sha256").update(code).digest("hex");

      // Save in Redis key otp:{phone} with 120s TTL
      const record: OtpRecord = { hash, attempts: 0 };
      await redis.set(`otp:${phone}`, JSON.stringify(record), "EX", 120);

      // Send OTP via messaging provider
      await sendMessage({
        to: phone,
        body: `کد ورود به سنجاق: ${code}`,
        token: code,
        template: process.env.KAVENEGAR_OTP_TEMPLATE,
      });
    }

    return {
      ok: true,
      message: "کد تأیید ورود برای شما ارسال شد.",
      demoCode,
    };
  } catch (err) {
    console.error("[requestOtp error]", err);
    return { ok: false, error: "خطا در برقراری ارتباط با سرویس. لطفاً بعداً تلاش کنید." };
  }
}

export async function verifyOtp(
  phoneInput: string,
  codeInput: string
): Promise<{ ok: boolean; data?: { user: Pick<User, "id" | "name" | "phone" | "role"> }; error?: string }> {
  const phone = normalizePhone(phoneInput);
  const code = normalizePhone(codeInput);

  if (!phone || !code) {
    return { ok: false, error: "شماره موبایل و کد ورود الزامی است." };
  }

  try {
    // 1. Check lockout
    const isLocked = await redis.get(`lockout:${phone}`);
    if (isLocked) {
      return {
        ok: false,
        error: "حساب شما موقتاً قفل است. لطفاً ۱۰ دقیقه بعد تلاش کنید.",
      };
    }

    // 2. Read OTP from Redis
    const rawData = await redis.get(`otp:${phone}`);
    if (!rawData) {
      return { ok: false, error: "کد تأیید منقضی شده یا درخواستی ثبت نشده است." };
    }

    const record: OtpRecord = JSON.parse(rawData);

    // 3. Check attempts count
    if (record.attempts >= 5) {
      await redis.del(`otp:${phone}`);
      await redis.set(`lockout:${phone}`, "1", "EX", 600);
      return {
        ok: false,
        error: "تعداد تلاش‌های ناموفق بیش از ۵ بار بود. حساب به مدت ۱۰ دقیقه قفل شد.",
      };
    }

    // 4. Compare hash with constant-time equality
    const inputHash = crypto.createHash("sha256").update(code).digest("hex");
    const isMatch =
      inputHash.length === record.hash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(record.hash));

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        await redis.del(`otp:${phone}`);
        await redis.set(`lockout:${phone}`, "1", "EX", 600);
        return {
          ok: false,
          error: "تعداد تلاش‌های ناموفق بیش از ۵ بار بود. حساب به مدت ۱۰ دقیقه قفل شد.",
        };
      }
      const ttl = await redis.ttl(`otp:${phone}`);
      await redis.set(`otp:${phone}`, JSON.stringify(record), "EX", Math.max(ttl, 1));
      return { ok: false, error: "کد تأیید وارد شده صحیح نمی‌باشد." };
    }

    // Success -> delete OTP key
    await redis.del(`otp:${phone}`);

    // Find User
    const user = await db.user.findUnique({
      where: { phone, isActive: true },
    });

    if (!user) {
      return { ok: false, error: "کاربر یافت نشد یا حساب غیرفعال است." };
    }

    // 5. Create Session in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await db.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // 6. Sign JWT with jose
    const token = await new SignJWT({
      sessionId: session.id,
      userId: user.id,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(getSessionSecret());

    // 7. Set httpOnly cookie
    try {
      cookies().set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });
    } catch {
      // In standalone tests or non-request contexts
    }

    return {
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
    };
  } catch (err) {
    console.error("[verifyOtp error]", err);
    return { ok: false, error: "خطا در تایید کد ورود. لطفاً مجدداً تلاش فرمایید." };
  }
}

export async function logout(): Promise<{ ok: boolean }> {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        const verified = await jwtVerify(token, getSessionSecret());
        const sessionId = (verified.payload as { sessionId?: string }).sessionId;
        if (sessionId) {
          await db.session.delete({ where: { id: sessionId } }).catch(() => {});
        }
      } catch {
        // Safe ignore invalid token on logout
      }
    }
  } catch {
    // Safe ignore cookie error
  }
  try {
    cookies().delete(SESSION_COOKIE);
  } catch {
    // Safe ignore cookie delete error in non-request context
  }
  return { ok: true };
}

const serverCache =
  typeof cache === "function"
    ? cache
    : <T extends (...args: unknown[]) => unknown>(fn: T): T => fn;

export const getCurrentUser = serverCache(async (): Promise<User | null> => {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const verified = await jwtVerify(token, getSessionSecret());
    const payload = verified.payload as { sessionId?: string; userId?: string };

    if (!payload.sessionId || !payload.userId) return null;

    const dbSession = await db.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!dbSession || dbSession.expiresAt < new Date() || !dbSession.user.isActive) {
      return null;
    }

    return dbSession.user;
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires [${roles.join(", ")}], but user is ${user.role}`);
  }
  return user;
}
