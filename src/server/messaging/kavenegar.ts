import { MessagingProvider, SendMessageOptions, SendResult } from "./types";

export class KavenegarProvider implements MessagingProvider {
  private apiKey: string;
  private defaultSender?: string;

  constructor(apiKey?: string, defaultSender?: string) {
    this.apiKey = apiKey || process.env.KAVENEGAR_API_KEY || "";
    this.defaultSender = defaultSender || process.env.KAVENEGAR_SENDER;
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    if (!this.apiKey) {
      console.warn("[Kavenegar] Missing API key, falling back to fake log");
      console.log(`[OTP fake] ${options.to} -> ${options.body}`);
      return { success: true, messageId: `fake-no-key-${Date.now()}` };
    }

    try {
      if (options.template && options.token) {
        // Verify Lookup for OTP
        const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json?receptor=${encodeURIComponent(
          options.to
        )}&token=${encodeURIComponent(options.token)}&template=${encodeURIComponent(options.template)}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          return?: { status: number; message: string };
          entries?: { messageid: number }[];
        };
        if (data?.return?.status === 200) {
          return { success: true, messageId: String(data.entries?.[0]?.messageid || "") };
        }
        return { success: false, error: data?.return?.message || "Kavenegar verify lookup failed" };
      } else {
        // Plain SMS send
        let url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json?receptor=${encodeURIComponent(
          options.to
        )}&message=${encodeURIComponent(options.body)}`;
        if (this.defaultSender) {
          url += `&sender=${encodeURIComponent(this.defaultSender)}`;
        }
        const res = await fetch(url);
        const data = (await res.json()) as {
          return?: { status: number; message: string };
          entries?: { messageid: number }[];
        };
        if (data?.return?.status === 200) {
          return { success: true, messageId: String(data.entries?.[0]?.messageid || "") };
        }
        return { success: false, error: data?.return?.message || "Kavenegar SMS send failed" };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}
