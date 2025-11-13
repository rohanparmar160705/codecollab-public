import { Server as HTTPServer } from "http";
import { setupWSConnection } from "y-websocket/bin/utils";
import * as WebSocket from "ws";
import jwt from "jsonwebtoken";
import url from "url";
import prisma from "../config/prisma";
import { ENV } from "../config/env";

function verifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET as string) as any;
    return decoded?.userId as string;
  } catch {
    return null;
  }
}

async function canJoinRoom(roomId: string, userId: string, inviteCode?: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { select: { userId: true } } },
  });
  if (!room) return false;

  const isOwner = room.ownerId === userId;
  const isMember = room.members.some((m) => m.userId === userId);
  if (isOwner || isMember) return true;

  if (room.isPublic) {
    if (!inviteCode) return false;
    return !!room.inviteCode && inviteCode === room.inviteCode;
  }
  return false;
}

export function attachYjsWebsocket(httpServer: HTTPServer) {
  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on("upgrade", async (request, socket, head) => {
    try {
      const reqUrl = request.url || "/";
      if (!reqUrl.startsWith("/yjs/")) return;

      const parsed = url.parse(reqUrl, true);
      const pathname = parsed.pathname || "";
      const parts = pathname.split("/").filter(Boolean); // ["yjs", ":roomId"]
      const roomId = parts[1];
      const token = String(parsed.query?.token || "");
      const inviteCode = parsed.query?.inviteCode ? String(parsed.query.inviteCode) : undefined;

      const userId = verifyAccessToken(token);
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const allowed = await canJoinRoom(roomId, userId, inviteCode);
      if (!allowed) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      (wss as any).handleUpgrade(request, socket as any, head, (ws: WebSocket) => {
        setupWSConnection(ws as any, request as any, { gc: true });
      });
    } catch (e) {
      try {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      } catch {}
    }
  });

  return wss;
}
