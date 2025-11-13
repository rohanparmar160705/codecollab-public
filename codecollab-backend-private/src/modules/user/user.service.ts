// src/modules/user/user.service.ts
import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";

export class UserService {
  // ✅ Get user profile (with roles & permissions)
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  // ✅ Get all users (for admin dashboard)
  static async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });
  }

  // ✅ Update profile fields (username, email, avatar, password)
  static async updateProfile(
    userId: string,
    data: {
      username?: string;
      password?: string;
      avatarUrl?: string;
      email?: string;
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    // Don't directly accept raw "password" -> hash it in caller or here if you prefer.
    // If password is provided, caller should send hashed password OR you can hash here.
    // Here we allow update of username, avatarUrl, email and if password provided we expect hashed value.
    const updateData: Record<string, any> = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;
    if (data.password) updateData.passwordHash = data.password;

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  // ✅ Assign a role to a user
  static async assignRole(userId: string, roleId: string) {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new AppError("User not found", 404);
    if (!role) throw new AppError("Role not found", 404);

    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId },
    });
    if (existing) throw new AppError("User already has this role", 400);

    await prisma.userRole.create({ data: { userId, roleId } });
    return { message: "Role assigned successfully" };
  }

  // 🆕 Get all rooms a user is part of
  static async getUserRooms(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            room: {
              include: {
                owner: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new AppError("User not found", 404);

    return user.memberships.map((m: any) => ({
      id: m.room.id,
      name: m.room.name,
      owner: m.room.owner,
      createdAt: m.room.createdAt,
    }));
  }
}
