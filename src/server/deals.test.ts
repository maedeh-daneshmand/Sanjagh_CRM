import { describe, it, expect, beforeEach, vi } from "vitest";
import { Deal, DealStage, Role, User, Contact, Source, Priority } from "@prisma/client";
import { listDealsByStage } from "./deals";
import { moveDealAction } from "./actions/deals";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => ({
  db: {
    deal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

let mockUser: User = {
  id: "sales-1",
  name: "علی رضایی",
  phone: "09120000003",
  email: null,
  role: Role.SALES,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("./auth", () => ({
  requireUser: vi.fn(() => Promise.resolve(mockUser)),
  requireRole: vi.fn((...roles: Role[]) => {
    if (!roles.includes(mockUser.role)) {
      throw new Error(`FORBIDDEN: Requires [${roles.join(", ")}]`);
    }
    return Promise.resolve(mockUser);
  }),
}));

describe("Pipeline & Deals - Stage C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listDealsByStage & Scoping", () => {
    it("scopes deals to ownerId = me for SALES and computes column counts/totals", async () => {
      mockUser = {
        id: "sales-1",
        name: "علی رضایی",
        phone: "09120000003",
        email: null,
        role: Role.SALES,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.deal.findMany).mockResolvedValue([
        {
          id: "d1",
          title: "معامله ۱",
          amount: 10000000,
          stage: DealStage.NEW,
          position: 500,
          contactId: "c1",
          ownerId: "sales-1",
          expectedCloseAt: null,
          closedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          contact: { id: "c1", fullName: "مشتری ۱", company: "شرکت الف" },
          owner: { id: "sales-1", name: "علی رضایی" },
        },
        {
          id: "d2",
          title: "معامله ۲",
          amount: 25000000,
          stage: DealStage.WON,
          position: 1000,
          contactId: "c2",
          ownerId: "sales-1",
          expectedCloseAt: null,
          closedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          contact: { id: "c2", fullName: "مشتری ۲", company: null },
          owner: { id: "sales-1", name: "علی رضایی" },
        },
        {
          id: "d3",
          title: "معامله ۳",
          amount: 5000000,
          stage: DealStage.LOST,
          position: 1000,
          contactId: "c3",
          ownerId: "sales-1",
          expectedCloseAt: null,
          closedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          contact: { id: "c3", fullName: "مشتری ۳", company: "شرکت ب" },
          owner: { id: "sales-1", name: "علی رضایی" },
        },
      ] as unknown as Deal[]);

      const result = await listDealsByStage();

      expect(db.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: "sales-1" },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        })
      );
      expect(result.totalCount).toBe(3);
      expect(result.columns.NEW.count).toBe(1);
      expect(result.columns.NEW.totalAmount).toBe(10000000);
      expect(result.columns.WON.count).toBe(1);
      expect(result.columns.WON.totalAmount).toBe(25000000);
      expect(result.wonDealsValue).toBe(25000000);
      // Total active pipeline excludes LOST
      expect(result.totalPipelineValue).toBe(35000000);
    });
  });

  describe("moveDealAction Permissions & closedAt Handling", () => {
    it("blocks SALES user from moving another rep's deal", async () => {
      mockUser = {
        id: "sales-1",
        name: "علی رضایی",
        phone: "09120000003",
        email: null,
        role: Role.SALES,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.deal.findUnique).mockResolvedValue({
        id: "deal-other",
        title: "معامله همکار",
        stage: DealStage.NEW,
        position: 1000,
        ownerId: "sales-2",
        contactId: "c1",
        closedAt: null,
      } as unknown as Deal);

      const res = await moveDealAction({
        dealId: "deal-other",
        toStage: DealStage.CONTACTED,
        newPosition: 1500,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toContain("مجاز به جابه‌جایی");
      expect(db.deal.update).not.toHaveBeenCalled();
    });

    it("sets closedAt when moved to WON and writes STAGE_CHANGE activity", async () => {
      mockUser = {
        id: "sales-1",
        name: "علی رضایی",
        phone: "09120000003",
        email: null,
        role: Role.SALES,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.deal.findUnique).mockResolvedValue({
        id: "deal-1",
        title: "فروش لایسنس",
        stage: DealStage.NEGOTIATION,
        position: 1000,
        ownerId: "sales-1",
        contactId: "c1",
        closedAt: null,
      } as unknown as Deal);

      vi.mocked(db.deal.update).mockResolvedValue({
        id: "deal-1",
        stage: DealStage.WON,
        position: 1500,
        closedAt: new Date(),
      } as unknown as Deal);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "c1",
        source: Source.WEBSITE,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 1 },
      } as unknown as Contact);

      const res = await moveDealAction({
        dealId: "deal-1",
        toStage: DealStage.WON,
        newPosition: 1500,
      });

      expect(res.ok).toBe(true);
      expect(db.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deal-1" },
          data: expect.objectContaining({
            stage: DealStage.WON,
            position: 1500,
            closedAt: expect.any(Date),
          }),
        })
      );
      expect(db.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "STAGE_CHANGE",
            contactId: "c1",
            dealId: "deal-1",
            meta: { from: DealStage.NEGOTIATION, to: DealStage.WON },
          }),
        })
      );
    });

    it("clears closedAt when a WON/LOST deal is reopened to an active stage", async () => {
      mockUser = {
        id: "mgr-1",
        name: "مدیر فروش",
        phone: "09120000002",
        email: null,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.deal.findUnique).mockResolvedValue({
        id: "deal-lost",
        title: "معامله بازگشتی",
        stage: DealStage.LOST,
        position: 1000,
        ownerId: "sales-1",
        contactId: "c1",
        closedAt: new Date("2026-11-20T10:00:00Z"),
      } as unknown as Deal);

      vi.mocked(db.deal.update).mockResolvedValue({
        id: "deal-lost",
        stage: DealStage.NEGOTIATION,
        position: 2500,
        closedAt: null,
      } as unknown as Deal);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "c1",
        source: Source.WEBSITE,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 1 },
      } as unknown as Contact);

      const res = await moveDealAction({
        dealId: "deal-lost",
        toStage: DealStage.NEGOTIATION,
        newPosition: 2500,
      });

      expect(res.ok).toBe(true);
      expect(db.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deal-lost" },
          data: expect.objectContaining({
            stage: DealStage.NEGOTIATION,
            position: 2500,
            closedAt: null,
          }),
        })
      );
    });
  });
});
