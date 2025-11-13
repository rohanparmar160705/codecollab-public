// src/middlewares/admin.middleware.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id; // assume verifyToken ran before
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Check for ADMIN role
    const userRole = await prisma.userRole.findFirst({
      where: { userId, role: { name: "ADMIN" } },
      include: { role: true },
    });

    if (!userRole) {
      // Fallback: treat user as admin if they possess read permissions on admin resources
      const roles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
        },
      });
      const hasAdminishPermission = roles.some((ur: any) =>
        ur.role.rolePermissions.some((rp: any) =>
          rp.permission.action === "read" && ["users", "rooms", "subscriptions"].includes(rp.permission.resource)
        )
      );
      if (!hasAdminishPermission) {
        return res.status(403).json({ message: "Forbidden: Admin access only" });
      }
    }

    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
