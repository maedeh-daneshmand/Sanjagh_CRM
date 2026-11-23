import { MessagingProvider, SendMessageOptions, SendResult } from "./types";

export class FakeMessagingProvider implements MessagingProvider {
  async send(options: SendMessageOptions): Promise<SendResult> {
    console.log(`[OTP fake] ${options.to} -> ${options.body}`);
    return {
      success: true,
      messageId: `fake-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}
