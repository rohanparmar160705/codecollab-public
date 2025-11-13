import { Request, Response, NextFunction } from "express";
import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { success } from "../../utils/response";

class RoleController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await prisma.role.findMany({
        include: { rolePermissions: { include: { permission: true } } },
      });
      return success(res, "Roles fetched successfully", roles);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const existing = await prisma.role.findUnique({ where: { name } });
      if (existing) throw new AppError("Role already exists", 400);

      const role = await prisma.role.create({
        data: { name, description },
      });
      return success(res, "Role created successfully", role);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const role = await prisma.role.update({
        where: { id },
        data: { name, description },
      });
      return success(res, "Role updated successfully", role);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.role.delete({ where: { id } });
      return success(res, "Role deleted successfully", null);
    } catch (err) {
      next(err);
    }
  }
}

export { RoleController };
