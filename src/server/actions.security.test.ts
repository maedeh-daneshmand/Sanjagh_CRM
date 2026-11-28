import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Channel, Role, User } from "@prisma/client";

let mockUser: User = {
  id: "admin-1",
  name: "مدیر",
  phone: "09123456789",
  email: null,
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("./auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth")>();
  return {
    ...actual,
    requireUser: vi.fn(async () => mockUser),
    requireRole: vi.fn(async (...roles: Role[]) => {
      if (!roles.includes(mockUser.role)) {
        throw new Error(`FORBIDDEN: Requires [${roles.join(", ")}]`);
      }
      return mockUser;
    }),
  };
});

vi.mock("./db", () => ({
  db: {
    contact: { findUnique: vi.fn(), count: vi.fn() },
    deal: { findUnique: vi.fn() },
    task: { findUnique: vi.fn(), findMany: vi.fn() },
    message: { findUnique: vi.fn() },
    campaign: { findMany: vi.fn() },
    automation: { update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import {
  refreshCampaignsAction,
  getCampaignFailedMessagesAction,
  previewCampaignAudienceAction,
} from "./actions/campaigns";
import { summarizeContactAction, analyzeNoteAction } from "./actions/ai";
import { toggleAutomationActiveAction } from "./actions/automations";
import { deleteContactAction } from "./actions/contacts";
import { deleteDealAction } from "./actions/deals";
import { retryFailedMessageAction } from "./actions/messages";
import { getTasksByRangeAction, toggleTaskDoneAction } from "./actions/tasks";
import { getRepDetailAction } from "./actions/team";

const PUBLIC_ALLOWLIST = new Set([
  "requestOtpAction",
  "verifyOtpAction",
  "logoutAction",
  "getLoginConfigAction",
]);

describe("Server Actions Security & Zod Validation Audit", () => {
  beforeEach(() => {
    mockUser = { ...mockUser, id: "admin-1", role: Role.ADMIN };
    vi.clearAllMocks();
  });

  it("every exported server action in src/server/actions/* (except auth allowlist) calls requireUser or requireRole", () => {
    const actionsDir = path.resolve(process.cwd(), "src/server/actions");
    const files = fs.readdirSync(actionsDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);

    const missingAuth: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(actionsDir, file), "utf8");
      const matches = Array.from(content.matchAll(/export\s+async\s+function\s+(\w+)/g));

      for (let i = 0; i < matches.length; i++) {
        const fnName = matches[i][1];
        if (PUBLIC_ALLOWLIST.has(fnName)) continue;

        const startIdx = matches[i].index ?? 0;
        const endIdx = i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
        const body = content.slice(startIdx, endIdx);

        const hasAuthCall = /require(?:User|Role)\s*\(/.test(body);
        if (!hasAuthCall) {
          missingAuth.push(`${file}:${fnName}`);
        }
      }
    }

    expect(missingAuth).toEqual([]);
  });

  it("refreshCampaignsAction and getCampaignFailedMessagesAction enforce ADMIN/MANAGER role", async () => {
    mockUser = { ...mockUser, id: "sales-1", role: Role.SALES };

    await expect(refreshCampaignsAction()).rejects.toThrow("FORBIDDEN");
    await expect(getCampaignFailedMessagesAction("camp-1")).rejects.toThrow("FORBIDDEN");
  });

  it("returns { ok: false, error } on invalid Zod inputs across actions", async () => {
    const invalidChannel = await previewCampaignAudienceAction("INVALID" as Channel, {});
    expect(invalidChannel.ok).toBe(false);

    const emptyCampaign = await getCampaignFailedMessagesAction("");
    expect(emptyCampaign.ok).toBe(false);

    const emptyContactAi = await summarizeContactAction("");
    expect(emptyContactAi.ok).toBe(false);

    const emptyNoteAi = await analyzeNoteAction("c-1", "   ");
    expect(emptyNoteAi.ok).toBe(false);

    const emptyAuto = await toggleAutomationActiveAction("", true);
    expect(emptyAuto.ok).toBe(false);

    const emptyContactDel = await deleteContactAction("");
    expect(emptyContactDel.ok).toBe(false);

    const emptyDealDel = await deleteDealAction("");
    expect(emptyDealDel.ok).toBe(false);

    const emptyMsgRetry = await retryFailedMessageAction("");
    expect(emptyMsgRetry.ok).toBe(false);

    const emptyTaskToggle = await toggleTaskDoneAction("");
    expect(emptyTaskToggle.ok).toBe(false);

    const invalidDateRange = await getTasksByRangeAction("not-a-date", "2026-01-01T00:00:00Z");
    expect(invalidDateRange.ok).toBe(false);

    const emptyRep = await getRepDetailAction("");
    expect(emptyRep.ok).toBe(false);
  });
});
