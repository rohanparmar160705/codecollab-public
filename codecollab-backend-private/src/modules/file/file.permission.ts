// src/modules/file/file.permission.ts
/**
 * Small helper utilities to check if a user may act on files.
 * Uses prisma queries in service normally, but helpers are here for clarity.
 */

import prisma from "../../config/prisma";

export const isRoomOwner = async (userId: string, roomId: string): Promise<boolean> => {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  return !!(room && room.ownerId === userId);
};

export const isRoomMember = async (userId: string, roomId: string): Promise<boolean> => {
  const membership = await prisma.roomMember.findFirst({
    where: { userId, roomId },
  });
  return !!membership;
};

export const isEditorOrOwner = async (userId: string, roomId: string): Promise<boolean> => {
  // owner or member with role EDITOR/OWNER
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (room && room.ownerId === userId) return true;

  const member = await prisma.roomMember.findFirst({
    where: { userId, roomId },
  });
  if (!member) return false;
  return member.role === "EDITOR" || member.role === "OWNER";
};
