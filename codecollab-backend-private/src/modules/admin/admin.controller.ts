// src/modules/admin/admin.controller.ts
import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import prisma from "../../config/prisma";

const adminService = new AdminService();

export class AdminController {
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await adminService.getAllUsers();
      res.json({ success: true, count: users.length, data: users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  }

  async getAllRooms(req: Request, res: Response) {
    try {
      const rooms = await adminService.getAllRooms();
      res.json({ success: true, count: rooms.length, data: rooms });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch rooms" });
    }
  }

  async getAllSubscriptions(req: Request, res: Response) {
    try {
      const subs = await adminService.getAllSubscriptions();
      res.json({ success: true, count: subs.length, data: subs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch subscriptions" });
    }
  }

  async getExecutions(req: Request, res: Response) {
    try {
      const data = await adminService.getExecutions();
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch executions" });
    }
  }

  async getMetrics(_req: Request, res: Response) {
    try {
      const data = await adminService.getMetrics();
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch metrics" });
    }
  }

  async listRoles(_req: Request, res: Response) {
    try {
      const roles = await prisma.role.findMany({ include: { rolePermissions: { include: { permission: true } } } });
      res.json({ success: true, count: roles.length, data: roles });
    } catch (e) {
      res.status(500).json({ success: false, message: "Failed to fetch roles" });
    }
  }

  async createRole(req: Request, res: Response) {
    try {
      const { name, description, isDefault, parentRoleId } = req.body || {};
      if (!name) return res.status(400).json({ message: "name required" });
      const role = await prisma.role.create({ data: { name, description, isDefault: !!isDefault, parentRoleId: parentRoleId || null } });
      res.status(201).json({ success: true, data: role });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e?.message || "Failed to create role" });
    }
  }

  async assignPermissions(req: Request, res: Response) {
    try {
      const roleId = req.params.id;
      const { permissions } = req.body as { permissions: { action: string; resource: string }[] };
      if (!Array.isArray(permissions)) return res.status(400).json({ message: "permissions[] required" });
      // ensure permission records exist
      for (const p of permissions) {
        const perm = await prisma.permission.upsert({
          where: { action_resource: { action: p.action, resource: p.resource } as any },
          update: {},
          create: { action: p.action, resource: p.resource },
        });
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: perm.id } },
          update: {},
          create: { roleId, permissionId: perm.id },
        });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: "Failed to assign permissions" });
    }
  }

  async assignUserRole(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const { roleId } = req.body || {};
      if (!roleId) return res.status(400).json({ message: "roleId required" });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: {},
        create: { userId, roleId },
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: "Failed to assign user role" });
    }
  }
}
