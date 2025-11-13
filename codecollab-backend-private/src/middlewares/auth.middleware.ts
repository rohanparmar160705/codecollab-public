import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError";
import { ENV } from "../config/env";
import prisma from "../config/prisma";
import { BillingGuard } from "../modules/billing/billing.guard";

// ✅ 1. authenticate middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];

  try {
    // ✅ FIX #1: changed env → ENV
    const payload: any = jwt.verify(token, ENV.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return res.status(401).json({ message: "Invalid user" });

    // ✅ store user object in request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ 2. permission middleware
export const checkPermission = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // In non-production environments, bypass permission checks to enable local/dev testing
    if ((process.env.NODE_ENV || "development") !== "production") {
      return next();
    }
    const user = req.user;

    // ✅ FIX #2: added optional chaining + type-safe casting for userRoles
    const hasPermission = (user as any)?.userRoles?.some((ur: any) =>
      ur.role.rolePermissions.some(
        (rp: any) =>
          rp.permission.action === action &&
          rp.permission.resource === resource
      )
    );

    if (!hasPermission)
      return res.status(403).json({ message: "Access denied" });

    next();
  };
};

// Reuse authenticate so req.user is the full user entity resolved from token.userId
export const verifyToken = authenticate;

export const authenticateWithSubscription = [
  authenticate,
  BillingGuard,
];