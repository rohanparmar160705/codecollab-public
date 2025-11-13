// src/modules/permission/permission.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PermissionService = {
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async createPermission(data: {
    action: string;
    resource: string;
    description?: string;
  }) {
    return prisma.permission.create({ data });
  },

  async deletePermission(id: string) {
    return prisma.permission.delete({
      where: { id },
    });
  },
};
