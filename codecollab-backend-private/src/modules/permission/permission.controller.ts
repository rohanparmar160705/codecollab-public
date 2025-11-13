// src/modules/permission/permission.controller.ts
import { Request, Response } from "express";
import { PermissionService } from "./permission.service";

export const PermissionController = {
  async getAll(req: Request, res: Response) {
    const permissions = await PermissionService.getAllPermissions();
    return res.json({ success: true, data: permissions });
  },

  async create(req: Request, res: Response) {
    const { action, resource, description } = req.body;
    if (!action || !resource) {
      return res.status(400).json({ error: "action and resource are required" });
    }
    const permission = await PermissionService.createPermission({
      action,
      resource,
      description,
    });
    return res.status(201).json({ success: true, data: permission });
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await PermissionService.deletePermission(id);
    return res.json({ success: true, message: "Permission deleted" });
  },
};
