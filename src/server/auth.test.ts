import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import { SignJWT } from "jose";
import { Session, User } from "@prisma/client";
import {
  normalizePhone,
  requestOtp,
  verifyOtp,
  requireRole,
  SESSION_COOKIE,
  getSessionSecret,
} from "./auth";
import { redis } from "./redis";
import { db } from "./db";

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (key: string) => (cookieStore.has(key) ? { value: cookieStore.get(key) } : undefined),
    set: (key: string, val: string) => cookieStore.set(key, val),
    delete: (key: string) => cookieStore.delete(key),
  }),
}));

// Mock db for testing auth logic in isolation
vi.mock("./db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn().mockResolvedValue({ id: "otp-msg-1" }),
    },
  },
}));

vi.mock("./queue/queues", () => ({
  enqueueMessageJob: vi.fn().mockResolvedValue(undefined),
}));

describe("Auth Core & Security Rules", () => {
  beforeEach(async () => {
    await redis.flushall();
    await redis.set("worker:heartbeat", "1", "EX", 30);
    cookieStore.clear();
    vi.clearAllMocks();
  });

  describe("Phone Normalization", () => {
    it("converts Persian and Arabic digits to Latin", () => {
      expect(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
      expect(normalizePhone("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
      expect(normalizePhone("  09123456789  ")).toBe("09123456789");
      expect(normalizePhone("۰۹۱۲۳۴۵6789")).toBe("09123456789");
    });

    it("rejects invalid phone formats", async () => {
      const res = await requestOtp("123456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("شماره موبایل نامعتبر است");
    });
  });

  describe("OTP Rate Limiting & Hashing", () => {
    it("enforces maximum 3 requests per 10 minutes per phone", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        phone: "09121111111",
        name: "تست",
        role: "ADMIN",
        isActive: true,
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User);

      // 1st request
      const res1 = await requestOtp("09121111111");
      expect(res1.ok).toBe(true);

      // 2nd request
      const res2 = await requestOtp("09121111111");
      expect(res2.ok).toBe(true);

      // 3rd request
      const res3 = await requestOtp("09121111111");
      expect(res3.ok).toBe(true);

      // 4th request -> blocked
      const res4 = await requestOtp("09121111111");
      expect(res4.ok).toBe(false);
      expect(res4.error).toContain("تعداد درخواست‌های کد بیش از حد مجاز است");
    });

    it("stores only SHA-256 hash in Redis, not plain OTP", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        phone: "09121111111",
        name: "تست",
        role: "ADMIN",
        isActive: true,
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User);

      await requestOtp("09121111111");

      const storedRaw = await redis.get("otp:09121111111");
      expect(storedRaw).toBeDefined();
      const parsed = JSON.parse(storedRaw!);
      expect(parsed.hash).toBeDefined();
      expect(parsed.hash.length).toBe(64); // SHA-256 hex string length
      expect(parsed.attempts).toBe(0);

      // TTL should be <= 120s
      const ttl = await redis.ttl("otp:09121111111");
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);
    });
  });

  describe("OTP Verification & Lockout", () => {
    it("locks out user for 10 minutes after 5 wrong attempts", async () => {
      // Setup OTP record in Redis manually
      const secretCode = "654321";
      const hash = crypto.createHash("sha256").update(secretCode).digest("hex");
      await redis.set("otp:09129999999", JSON.stringify({ hash, attempts: 0 }), "EX", 120);

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-9",
        phone: "09129999999",
        name: "قفل",
        role: "SALES",
        isActive: true,
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User);

      // Attempts 1 to 4: wrong code
      for (let i = 1; i <= 4; i++) {
        const res = await verifyOtp("09129999999", "111111");
        expect(res.ok).toBe(false);
        expect(res.error).toContain("کد تأیید وارد شده صحیح نمی‌باشد");
      }

      // 5th attempt: wrong code -> lockout triggered
      const res5 = await verifyOtp("09129999999", "111111");
      expect(res5.ok).toBe(false);
      expect(res5.error).toContain("حساب به مدت ۱۰ دقیقه قفل شد");

      // Verify OTP key was removed and lockout key exists
      const otpKey = await redis.get("otp:09129999999");
      expect(otpKey).toBeNull();

      const lockout = await redis.get("lockout:09129999999");
      expect(lockout).toBe("1");

      // Subsequent attempt while locked out is rejected
      const res6 = await verifyOtp("09129999999", secretCode);
      expect(res6.ok).toBe(false);
      expect(res6.error).toContain("حساب شما موقتاً قفل است");
    });
  });

  describe("Role Enforcement", () => {
    it("requireRole throws FORBIDDEN when user has insufficient role", async () => {
      const mockSalesUser: User = {
        id: "sales-1",
        phone: "09120000003",
        name: "کارشناس",
        role: "SALES",
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = await new SignJWT({
        sessionId: "sess-sales",
        userId: mockSalesUser.id,
        role: mockSalesUser.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(getSessionSecret());

      cookieStore.set(SESSION_COOKIE, token);

      vi.mocked(db.session.findUnique).mockResolvedValue({
        id: "sess-sales",
        userId: mockSalesUser.id,
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(),
        user: mockSalesUser,
      } as unknown as (Session & { user: User }));

      // Checking ADMIN role should fail with FORBIDDEN
      await expect(requireRole("ADMIN")).rejects.toThrow("FORBIDDEN");

      // Checking SALES role should pass
      const verifiedUser = await requireRole("SALES");
      expect(verifiedUser.id).toBe(mockSalesUser.id);
    });
  });

  describe("OTP Delivery Honesty & Redis/DB Resilience", () => {
    it("returns error when no worker heartbeat is active and DEMO_MODE is off", async () => {
      const prevDemo = process.env.DEMO_MODE;
      process.env.DEMO_MODE = "false";
      await redis.del("worker:heartbeat");

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        phone: "09121111111",
        name: "تست",
        role: "ADMIN",
        isActive: true,
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User);

      const res = await requestOtp("09121111111");
      process.env.DEMO_MODE = prevDemo;

      expect(res.ok).toBe(false);
      expect(res.error).toBe("سرویس ارسال پیامک فعال نیست");
      expect(await redis.get("otp:09121111111")).toBeNull();
    });

    it("does not increment rate-limit counters when DB is down", async () => {
      vi.mocked(db.user.findUnique).mockRejectedValueOnce(new Error("DB connection refused"));

      const res = await requestOtp("09121111111", "1.2.3.4");
      expect(res.ok).toBe(false);
      expect(await redis.get("ratelimit:phone:09121111111")).toBeNull();
      expect(await redis.get("ratelimit:ip:1.2.3.4")).toBeNull();
    });

    it("returns friendly error when Redis is down during requestOtp and verifyOtp", async () => {
      const getSpy = vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis connection closed"));

      const reqRes = await requestOtp("09121111111", "1.2.3.4");
      expect(reqRes.ok).toBe(false);
      expect(reqRes.error).toBeTruthy();

      const verRes = await verifyOtp("09121111111", "123456");
      expect(verRes.ok).toBe(false);
      expect(verRes.error).toBeTruthy();

      getSpy.mockRestore();
    });
  });
});
