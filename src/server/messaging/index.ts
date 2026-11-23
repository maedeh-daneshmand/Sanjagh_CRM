import { MessagingProvider, SendMessageOptions, SendResult } from "./types";
import { FakeMessagingProvider } from "./fake";
import { KavenegarProvider } from "./kavenegar";
import { SmtpProvider } from "./smtp";

export * from "./types";

export function getMessagingProvider(): MessagingProvider {
  const providerType = process.env.MESSAGING_PROVIDER || "fake";
  if (providerType === "kavenegar") {
    return new KavenegarProvider();
  }
  if (providerType === "smtp") {
    return new SmtpProvider();
  }
  return new FakeMessagingProvider();
}

export async function sendMessage(options: SendMessageOptions): Promise<SendResult> {
  const allowlist = process.env.MESSAGING_ALLOWLIST
    ? process.env.MESSAGING_ALLOWLIST.split(",").map((s) => s.trim())
    : null;

  // Respect MESSAGING_ALLOWLIST: if set, only those in allowlist get real sends; others behave like fake
  if (allowlist && allowlist.length > 0 && !allowlist.includes(options.to)) {
    const fake = new FakeMessagingProvider();
    return fake.send(options);
  }

  const provider = getMessagingProvider();
  return provider.send(options);
}
