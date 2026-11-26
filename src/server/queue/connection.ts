import type { ConnectionOptions } from "bullmq";

export function getBullConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}
