// src/modules/execution/execution.service.ts
import { executionQueue } from "../../config/queue";
import { ExecutionJob } from "../../types/global";
import prisma from "../../config/prisma";
import { v4 as uuidv4 } from "uuid";
import { ExecutionQueueJob } from "./execution.dtos";
import { AppError } from "../../utils/appError";

export const ExecutionService = {
  async createExecution({
    userId,
    code,
    language,
    input = "",
    roomId, // required
  }: Omit<ExecutionQueueJob, "id"> & { roomId: string }) {
    const id = uuidv4();

    // 0️⃣ Validate room and membership
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("Room not found", 404);
    const isMember = await prisma.roomMember.findFirst({ where: { roomId, userId } });
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new AppError("Not a room member", 403);

    // 1️⃣ Save record in DB using relation connects to avoid FK mismatch
    const record = await prisma.execution.create({
      data: {
        id,
        user: { connect: { id: userId } },
        room: { connect: { id: roomId } },
        code,
        language,
        input,
        status: "QUEUED",
      },
    });

    // 2️⃣ Queue job
    try {
      const job = await executionQueue.add("code-execution", {
        id,
        userId,
        code,
        language,
        input,
      });

    // 3️⃣ Update DB with jobId
    await prisma.execution.update({
      where: { id },
      data: { jobId: job.id },
    });

      return { ...record, jobId: job.id };
    } catch (err) {
      console.error("❌ Failed to enqueue job:", err);
      await prisma.execution.update({
        where: { id },
        data: { status: "FAILED", errorMessage: "Queue failure" },
      });
      throw err;
    }
  },

  async saveResult(id: string, data: Record<string, any>) {
    return prisma.execution.update({ where: { id }, data });
  },

  // ✅ Fetch all recent executions
  async fetchAll(userId: string) {
    return prisma.execution.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  // ✅ Fetch single execution by ID
  async fetchById(id: string) {
    return prisma.execution.findUnique({ where: { id } });
  },
};
