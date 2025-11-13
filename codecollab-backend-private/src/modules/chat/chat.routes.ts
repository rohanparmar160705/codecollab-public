// src/modules/chat/chat.routes.ts
import { Router } from "express";
import prisma from "../../config/prisma";
import { verifyToken } from "../../middlewares/auth.middleware";

const router = Router();

// GET /api/chat/:roomId - fetch recent chat history
router.get("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id as string;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const member = await prisma.roomMember.findFirst({ where: { roomId, userId } });
    const isOwner = !!(await prisma.room.findFirst({ where: { id: roomId, ownerId: userId } }));
    if (!member && !isOwner) return res.status(403).json({ message: "Forbidden" });

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        text: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
      },
    });

    return res.json({ success: true, data: messages.reverse() });
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to fetch chat" });
  }
});

export default router;
