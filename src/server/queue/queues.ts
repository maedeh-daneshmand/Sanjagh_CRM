import { Queue } from "bullmq";
import { getBullConnection } from "./connection";

export interface SendMessageJobData {
  messageId: string;
  template?: string;
  token?: string;
}

export interface CampaignDispatchJobData {
  campaignId: string;
}

export interface AutomationStepJobData {
  runId: string;
  stepIndex: number;
}

const globalForQueues = globalThis as unknown as {
  messagesQueue?: Queue;
  automationsQueue?: Queue;
};

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
};

export function getMessagesQueue(): Queue {
  if (!globalForQueues.messagesQueue) {
    globalForQueues.messagesQueue = new Queue("messages", {
      connection: getBullConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return globalForQueues.messagesQueue;
}

export function getAutomationsQueue(): Queue {
  if (!globalForQueues.automationsQueue) {
    globalForQueues.automationsQueue = new Queue("automations", {
      connection: getBullConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return globalForQueues.automationsQueue;
}

export async function enqueueMessageJob(params: {
  messageId: string;
  isOtp?: boolean;
  template?: string;
  token?: string;
}): Promise<void> {
  const queue = getMessagesQueue();
  await queue.add(
    "send-message",
    {
      messageId: params.messageId,
      template: params.template,
      token: params.token,
    } satisfies SendMessageJobData,
    {
      jobId: params.messageId,
      priority: params.isOtp ? 1 : 10,
    }
  );
}

export async function enqueueCampaignDispatchJob(campaignId: string): Promise<void> {
  const queue = getMessagesQueue();
  await queue.add(
    "campaign-dispatch",
    { campaignId } satisfies CampaignDispatchJobData,
    {
      jobId: `campaign-${campaignId}`,
      priority: 5,
    }
  );
}
