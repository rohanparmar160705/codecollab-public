// src/modules/role/role.service.ts
import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";

export class RoleService {
  static async createRole(name: string, description?: string) {
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) throw new AppError("Role already exists", 400);
    return await prisma.role.create({ data: { name, description } });
  }

  static async getAllRoles() {
    return await prisma.role.findMany({ include: { rolePermissions: true } });
  }

  static async assignPermission(roleId: string, permissionId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError("Role not found", 404);

    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new AppError("Permission not found", 404);

    await prisma.rolePermission.create({ data: { roleId, permissionId } });
    return { message: "Permission assigned successfully" };
  }
}
