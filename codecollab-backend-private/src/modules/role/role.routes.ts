// src/modules/role/role.routes.ts
import { Router } from "express";
import { RoleController } from "./role.controller";
import { RoleHierarchyController } from "./roleHierarchy.controller";
import { RoleService } from "./role.service";
import { success } from "../../utils/response";
import { verifyToken } from "../../middlewares/auth.middleware";
import { checkPermission } from "../../middlewares/permission.middleware";

const router = Router();

// ✅ Apply authentication globally
router.use(verifyToken);

// 🧩 Basic Role CRUD routes
router.post(
  "/",
  checkPermission("create", "roles"),
  RoleController.create
);

router.get(
  "/",
  checkPermission("read", "roles"),
  RoleController.getAll
);

// 🧩 Assign permission to role
router.post(
  "/assign-permission",
  checkPermission("update", "permissions"),
  async (req, res, next) => {
    try {
      const { roleId, permissionId } = req.body;
      const result = await RoleService.assignPermission(roleId, permissionId);
      return success(res, "Permission assigned to role", result);
    } catch (err) {
      next(err);
    }
  }
);

// 🔗 Role Hierarchy Routes
router.post(
  "/set-parent",
  checkPermission("update", "roles"),
  RoleHierarchyController.setParent
);

router.get(
  "/hierarchy",
  checkPermission("read", "roles"),
  RoleHierarchyController.getHierarchy
);

export default router;
