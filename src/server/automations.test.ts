import { describe, it, expect, beforeEach, vi } from "vitest";
import { AutomationTrigger, Role, RunStatus, TaskOrigin, User } from "@prisma/client";
import { emitEvent, executeAutomationStep, matchesConditions } from "./automations/engine";
import { toggleAutomationActiveAction, saveAutomationAction } from "./actions/automations";
import { enqueueAutomationStepJob, enqueueMessageJob } from "./queue/queues";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => ({
  db: {
    automation: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    automationRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: { create: vi.fn() },
    task: { create: vi.fn() },
    activity: { create: vi.fn() },
    contact: { update: vi.fn() },
  },
}));

vi.mock("./queue/queues", () => ({
  enqueueAutomationStepJob: vi.fn().mockResolvedValue(undefined),
  enqueueMessageJob: vi.fn().mockResolvedValue(undefined),
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

describe("Automation Engine & Permissions - Stage G", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matchesConditions checks triggerConfig.toStage and eq/neq/in operators", () => {
    expect(
      matchesConditions({ toStage: "WON" }, [], { contactId: "c1", toStage: "WON" })
    ).toBe(true);
    expect(
      matchesConditions({ toStage: "WON" }, [], { contactId: "c1", toStage: "LOST" })
    ).toBe(false);

    expect(
      matchesConditions(
        null,
        [
          { field: "source", op: "eq", value: "WEBSITE" },
          { field: "priority", op: "in", value: ["HIGH", "MEDIUM"] },
        ],
        { contactId: "c1", source: "WEBSITE", priority: "HIGH" }
      )
    ).toBe(true);
  });

  it("emitEvent creates AutomationRun and enqueues step 0", async () => {
    vi.mocked(db.automation.findMany).mockResolvedValue([
      {
        id: "auto-1",
        trigger: AutomationTrigger.LEAD_CREATED,
        triggerConfig: null,
        conditions: [],
        steps: [{ type: "SEND_SMS", body: "سلام {{fullName}}" }],
      },
    ] as never);

    vi.mocked(db.automationRun.create).mockResolvedValue({ id: "run-1" } as never);

    const runIds = await emitEvent(AutomationTrigger.LEAD_CREATED, {
      contactId: "c1",
      source: "WEBSITE",
    });

    expect(runIds).toEqual(["run-1"]);
    expect(db.automationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          automationId: "auto-1",
          contactId: "c1",
          status: RunStatus.RUNNING,
        }),
      })
    );
    expect(enqueueAutomationStepJob).toHaveBeenCalledWith({
      runId: "run-1",
      stepIndex: 0,
    });
  });

  it("executeAutomationStep schedules delayed job for WAIT and creates Task/Message for actions", async () => {
    vi.mocked(db.automationRun.findUnique).mockResolvedValue({
      id: "run-1",
      automationId: "auto-1",
      contactId: "c1",
      dealId: null,
      status: RunStatus.RUNNING,
      currentStep: 0,
      log: [],
      automation: {
        id: "auto-1",
        createdById: "mgr-1",
        steps: [
          { type: "WAIT", delayMinutes: 60 },
          { type: "SEND_SMS", body: "سلام {{fullName}}" },
          { type: "CREATE_TASK", title: "پیگیری", dueInHours: 24, priority: "HIGH" },
        ],
      },
      contact: {
        id: "c1",
        fullName: "رامین",
        phone: "09121111111",
        email: null,
        ownerId: "sales-1",
        createdById: "mgr-1",
        optOutSms: false,
        optOutEmail: false,
      },
    } as never);

    // Step 0: WAIT -> schedules step 1 with 60 * 60 * 1000 ms delay
    await executeAutomationStep("run-1", 0);
    expect(enqueueAutomationStepJob).toHaveBeenCalledWith({
      runId: "run-1",
      stepIndex: 1,
      delayMs: 60 * 60 * 1000,
    });

    // Step 1: SEND_SMS -> creates Message & enqueues in messagesQueue
    vi.mocked(db.message.create).mockResolvedValue({ id: "msg-auto-1" } as never);
    await executeAutomationStep("run-1", 1);
    expect(enqueueMessageJob).toHaveBeenCalledWith({ messageId: "msg-auto-1" });

    // Step 2: CREATE_TASK -> creates Task with origin AUTOMATION & completes run
    await executeAutomationStep("run-1", 2);
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origin: TaskOrigin.AUTOMATION,
          title: "پیگیری",
          assigneeId: "sales-1",
        }),
      })
    );
    expect(db.automationRun.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RunStatus.COMPLETED,
        }),
      })
    );
  });

  it("rejects SALES role on toggleAutomationActiveAction and saveAutomationAction", async () => {
    mockUser = { ...mockUser, role: Role.SALES };

    await expect(toggleAutomationActiveAction("auto-1", true)).rejects.toThrow(
      "FORBIDDEN"
    );
    await expect(saveAutomationAction({ name: "تست" })).rejects.toThrow("FORBIDDEN");
  });
});
