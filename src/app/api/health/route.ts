import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { redis } from "@/server/redis";
import { isWorkerRunning } from "@/server/queue/worker";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  let redisOk = false;

  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch {
    redisOk = false;
  }

  const workerOk = isWorkerRunning();
  const ok = dbOk && redisOk;

  return NextResponse.json(
    {
      ok,
      db: dbOk ? "ok" : "error",
      redis: redisOk ? "ok" : "error",
      worker: workerOk ? "running" : "stopped",
    },
    { status: ok ? 200 : 503 }
  );
}
