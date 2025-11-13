// src/modules/execution/execution.worker.ts
import { Worker, JobsOptions } from "bullmq";
// import { runInDocker } from "../../utils/docker";
import { redisConnection } from "../../config/redis";
// import { ENV } from "../../config/env";
import { DockerService } from "../../services/docker.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Custom backoff strategy (manual retry delay)
 * Exponential delay = 2s, 4s, 8s...
 */
const exponentialBackoff = (attemptsMade: number): number => {
  return Math.pow(2, attemptsMade) * 2000; // 2s, 4s, 8s...
};

const worker = new Worker(
  "code-execution", // must match the queue name used in executionQueue.add()
  async (job) => {
    const { id, code, language, input } = job.data;

    console.log(`🚀 Starting execution job ${job.id} for ${language}`);

    await job.updateProgress(10);

    try {
      // Run inside Docker
      const result = await DockerService.execute(language, code, input);
      console.log("[WORKER 1] Execute result", {
        id,
        success: result?.success,
        outputPreview: String(result?.output ?? "").slice(0, 200),
        error: result?.error,
      });
      await job.updateProgress(90);

      // ✅ Update execution record in DB (do not collapse empty string to null)
      const finalOut = (typeof result.output === "string" && result.output.trim().length > 0)
        ? result.output
        : (result as any).rawStdout && String((result as any).rawStdout).trim().length > 0
          ? String((result as any).rawStdout)
          : (result as any).rawStderr && String((result as any).rawStderr).trim().length > 0
            ? String((result as any).rawStderr)
            : (result.error ? String(result.error) : "");
      await prisma.execution.update({
        where: { id },
        data: {
          status: result.success ? "COMPLETED" : "FAILED",
          output: finalOut,
          execTimeMs: result.duration || 0,
          memoryUsedKb: result.memory || 0,
          errorMessage: result.error || null,
          // updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Job ${job.id} (${language}) completed in ${result.duration}ms`
      );

      return result;
    } catch (err: any) {
      console.error(`❌ Job ${id} failed:`, err.message);

      // ❌ Mark failed job in DB
      try {
        await prisma.execution.update({
          where: { id },
          data: {
            status: "FAILED",
            errorMessage: err.message || "Execution failed",
            // updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.error("⚠️ Failed to update execution status in DB:", dbErr);
      }

      throw err;
    } finally {
      await job.updateProgress(100);
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    limiter: { max: 5, duration: 1000 },
    settings: {
      backoffStrategy: exponentialBackoff, // ✅ handles retry delay
    },
  }
);

// ✅ Optional retry setup
(worker as any).opts.defaultJobOptions = {
  attempts: 3,
  backoff: { type: "custom" }, // uses custom exponentialBackoff
} as JobsOptions;

// Event listeners
worker.on("completed", (job, result) => {
  console.log(`🎯 Job ${job.data.id} done`, result.output?.slice(0, 100));
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job ${job?.data?.id} failed`, err.message);
});

export default worker;
