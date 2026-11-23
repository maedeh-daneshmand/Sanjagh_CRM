import nodemailer, { Transporter } from "nodemailer";
import { MessagingProvider, SendMessageOptions, SendResult } from "./types";

export class SmtpProvider implements MessagingProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || "",
          }
        : undefined,
    });
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@sanjaghcrm.ir",
        to: options.to,
        subject: options.subject || "پیام از سنجاق CRM",
        text: options.body,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "SMTP send failed" };
    }
  }
}
