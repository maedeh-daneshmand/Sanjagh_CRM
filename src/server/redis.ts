import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisInstance(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  if (process.env.NODE_ENV === "test") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisMock = require("ioredis-mock");
    return new RedisMock();
  }

  const client = new Redis(redisUrl, {
    connectTimeout: 3000,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[Redis] Connection warning:", err.message);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
