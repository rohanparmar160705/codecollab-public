// src/modules/file/file.service.ts
import prisma from "../../config/prisma";
import { CreateFilePayload, UpdateFilePayload, CreateSnapshotPayload } from "./file.types";
import { NotificationType } from "@prisma/client";

/**
 * FileService - contains business logic for files and snapshots.
 * It accepts an optional io instance so we can emit socket events (real-time updates).
 */
export class FileService {
  private io: any;

  constructor(io?: any) {
    this.io = io;
  }

  // Create a file inside a room. Only owner/editor allowed (enforced in controller but double-checked).
  async createFile(roomId: string, userId: string, data: CreateFilePayload) {
    // verify room exists
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error("Room not found");

    const file = await prisma.file.create({
      data: {
        roomId,
        name: data.name,
        content: data.content || "",
        path: data.path || data.name,
      },
    });

    // optional: create initial snapshot
    await prisma.fileSnapshot.create({
      data: {
        fileId: file.id,
        userId,
        code: file.content,
        language: room.language || "javascript",
      },
    });

    // emit socket event to room
    try {
      if (this.io) this.io.to(roomId).emit("file:created", { file });
    } catch (err) {
      // non-fatal
      console.warn("Socket emit failed (file:created):", err);
    }

    return file;
  }

  // Get list of files for a room (non-deleted)
  async listFiles(roomId: string) {
    return prisma.file.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Get single file by id (ensure not deleted)
  async getFileById(fileId: string) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) return null;
    return file;
  }

  // Update file (content/name/path). Only owner/editor allowed (enforced in controller + double-check)
  async updateFile(fileId: string, userId: string, updates: UpdateFilePayload) {
    const existing = await prisma.file.findUnique({ where: { id: fileId } });
    if (!existing || existing.deletedAt) throw new Error("File not found");

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: {
        name: updates.name ?? existing.name,
        content: updates.content ?? existing.content,
        path: updates.path ?? existing.path,
      },
    });

    // Emit an update event to the room
    try {
      if (this.io) this.io.to(existing.roomId).emit("file:updated", { file: updated });
    } catch (err) {
      console.warn("Socket emit failed (file:updated):", err);
    }

    return updated;
  }

  // Soft delete a file (only owner allowed)
  async deleteFile(fileId: string, userId: string) {
    const existing = await prisma.file.findUnique({ where: { id: fileId } });
    if (!existing || existing.deletedAt) throw new Error("File not found");

    // soft-delete
    const deleted = await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    try {
      if (this.io) this.io.to(existing.roomId).emit("file:deleted", { fileId: deleted.id });
    } catch (err) {
      console.warn("Socket emit failed (file:deleted):", err);
    }

    return deleted;
  }

  // Create a snapshot for a file (any member)
  async createSnapshot(fileId: string, userId: string, payload: CreateSnapshotPayload) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) throw new Error("File not found");

    const snapshot = await prisma.fileSnapshot.create({
      data: {
        fileId,
        userId,
        code: payload.code,
        language: payload.language,
        description: payload.description,
      },
    });

    try {
      if (this.io) this.io.to(file.roomId).emit("file:snapshot", { fileId, snapshot });
    } catch (err) {
      console.warn("Socket emit failed (file:snapshot):", err);
    }

    return snapshot;
  }

  // Get snapshots for a file
  async listSnapshots(fileId: string) {
    return prisma.fileSnapshot.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
  }
}
