import { startWorkers } from "./server/queue/worker";

console.log("[Worker] Starting standalone BullMQ worker process...");
startWorkers();
