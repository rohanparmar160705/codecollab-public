// src/modules/execution/execution.events.ts
import { QueueEvents } from "bullmq";
import { redisConnection } from "../../config/redis";
import prisma from "../../config/prisma";
import { Server } from "socket.io";

/**
 * Bridge BullMQ job lifecycle -> Socket.IO room events for live execution feedback
 * Events emitted to roomId:
 * - execution:status { executionId, jobId, status, progress }
 * - execution:output { executionId, jobId, status, output }
 */
export function registerExecutionEvents(io: Server) {
  const queueEvents = new QueueEvents("code-execution", { connection: redisConnection });

  queueEvents.on("progress", async (event: any) => {
    const { jobId, data } = event || {};
    try {
      const execId = (data as any)?.id;
      if (!execId) return;
      const exec = await prisma.execution.findUnique({ where: { id: execId } });
      if (!exec) return;
      io.to(exec.roomId).emit("execution:status", {
        executionId: execId,
        jobId,
        status: "RUNNING",
        progress: typeof data === "number" ? data : 0,
      });
    } catch (e) {
      // noop
    }
  });

  queueEvents.on("completed", async (event: any) => {
    const { jobId, returnvalue } = event || {};
    try {
      const execId = typeof returnvalue === "object" && returnvalue
        ? (returnvalue as any)?.id || (returnvalue as any)?.executionId || (returnvalue as any)?.data?.id
        : undefined;
      let exec = execId ? await prisma.execution.findUnique({ where: { id: String(execId) } }) : null;
      // Fallback: look up by jobId
      if (!exec) exec = await prisma.execution.findFirst({ where: { jobId: String(jobId) } });
      if (!exec) return;
      io.to(exec.roomId).emit("execution:output", {
        executionId: exec.id,
        jobId,
        status: "COMPLETED",
        output: exec.output || (typeof returnvalue === "object" && returnvalue
          ? ((returnvalue as any).output ?? (returnvalue as any).stdout ?? "")
          : ""),
      });
      io.to(exec.roomId).emit("execution:status", {
        executionId: exec.id,
        jobId,
        status: "COMPLETED",
        progress: 100,
      });
    } catch (e) {
      // noop
    }
  });

  queueEvents.on("failed", async (event: any) => {
    const { jobId, failedReason } = event || {};
    try {
      const exec = await prisma.execution.findFirst({ where: { jobId: String(jobId) } });
      if (!exec) return;
      io.to(exec.roomId).emit("execution:output", {
        executionId: exec.id,
        jobId,
        status: "FAILED",
        output: exec.errorMessage || failedReason || "Execution failed",
      });
      io.to(exec.roomId).emit("execution:status", {
        executionId: exec.id,
        jobId,
        status: "FAILED",
        progress: 100,
      });
    } catch (e) {
      // noop
    }
  });
}
