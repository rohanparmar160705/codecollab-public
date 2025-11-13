import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";

export const setParent = async (roleId: string, parentRoleId: string) => {
  if (roleId === parentRoleId)
    throw new AppError("A role cannot be its own parent", 400);

  const parent = await prisma.role.findUnique({ where: { id: parentRoleId } });
  if (!parent) throw new AppError("Parent role not found", 404);

  // ✅ use parentRoleId field instead of nested connect
  return prisma.role.update({
    where: { id: roleId },
    data: { parentRoleId },
  });
};

export const getHierarchy = async () => {
  // ✅ minimal include to avoid Prisma recursion type issues
  return prisma.role.findMany({
    include: {
      subRoles: true,
    },
  });
};
