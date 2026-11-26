import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Role, SuggestionStatus, SuggestionType, User } from "@prisma/client";
import { callAiJson } from "./ai/client";
import { aiSummaryResponseSchema } from "@/lib/schemas/ai";
import { approveSuggestionAction } from "./actions/ai";
import { createTaskAction } from "./actions/tasks";
import { db } from "./db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./db", () => ({
  db: {
    aiSuggestion: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    aiSummary: { upsert: vi.fn() },
    contact: { findUnique: vi.fn() },
    deal: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

vi.mock("./actions/tasks", () => ({
  createTaskAction: vi.fn().mockResolvedValue({ ok: true, data: { id: "t-1" } }),
}));

vi.mock("./actions/deals", () => ({
  moveDealAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./actions/contacts", () => ({
  changeLeadStatusAction: vi.fn().mockResolvedValue({ ok: true }),
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

describe("AI Client & Suggestions - Stage H", () => {
  const originalKey = process.env.AI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.AI_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it("returns notConfigured when AI_API_KEY is missing", async () => {
    delete process.env.AI_API_KEY;
    const res = await callAiJson({
      systemPrompt: "sys",
      userPrompt: "usr",
      schema: aiSummaryResponseSchema,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.notConfigured).toBe(true);
    }
  });

  it("retries once on invalid JSON and succeeds on valid second response", async () => {
    process.env.AI_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not valid json {" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "خلاصه تست",
                  risk: "low",
                  nextStep: "تماس فردا",
                }),
              },
            },
          ],
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await callAiJson({
      systemPrompt: "sys",
      userPrompt: "usr",
      schema: aiSummaryResponseSchema,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.risk).toBe("low");
      expect(res.data.summary).toBe("خلاصه تست");
    }
  });

  it("returns friendly error when model output fails Zod schema on both attempts", async () => {
    process.env.AI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: "ok", risk: "invalid_risk" }) } }],
      }),
    }) as unknown as typeof fetch;

    const res = await callAiJson({
      systemPrompt: "sys",
      userPrompt: "usr",
      schema: aiSummaryResponseSchema,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("فرمت مورد انتظار");
    }
  });

  it("blocks SALES from approving suggestion for another rep's contact", async () => {
    mockUser = { ...mockUser, id: "sales-1", role: Role.SALES };

    vi.mocked(db.aiSuggestion.findUnique).mockResolvedValue({
      id: "sug-1",
      type: SuggestionType.CREATE_TASK,
      status: SuggestionStatus.PENDING,
      contactId: "c-other",
      payload: { type: "CREATE_TASK", title: "تماس", priority: "HIGH" },
      contact: { id: "c-other", ownerId: "sales-2", isActive: true },
    } as never);

    const res = await approveSuggestionAction("sug-1");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("مجاز به تایید پیشنهاد");
    expect(createTaskAction).not.toHaveBeenCalled();
  });

  it("approves CREATE_TASK suggestion through createTaskAction and marks ACCEPTED", async () => {
    mockUser = { ...mockUser, id: "sales-1", role: Role.SALES };

    vi.mocked(db.aiSuggestion.findUnique).mockResolvedValue({
      id: "sug-2",
      type: SuggestionType.CREATE_TASK,
      status: SuggestionStatus.PENDING,
      contactId: "c-mine",
      payload: { type: "CREATE_TASK", title: "ارسال پیش‌فاکتور", priority: "HIGH" },
      contact: { id: "c-mine", ownerId: "sales-1", isActive: true },
    } as never);

    const res = await approveSuggestionAction("sug-2");
    expect(res.ok).toBe(true);
    expect(createTaskAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "ارسال پیش‌فاکتور",
        contactId: "c-mine",
      })
    );
    expect(db.aiSuggestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sug-2" },
        data: expect.objectContaining({
          status: SuggestionStatus.ACCEPTED,
        }),
      })
    );
  });
});
