import { describe, it, expect, beforeEach, vi } from "vitest";
import { Priority, Role, Task, TaskOrigin, TaskStatus, User, Contact } from "@prisma/client";
import { classifyTaskCategory, getTehranDayBounds } from "./tasks";
import { createTaskAction, toggleTaskDoneAction } from "./actions/tasks";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => ({
  db: {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
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

describe("Tasks & Calendar - Stage D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Asia/Tehran vs UTC Overdue Classification", () => {
    it("computes Tehran day bounds accurately across UTC midnight boundary", () => {
      // 2026-11-26T22:00:00Z is 2026-11-27 01:30:00 in Asia/Tehran (+03:30)
      const tehranAfterMidnight = new Date("2026-11-26T22:00:00.000Z");
      const bounds = getTehranDayBounds(tehranAfterMidnight);

      expect(bounds.tehranYmd).toBe("2026-11-27");
      expect(bounds.startOfToday.toISOString()).toBe("2026-11-26T20:30:00.000Z");
      expect(bounds.endOfToday.toISOString()).toBe("2026-11-27T20:29:59.999Z");

      // Task due at 2026-11-26T18:00:00Z (21:30 Tehran on Nov 26) -> OVERDUE on Nov 27 Tehran
      const dueNov26Tehran = new Date("2026-11-26T18:00:00.000Z");
      expect(classifyTaskCategory(TaskStatus.TODO, dueNov26Tehran, tehranAfterMidnight)).toBe(
        "OVERDUE"
      );

      // Task due at 2026-11-26T21:00:00Z (00:30 Tehran on Nov 27) -> TODAY on Nov 27 Tehran
      const dueNov27Tehran = new Date("2026-11-26T21:00:00.000Z");
      expect(classifyTaskCategory(TaskStatus.TODO, dueNov27Tehran, tehranAfterMidnight)).toBe(
        "TODAY"
      );

      // Task due at 2026-11-27T21:00:00Z (00:30 Tehran on Nov 28) -> UPCOMING
      const dueNov28Tehran = new Date("2026-11-27T21:00:00.000Z");
      expect(classifyTaskCategory(TaskStatus.TODO, dueNov28Tehran, tehranAfterMidnight)).toBe(
        "UPCOMING"
      );

      // DONE task is always DONE regardless of past dueAt
      expect(classifyTaskCategory(TaskStatus.DONE, dueNov26Tehran, tehranAfterMidnight)).toBe(
        "DONE"
      );
    });
  });

  describe("Task Assignment & Ownership Rules", () => {
    it("prevents SALES from assigning a task to another user", async () => {
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

      const res = await createTaskAction({
        title: "پیگیری قرارداد",
        assigneeId: "sales-2",
        priority: Priority.HIGH,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toContain("مجاز به تخصیص وظیفه به همکاران دیگر نیست");
      expect(db.task.create).not.toHaveBeenCalled();
    });

    it("allows MANAGER to assign a task to a rep with origin MANAGER and logs TASK activity on linked contact", async () => {
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

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "sales-2",
        name: "مریم کاظمی",
        isActive: true,
      } as unknown as User);

      vi.mocked(db.contact.findUnique).mockResolvedValue({
        id: "cnt-1",
        fullName: "مهندس رستمی",
        company: "نوین",
        ownerId: "sales-2",
        isActive: true,
      } as unknown as Contact);

      const now = new Date();
      vi.mocked(db.task.create).mockResolvedValue({
        id: "task-1",
        title: "تماس فوری",
        description: null,
        dueAt: now,
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        origin: TaskOrigin.MANAGER,
        assigneeId: "sales-2",
        createdById: "mgr-1",
        contactId: "cnt-1",
        dealId: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      } as unknown as Task);

      const res = await createTaskAction({
        title: "تماس فوری",
        priority: Priority.HIGH,
        assigneeId: "sales-2",
        contactId: "cnt-1",
        dueAt: now.toISOString(),
      });

      expect(res.ok).toBe(true);
      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            origin: TaskOrigin.MANAGER,
            assigneeId: "sales-2",
            contactId: "cnt-1",
          }),
        })
      );
      expect(db.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "TASK",
            contactId: "cnt-1",
            userId: "mgr-1",
          }),
        })
      );
    });

    it("blocks SALES from toggling another user's task", async () => {
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

      vi.mocked(db.task.findUnique).mockResolvedValue({
        id: "task-other",
        assigneeId: "sales-2",
        status: TaskStatus.TODO,
      } as unknown as Task);

      const res = await toggleTaskDoneAction("task-other");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("مجاز به تغییر وضعیت");
      expect(db.task.update).not.toHaveBeenCalled();
    });
  });
});
