// src/config/queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import { ENV } from "./env";

export const executionQueue = new Queue("code-execution", {
  connection: redisConnection,

  defaultJobOptions: {
    // Retry failed jobs up to N times
    attempts: ENV.QUEUE_RETRY_LIMIT || 3,

    // Exponential backoff delay between retries
    backoff: {
      type: "exponential",
      delay: 2000, // 2s base delay → 2s, 4s, 8s...
    },

    // Automatically clean up completed jobs
    removeOnComplete: {
      age: 3600, // keep for 1 hour for inspection
    },

    // Keep last 20 failed jobs for debugging
    removeOnFail: {
      count: 20,
    },

    // Keep up to 20 log entries per job
    keepLogs: 20,
  },
});

console.log("✅ Execution queue initialized with retry & backoff support");
