import { describe, it, expect, beforeEach, vi } from "vitest";
import { CampaignStatus, Channel, MessageStatus, User } from "@prisma/client";
import { processSendMessageJob } from "./queue/worker";
import { requestOtp } from "./auth";
import { enqueueMessageJob } from "./queue/queues";
import { sendMessage } from "./messaging";
import { db } from "./db";
import { redis } from "./redis";

vi.mock("./db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    message: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activity: { create: vi.fn() },
    campaign: { update: vi.fn() },
  },
}));

vi.mock("./queue/queues", () => ({
  enqueueMessageJob: vi.fn().mockResolvedValue(undefined),
  enqueueCampaignDispatchJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./messaging", () => ({
  sendMessage: vi.fn(),
}));

describe("BullMQ Queue & Worker - Stage F", () => {
  beforeEach(async () => {
    await redis.flushall();
    await redis.set("worker:heartbeat", "1", "EX", 30);
    vi.clearAllMocks();
  });

  it("requestOtp enqueues a QUEUED Message with top priority instead of calling provider directly", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      phone: "09121111111",
      name: "تست",
      role: "ADMIN",
      isActive: true,
    } as unknown as User);

    vi.mocked(db.message.create).mockResolvedValue({ id: "msg-otp-1" } as never);

    const res = await requestOtp("09121111111");
    expect(res.ok).toBe(true);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: "SMS",
          toAddress: "09121111111",
          status: "QUEUED",
        }),
      })
    );
    expect(enqueueMessageJob).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "msg-otp-1",
        isOtp: true,
      })
    );
  });

  it("worker respects opt-out flags and marks Message FAILED without calling provider", async () => {
    vi.mocked(db.message.findUnique).mockResolvedValue({
      id: "msg-optout",
      channel: Channel.SMS,
      toAddress: "09120000001",
      body: "سلام",
      subject: null,
      status: MessageStatus.QUEUED,
      contactId: "c1",
      campaignId: "cmp-1",
      sentById: "u1",
      contact: {
        id: "c1",
        fullName: "مشتری",
        optOutSms: true,
        optOutEmail: false,
      },
    } as never);

    vi.mocked(db.campaign.update).mockResolvedValue({
      id: "cmp-1",
      totalCount: 1,
      sentCount: 0,
      failedCount: 1,
      status: CampaignStatus.SENDING,
    } as never);

    await processSendMessageJob({ messageId: "msg-optout" });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(db.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-optout" },
        data: expect.objectContaining({
          status: MessageStatus.FAILED,
        }),
      })
    );
    expect(db.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cmp-1" },
        data: { status: CampaignStatus.DONE, finishedAt: expect.any(Date) },
      })
    );
  });

  it("worker marks Message SENT, writes MESSAGE activity, and completes Campaign", async () => {
    vi.mocked(db.message.findUnique).mockResolvedValue({
      id: "msg-ok",
      channel: Channel.SMS,
      toAddress: "09120000001",
      body: "سلام علی عزیز",
      subject: null,
      status: MessageStatus.QUEUED,
      contactId: "c1",
      campaignId: "cmp-1",
      sentById: "u1",
      contact: {
        id: "c1",
        fullName: "علی",
        optOutSms: false,
        optOutEmail: false,
      },
    } as never);

    vi.mocked(sendMessage).mockResolvedValue({
      success: true,
      messageId: "prov-123",
    });

    vi.mocked(db.campaign.update).mockResolvedValue({
      id: "cmp-1",
      totalCount: 2,
      sentCount: 2,
      failedCount: 0,
      status: CampaignStatus.SENDING,
    } as never);

    await processSendMessageJob({ messageId: "msg-ok" });

    expect(db.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-ok" },
        data: expect.objectContaining({
          status: MessageStatus.SENT,
          providerMessageId: "prov-123",
          sentAt: expect.any(Date),
        }),
      })
    );
    expect(db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "MESSAGE",
          contactId: "c1",
        }),
      })
    );
    expect(db.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cmp-1" },
        data: { status: CampaignStatus.DONE, finishedAt: expect.any(Date) },
      })
    );
  });

  it("worker retries on intermediate failures and marks FAILED on final attempt", async () => {
    vi.mocked(db.message.findUnique).mockResolvedValue({
      id: "msg-fail",
      channel: Channel.SMS,
      toAddress: "09120000001",
      body: "تست خطا",
      subject: null,
      status: MessageStatus.QUEUED,
      contactId: null,
      campaignId: "cmp-2",
      sentById: "u1",
      contact: null,
    } as never);

    vi.mocked(sendMessage).mockResolvedValue({
      success: false,
      error: "Kavenegar timeout",
    });

    // Attempt 1 of 3 -> throws for retry, does not mark FAILED yet
    await expect(
      processSendMessageJob({ messageId: "msg-fail" }, 0, 3)
    ).rejects.toThrow("Kavenegar timeout");
    expect(db.message.update).not.toHaveBeenCalled();

    vi.mocked(db.campaign.update).mockResolvedValue({
      id: "cmp-2",
      totalCount: 1,
      sentCount: 0,
      failedCount: 1,
      status: CampaignStatus.SENDING,
    } as never);

    // Attempt 3 of 3 (attemptsMade = 2) -> marks FAILED and updates campaign counter
    await expect(
      processSendMessageJob({ messageId: "msg-fail" }, 2, 3)
    ).rejects.toThrow("Kavenegar timeout");
    expect(db.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-fail" },
        data: {
          status: MessageStatus.FAILED,
          error: "Kavenegar timeout",
        },
      })
    );
  });
});
