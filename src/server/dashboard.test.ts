import { describe, it, expect, beforeEach, vi } from "vitest";
import { DealStage, Role, Source, User } from "@prisma/client";
import { aggregateDashboard, getManagerDashboard } from "./dashboard";
import { listUsers } from "./users";
import { toggleUserActiveAction } from "./actions/users";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => {
  const mockPrisma = {
    contact: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
    task: { count: vi.fn(), findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    user: { findMany: vi.fn(), update: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    session: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation(
    async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
  );
  return { db: mockPrisma };
});

let mockUser: User = {
  id: "admin-1",
  name: "مدیر ارشد",
  phone: "09123456789",
  email: null,
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("./auth", () => ({
  normalizePhone: (p: string) => p.trim(),
  requireUser: vi.fn(() => Promise.resolve(mockUser)),
  requireRole: vi.fn((...roles: Role[]) => {
    if (!roles.includes(mockUser.role)) {
      throw new Error(`FORBIDDEN: Requires [${roles.join(", ")}]`);
    }
    return Promise.resolve(mockUser);
  }),
}));

describe("Dashboard, Team & Users - Stage E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dashboard Aggregations", () => {
    it("computes revenue, win rate, open pipeline, and lead source shares from fixed dataset", async () => {
      const now = new Date("2026-11-26T12:00:00Z");
      const tenDaysAgo = new Date("2026-11-16T12:00:00Z");
      const fortyDaysAgo = new Date("2026-10-17T12:00:00Z");

      vi.mocked(db.contact.findMany).mockResolvedValue([
        { id: "c1", source: Source.WEBSITE, createdAt: tenDaysAgo },
        { id: "c2", source: Source.WEBSITE, createdAt: tenDaysAgo },
        { id: "c3", source: Source.INSTAGRAM, createdAt: fortyDaysAgo },
        { id: "c4", source: Source.REFERRAL, createdAt: tenDaysAgo },
      ] as never);

      vi.mocked(db.deal.findMany).mockResolvedValue([
        {
          id: "d1",
          title: "قرارداد اول",
          amount: 20000000,
          stage: DealStage.WON,
          contactId: "c1",
          closedAt: tenDaysAgo,
          createdAt: tenDaysAgo,
          expectedCloseAt: null,
          contact: { id: "c1", fullName: "مشتری ۱", company: "شرکت الف" },
        },
        {
          id: "d2",
          title: "قرارداد دوم",
          amount: 10000000,
          stage: DealStage.WON,
          contactId: "c2",
          closedAt: fortyDaysAgo,
          createdAt: fortyDaysAgo,
          expectedCloseAt: null,
          contact: { id: "c2", fullName: "مشتری ۲", company: null },
        },
        {
          id: "d3",
          title: "قرارداد باز",
          amount: 15000000,
          stage: DealStage.PROPOSAL,
          contactId: "c3",
          closedAt: null,
          createdAt: tenDaysAgo,
          expectedCloseAt: null,
          contact: { id: "c3", fullName: "مشتری ۳", company: "شرکت ب" },
        },
        {
          id: "d4",
          title: "قرارداد از دست رفته",
          amount: 5000000,
          stage: DealStage.LOST,
          contactId: "c4",
          closedAt: tenDaysAgo,
          createdAt: tenDaysAgo,
          expectedCloseAt: null,
          contact: { id: "c4", fullName: "مشتری ۴", company: null },
        },
      ] as never);

      vi.mocked(db.task.count).mockResolvedValue(3);
      vi.mocked(db.activity.findMany).mockResolvedValue([]);

      const data = await aggregateDashboard(undefined, now);

      expect(data.totalRevenue).toBe(30000000);
      expect(data.revenueChangePct).toBe(100); // 20M vs 10M (+100%)
      expect(data.totalContacts).toBe(4);
      expect(data.wonDealsCount).toBe(2);
      // 2 won out of 3 closed (2 WON + 1 LOST) = 67%
      expect(data.winRate).toBe(67);
      expect(data.openPipelineValue).toBe(15000000);
      expect(data.openTasksCount).toBe(3);
      expect(data.monthlySales).toHaveLength(8);
      expect(data.leadSources[0]).toEqual(
        expect.objectContaining({ name: "وب‌سایت مستقیم", value: 50, count: 2 })
      );
    });
  });

  describe("Role Gating & User Deactivation", () => {
    it("getManagerDashboard rejects SALES role with FORBIDDEN", async () => {
      mockUser = {
        ...mockUser,
        id: "sales-1",
        role: Role.SALES,
      };

      await expect(getManagerDashboard()).rejects.toThrow("FORBIDDEN");
    });

    it("listUsers rejects MANAGER and SALES roles with FORBIDDEN", async () => {
      mockUser = { ...mockUser, id: "mgr-1", role: Role.MANAGER };
      await expect(listUsers()).rejects.toThrow("FORBIDDEN");

      mockUser = { ...mockUser, id: "sales-1", role: Role.SALES };
      await expect(listUsers()).rejects.toThrow("FORBIDDEN");
    });

    it("deactivating a user deletes all their Session rows", async () => {
      mockUser = { ...mockUser, id: "admin-1", role: Role.ADMIN };

      const res = await toggleUserActiveAction({
        userId: "sales-target",
        isActive: false,
      });

      expect(res.ok).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "sales-target" },
        data: { isActive: false },
      });
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "sales-target" },
      });
    });
  });
});
