// src/modules/analytics/analytics.controller.ts
import { Request, Response } from "express";
import prisma from "../../config/prisma";

export const AnalyticsController = {
  // 📊 Get overview analytics
  async getOverview(req: Request, res: Response) {
    try {
      const [totalUsers, totalRooms, totalExecutions] = await Promise.all([
        prisma.user.count(),
        prisma.room.count(),
        prisma.execution.count(),
      ]);

      // Aggregate daily executions for last 7 days
      const dailyExecutionsRaw = await prisma.$queryRaw<
        { date: string; count: number }[]
      >`
        SELECT DATE("createdAt") as date, COUNT(id)::int as count
        FROM "Execution"
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") DESC
        LIMIT 7;
      `;

      // Language distribution
      const topLanguages = await prisma.execution.groupBy({
        by: ["language"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      });

      // Most active rooms
      const activeRooms = await prisma.room.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, updatedAt: true },
      });

      return res.status(200).json({
        success: true,
        data: {
          totals: { totalUsers, totalRooms, totalExecutions },
          dailyExecutions: dailyExecutionsRaw.reverse(), // oldest → newest
          topLanguages: topLanguages.map((l : any) => ({
            language: l.language,
            count: l._count.id,
          })),
          activeRooms,
        },
      });
    } catch (error) {
      console.error("❌ Analytics Error:", error);
      res.status(500).json({ success: false, message: "Analytics failed" });
    }
  },
};
