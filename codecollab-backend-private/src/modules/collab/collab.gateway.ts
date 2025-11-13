// src/modules/collab/collab.gateway.ts
import { Server, Socket } from "socket.io";
import redis from "../../config/redis";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "@prisma/client";
import prisma from "../../config/prisma";

interface PresenceData {
  userId: string;
  username: string;
  roomId: string;
  roomOwnerId?: string; // optional: if frontend sends room owner
}

export const registerCollabGateway = (io: Server) => {
  // ✅ Initialize NotificationService with shared socket.io instance
  const notificationService = new NotificationService(io);

  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // =============================
    // 🔹 Cursor Throttle Variables
    // =============================
    let lastCursorEmit = 0;

    // ===============================
    // 🧩 JOIN ROOM EVENT
    // ===============================
    socket.on("join-room", async (data: PresenceData) => {
      try {
        const { userId, username, roomId, roomOwnerId } = data;
        if (!userId || !roomId) return;

        socket.join(roomId);

        // Store presence in Redis
        await redis.hSet(`room:${roomId}:users`, userId, username);

        // Broadcast updated presence list
        const members = await redis.hGetAll(`room:${roomId}:users`);
        io.to(roomId).emit("presence-update", Object.values(members));

        console.log(`👥 ${username} joined room ${roomId}`);

        // ✅ Create + emit notification to room owner
        if (roomOwnerId && roomOwnerId !== userId) {
          await notificationService.createNotification({
            userId: roomOwnerId,
            type: NotificationType.ROOM, // use Prisma enum
            message: `${username} joined your room.`,
            refType: "ROOM",
            refId: roomId,
          });
        }
      } catch (err) {
        console.error("Error joining room:", err);
      }
    });

    // ===============================
    // 💻 CODE CHANGES
    // ===============================
    socket.on("code-change", (payload: { roomId: string; code: string }) => {
      const { roomId, code } = payload;
      if (roomId && code !== undefined) {
        socket.to(roomId).emit("code-update", { code });
      }
    });

    // ===============================
    // 🧭 CURSOR MOVEMENTS
    // ===============================
    socket.on(
      "cursor-move",
      (payload: { roomId: string; userId: string; cursor: any }) => {
        const now = Date.now();
        if (now - lastCursorEmit < 100) return; // throttle to 100ms
        lastCursorEmit = now;

        const { roomId, userId, cursor } = payload;
        if (roomId && userId)
          socket.to(roomId).emit("cursor-update", { userId, cursor });
      }
    );

    // ===============================
    // 🧪 EXECUTION RESULT SHARING
    // ===============================
    socket.on(
      "execution-result",
      (payload: { roomId: string; status: string; output: string }) => {
        const { roomId } = payload || ({} as any);
        if (!roomId) return;
        // Broadcast to others in the room
        socket.to(roomId).emit("execution-result", payload);
      }
    );

    // ===============================
    // 💬 CHAT
    // ===============================
    socket.on(
      "chat:send",
      async (payload: { roomId: string; userId: string; text: string }) => {
        try {
          const { roomId, userId, text } = payload || ({} as any);
          if (!roomId || !userId || typeof text !== "string") return;
          const msg = await prisma.message.create({
            data: { roomId, userId, text },
          });
          io.to(roomId).emit("chat:receive", {
            id: msg.id,
            roomId,
            userId,
            text: msg.text,
            createdAt: msg.createdAt,
          });
        } catch (e) {
          // ignore
        }
      }
    );

    // Typing indicator (ephemeral, not persisted)
    socket.on(
      "chat:typing",
      (payload: { roomId: string; userId: string; typing: boolean }) => {
        const { roomId, userId, typing } = payload || ({} as any);
        if (!roomId || !userId) return;
        socket.to(roomId).emit("chat:typing", { userId, typing: !!typing });
      }
    );

    // ===============================
    // 🔁 USER RECONNECT
    // ===============================
    socket.on("user-reconnect", async (data: PresenceData) => {
      const { userId, username, roomId } = data;
      if (userId && roomId) {
        await redis.hSet(`room:${roomId}:users`, userId, username);
        const members = await redis.hGetAll(`room:${roomId}:users`);
        io.to(roomId).emit("presence-update", Object.values(members));
      }
    });

    // ===============================
    // 🚪 LEAVE ROOM
    // ===============================
    socket.on("leave-room", async (data: PresenceData) => {
      try {
        const { userId, username, roomId } = data;
        if (!roomId || !userId) return;

        socket.leave(roomId);

        // Remove user from Redis
        await redis.hDel(`room:${roomId}:users`, userId);

        // Update others
        const members = await redis.hGetAll(`room:${roomId}:users`);
        io.to(roomId).emit("presence-update", Object.values(members));

        console.log(`🔴 ${username} left room ${roomId}`);
      } catch (err) {
        console.error("Error leaving room:", err);
      }
    });

    // ===============================
    // 🧹 DISCONNECT CLEANUP
    // ===============================
    socket.on("disconnect", async () => {
      try {
        console.log(`🔌 Socket disconnected: ${socket.id}`);

        // optional: cleanup orphaned Redis entries (if mapped)
        const keys = await redis.keys("room:*:users");
        for (const key of keys) {
          const members = await redis.hGetAll(key);
          for (const [id] of Object.entries(members)) {
            // could add additional tracking if mapping socketId → userId
          }
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    });
  });
};
