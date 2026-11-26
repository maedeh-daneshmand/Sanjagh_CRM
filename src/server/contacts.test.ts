import { describe, it, expect, beforeEach, vi } from "vitest";
import { User, Contact, Deal, ContactKind, LeadStatus, Priority, Source, Role } from "@prisma/client";
import { listContacts, getContact, listAssignableUsers } from "./contacts";
import {
  createContactAction,
  updateContactAction,
  assignOwnerAction,
  assignManyAction,
  convertLeadToCustomerAction,
} from "./actions/contacts";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => {
  const mockPrisma = {
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation(
    async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
  );
  return { db: mockPrisma };
});

let mockUser: User = {
  id: "user-sales-1",
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
      throw new Error(`FORBIDDEN: Requires [${roles.join(", ")}], but user is ${mockUser.role}`);
    }
    return Promise.resolve(mockUser);
  }),
}));

describe("Contacts & Leads - Stage B Business Logic & Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based Scoping", () => {
    it("listContacts restricts query to ownerId = me for SALES role", async () => {
      mockUser = {
        id: "sales-100",
        name: "کارشناس",
        phone: "09121111111",
        email: null,
        role: Role.SALES,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.count).mockResolvedValue(1);
      vi.mocked(db.contact.findMany).mockResolvedValue([
        {
          id: "cnt-1",
          kind: ContactKind.LEAD,
          fullName: "مشتری اختصاصی من",
          phone: "09123333333",
          email: null,
          company: null,
          city: null,
          source: Source.WEBSITE,
          sourceNote: null,
          leadStatus: LeadStatus.NEW,
          priority: Priority.HIGH,
          score: 80,
          tags: [],
          notes: null,
          ownerId: "sales-100",
          createdById: "sales-100",
          convertedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deals: [],
          owner: { id: "sales-100", name: "کارشناس", phone: "09121111111" },
          _count: { deals: 0 },
        } as unknown as Contact & { owner: { id: string; name: string; phone: string }; deals: Deal[]; _count: { deals: number } },
      ]);

      const res = await listContacts({ kind: ContactKind.LEAD });

      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: "sales-100",
            kind: ContactKind.LEAD,
          }),
        })
      );
      expect(res.items.length).toBe(1);
      expect(res.items[0].ownerId).toBe("sales-100");
    });

    it("getContact returns null when SALES user attempts to access another rep's contact", async () => {
      mockUser = {
        id: "sales-100",
        name: "کارشناس",
        phone: "09121111111",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Contact owned by someone else ("sales-200")
      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "cnt-other",
        ownerId: "sales-200",
        isActive: true,
        kind: ContactKind.LEAD,
        fullName: "مشتری همکار",
        deals: [],
        tasks: [],
        activities: [],
        messages: [],
        owner: { id: "sales-200", name: "همکار", phone: "09122222222" },
      } as unknown as Contact);

      const contact = await getContact("cnt-other");
      expect(contact).toBeNull();
    });

    it("updateContactAction blocks SALES user from modifying another rep's contact", async () => {
      mockUser = {
        id: "sales-100",
        name: "کارشناس",
        phone: "09121111111",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "cnt-other",
        ownerId: "sales-999",
        isActive: true,
      } as unknown as Contact);

      const res = await updateContactAction({
        id: "cnt-other",
        fullName: "تغییر غیرمجاز نام",
      });

      expect(res.ok).toBe(false);
      expect(res.error).toContain("شما مجاز به ویرایش این مخاطب نیستید");
      expect(db.contact.update).not.toHaveBeenCalled();
    });
  });

  describe("Owner Assignment Permissions", () => {
    it("assignOwnerAction rejects SALES role with FORBIDDEN", async () => {
      mockUser = {
        id: "sales-1",
        name: "کارشناس",
        phone: "09121111111",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(
        assignOwnerAction({ contactId: "cnt-1", ownerId: "sales-2" })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("assignOwnerAction allows MANAGER to reassign contact owner", async () => {
      mockUser = {
        id: "mgr-1",
        name: "مدیر فروش",
        phone: "09120000002",
        role: Role.MANAGER,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "cnt-1",
        isActive: true,
        source: Source.WEBSITE,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 0 },
      } as unknown as Contact);

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "sales-target",
        name: "کارشناس هدف",
        isActive: true,
      } as unknown as User);

      const res = await assignOwnerAction({
        contactId: "cnt-1",
        ownerId: "sales-target",
      });

      expect(res.ok).toBe(true);
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cnt-1" },
          data: { ownerId: "sales-target" },
        })
      );
      expect(db.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "ASSIGNMENT",
            contactId: "cnt-1",
          }),
        })
      );
    });
  });

  describe("Converting Lead to Customer", () => {
    it("convertLeadToCustomerAction flips kind to CUSTOMER, records convertedAt and creates CONVERSION activity", async () => {
      mockUser = {
        id: "sales-1",
        name: "کارشناس",
        phone: "09121111111",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "lead-to-convert",
        ownerId: "sales-1",
        fullName: "سرنخ برنده",
        isActive: true,
        source: Source.REFERRAL,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 0 },
      } as unknown as Contact);

      const res = await convertLeadToCustomerAction("lead-to-convert");

      expect(res.ok).toBe(true);
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "lead-to-convert" },
          data: expect.objectContaining({
            kind: ContactKind.CUSTOMER,
            convertedAt: expect.any(Date),
          }),
        })
      );
      expect(db.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "CONVERSION",
            contactId: "lead-to-convert",
          }),
        })
      );
    });
  });

  describe("Assignable Users, Create Owner Enforcement & Bulk Assign", () => {
    it("listAssignableUsers rejects SALES and allows MANAGER", async () => {
      mockUser = {
        id: "sales-1",
        name: "کارشناس",
        phone: "09121111111",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(listAssignableUsers()).rejects.toThrow("FORBIDDEN");

      mockUser = { ...mockUser, id: "mgr-1", role: Role.MANAGER };
      vi.mocked(db.user.findMany).mockResolvedValue([
        { id: "sales-1", name: "علی رضایی", phone: "09120000003", role: Role.SALES } as unknown as User,
      ]);

      const users = await listAssignableUsers();
      expect(users).toHaveLength(1);
      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            role: { in: [Role.SALES, Role.MANAGER] },
          }),
        })
      );
    });

    it("createContactAction ignores ownerId passed by SALES and enforces ownerId = me", async () => {
      mockUser = {
        id: "sales-me",
        name: "کارشناس من",
        phone: "09120000003",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.create).mockResolvedValue({
        id: "new-lead-1",
        ownerId: "sales-me",
      } as unknown as Contact);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "new-lead-1",
        source: Source.WEBSITE,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 1 },
      } as unknown as Contact);

      const res = await createContactAction({
        fullName: "سرنخ تستی",
        kind: ContactKind.LEAD,
        ownerId: "other-rep-id",
      });

      expect(res.ok).toBe(true);
      expect(db.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: "sales-me",
            createdById: "sales-me",
          }),
        })
      );
    });

    it("createContactAction allows MANAGER to assign a specific owner on create", async () => {
      mockUser = {
        id: "mgr-1",
        name: "مدیر فروش",
        phone: "09120000002",
        role: Role.MANAGER,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "sales-rep-2",
        name: "مریم کاظمی",
        isActive: true,
      } as unknown as User);

      vi.mocked(db.contact.create).mockResolvedValue({
        id: "new-lead-2",
        ownerId: "sales-rep-2",
      } as unknown as Contact);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "new-lead-2",
        source: Source.WEBSITE,
        priority: Priority.HIGH,
        activities: [],
        _count: { activities: 1 },
      } as unknown as Contact);

      const res = await createContactAction({
        fullName: "سرنخ مدیر",
        kind: ContactKind.LEAD,
        ownerId: "sales-rep-2",
      });

      expect(res.ok).toBe(true);
      expect(db.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: "sales-rep-2",
            createdById: "mgr-1",
          }),
        })
      );
    });

    it("assignManyAction rejects SALES and allows MANAGER to bulk-assign with one ASSIGNMENT activity each", async () => {
      mockUser = {
        id: "sales-1",
        name: "کارشناس",
        phone: "09120000003",
        role: Role.SALES,
        isActive: true,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(
        assignManyAction({ contactIds: ["c1", "c2"], ownerId: "sales-2" })
      ).rejects.toThrow("FORBIDDEN");

      mockUser = { ...mockUser, id: "mgr-1", role: Role.MANAGER };

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "sales-target",
        name: "کارشناس هدف",
        isActive: true,
      } as unknown as User);

      vi.mocked(db.contact.findMany).mockResolvedValue([
        { id: "c1", ownerId: "old-1", owner: { name: "قبلی ۱" } },
        { id: "c2", ownerId: null, owner: null },
      ] as unknown as Contact[]);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "c1",
        source: Source.WEBSITE,
        priority: Priority.MEDIUM,
        activities: [],
        _count: { activities: 1 },
      } as unknown as Contact);

      const res = await assignManyAction({
        contactIds: ["c1", "c2"],
        ownerId: "sales-target",
      });

      expect(res.ok).toBe(true);
      expect(db.contact.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["c1", "c2"] } },
        data: { ownerId: "sales-target" },
      });
      expect(db.activity.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: "ASSIGNMENT",
            contactId: "c1",
            userId: "mgr-1",
            body: "مالکیت مخاطب از «قبلی ۱» به «کارشناس هدف» تغییر یافت",
          }),
          expect.objectContaining({
            type: "ASSIGNMENT",
            contactId: "c2",
            userId: "mgr-1",
            body: "مالکیت مخاطب از «تخصیص‌نیافته» به «کارشناس هدف» تغییر یافت",
          }),
        ],
      });
    });
  });
});
