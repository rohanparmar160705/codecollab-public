// src/modules/room/room.service.ts
import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";

export class RoomService {
  static async createRoom(
    ownerId: string,
    data: { name: string; language?: string; description?: string }
  ) {
    return prisma.room.create({
      data: {
        name: data.name,
        language: data.language || "javascript",
        description: data.description || "",
        ownerId,
      },
    });
  }

  static async getAllRooms(forUserId: string) {
    // Only rooms the user owns or is a member of (private by default)
    return prisma.room.findMany({
      where: {
        OR: [
          { ownerId: forUserId },
          { members: { some: { userId: forUserId } } },
        ],
      },
      include: { owner: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getRoomById(id: string, userId: string, inviteCode?: string | null) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true } },
        members: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });
    if (!room) throw new AppError("Room not found", 404);
    const isOwner = room.ownerId === userId;
    const isMember = !!room.members.find((m) => m.userId === userId);
    const hasLink = !!(room.isPublic && inviteCode && room.inviteCode && room.inviteCode === inviteCode);
    if (isOwner || isMember || hasLink) return room;
    throw new AppError("Unauthorized", 403);
  }

  static async deleteRoom(id: string, ownerId: string) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError("Room not found", 404);
    if (room.ownerId !== ownerId) throw new AppError("Unauthorized", 403);

    await prisma.$transaction([
      prisma.roomMember.deleteMany({ where: { roomId: id } }),
      prisma.room.delete({ where: { id } }),
    ]);

    return { message: "Room and associated members deleted successfully" };
  }

  static async joinRoom(roomId: string, userId: string, inviteCode?: string | null) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("Room not found", 404);

    const exists = await prisma.roomMember.findFirst({
      where: { roomId, userId },
    });
    if (exists) {
      // Idempotent: return 200-style response from controller
      return { message: "Already joined" };
    }

    // If not owner and not member, require valid invite when room is public-link
    const isOwner = room.ownerId === userId;
    if (!isOwner) {
      const validByInvite = !!(room.isPublic && room.inviteCode && inviteCode && room.inviteCode === inviteCode);
      if (!validByInvite) throw new AppError("Invite required", 403);
    }

    await prisma.roomMember.create({ data: { roomId, userId } });
    return { message: "Joined room successfully" };
  }

  static async leaveRoom(roomId: string, userId: string) {
    const exists = await prisma.roomMember.findFirst({
      where: { roomId, userId },
    });
    if (!exists) throw new AppError("Not a member", 400);

    await prisma.roomMember.delete({ where: { id: exists.id } });
    return { message: "Left room successfully" };
  }

  static async saveContent(roomId: string, userId: string, content: string, language?: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("Room not found", 404);
    const membership = await prisma.roomMember.findFirst({ where: { roomId, userId } });
    const isOwner = room.ownerId === userId;
    if (!membership && !isOwner) throw new AppError("Not a room member", 403);

    // Upsert a primary file per room (single-file mode for now)
    const name = "main";
    const path = "/";
    const existing = await prisma.file.findFirst({ where: { roomId, name, path } });
    const updated = existing
      ? await prisma.file.update({ where: { id: existing.id }, data: { content } })
      : await prisma.file.create({ data: { roomId, name, path, content } });

    // Optional analytics bump
    await prisma.roomAnalytics.upsert({
      where: { roomId },
      update: { totalEdits: { increment: 1 } },
      create: { roomId, totalEdits: 1, totalExecs: 0, activeUsers: 0 },
    }).catch(() => undefined);

    return { fileId: updated.id, length: content.length };
  }

  static async setVisibility(roomId: string, ownerId: string, isPublic: boolean) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("Room not found", 404);
    if (room.ownerId !== ownerId) throw new AppError("Unauthorized", 403);

    const inviteCode = isPublic
      ? (room.inviteCode || Math.random().toString(36).slice(2, 10))
      : room.inviteCode; // keep code for later reuse; not exposing when private

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: { isPublic, inviteCode },
    });
    return { id: updated.id, isPublic: updated.isPublic, inviteCode: updated.inviteCode };
  }

  static async getShare(roomId: string, ownerId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError("Room not found", 404);
    if (room.ownerId !== ownerId) throw new AppError("Unauthorized", 403);
    if (!room.isPublic || !room.inviteCode) {
      throw new AppError("Room is not public or missing invite code", 400);
    }
    return { inviteCode: room.inviteCode };
  }
}
