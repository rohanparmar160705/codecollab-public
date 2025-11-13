// src/modules/admin/admin.service.ts
import prisma from "../../config/prisma";

export class AdminService {
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        plan: true,
        createdAt: true,
        subscriptions: {
          select: { id: true, plan: true, status: true, endDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAllRooms() {
    return prisma.room.findMany({
      select: {
        id: true,
        name: true,
        owner: { select: { id: true, username: true } },
        language: true,
        isPublic: true,
        createdAt: true,
        members: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAllSubscriptions() {
    return prisma.subscription.findMany({
      select: {
        id: true,
        user: { select: { id: true, username: true, email: true } },
        plan: true,
        status: true,
        startDate: true,
        endDate: true,
        razorpaySubId: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getExecutions() {
    return prisma.execution.findMany({
      select: {
        id: true,
        user: { select: { id: true, username: true, email: true } },
        roomId: true,
        language: true,
        status: true,
        execTimeMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getMetrics() {
    const [users, rooms, execs, subs] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.execution.count(),
      prisma.subscription.count(),
    ]);
    const last24hExecs = await prisma.execution.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    return { users, rooms, executions: execs, subscriptions: subs, last24hExecs };
  }
}
