/**
 * ✅ Billing Guard
 * Protects routes that require an active paid subscription.
 */

import { Request, Response, NextFunction } from "express";
import prisma from "../../config/prisma";

export const BillingGuard = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id; // 👈 fixed cast

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
      endDate: { gt: new Date() },
    },
  });

  if (!activeSub)
    return res.status(403).json({ message: "No active subscription found" });

  next();
};
