export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.ENABLE_WORKER === "true"
  ) {
    const { startWorkers } = await import("./server/queue/worker");
    startWorkers();
  }
}
