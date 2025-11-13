import { Request, Response, NextFunction } from "express";
import prisma from "./../config/prisma";
import { AppError } from "../utils/appError";

/**
 * Checks if the logged-in user has the specified action on a resource.
 * Usage: router.post("/create", verifyToken, checkPermission("create", "roles"), handler)
 */
export const checkPermission = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In non-production environments, bypass permission checks for local/dev testing
      if ((process.env.NODE_ENV || "development") !== "production") {
        return next();
      }
      const userId = (req.user as any)?.id;
      if (!userId) throw new AppError("Unauthorized", 401);

      // fetch user roles and permissions (load parent separately)
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      });

      // manually attach parent role permissions if exist
      for (const ur of userRoles) {
        if (ur.role.parentRoleId) {
          const parent = await prisma.role.findUnique({
            where: { id: ur.role.parentRoleId },
            include: {
              rolePermissions: { include: { permission: true } },
            },
          });
          if (parent) (ur.role as any).parentRole = parent;
        }
      }

      const permissions = userRoles.flatMap((r: any) => [
        ...r.role.rolePermissions.map((rp: any) => rp.permission),
        ...(r.role.parentRole
          ? r.role.parentRole.rolePermissions.map((rp: any) => rp.permission)
          : []),
      ]);

      const allowed = permissions.some(
        (p: any) => p.action === action && p.resource === resource
      );

      if (!allowed)
        throw new AppError(
          `You do not have permission to ${action} ${resource}`,
          403
        );

      next();
    } catch (err) {
      next(err);
    }
  };
};
