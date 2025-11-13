import { Request, Response, NextFunction } from "express";
import * as RoleHierarchyService from "./roleHierarchy.service";
import { success } from "../../utils/response";

export const RoleHierarchyController = {
  async setParent(req: Request, res: Response, next: NextFunction) {
    try {
      const { roleId, parentRoleId } = req.body;
      const updated = await RoleHierarchyService.setParent(roleId, parentRoleId);
      return success(res, "Parent role updated successfully", updated);
    } catch (err) {
      next(err);
    }
  },

  async getHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      const hierarchy = await RoleHierarchyService.getHierarchy();
      return success(res, "Role hierarchy fetched successfully", hierarchy);
    } catch (err) {
      next(err);
    }
  },
};
