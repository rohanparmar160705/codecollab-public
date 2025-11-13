// src/modules/permission/permission.routes.ts
import { Router } from "express";
import { PermissionController } from "./permission.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { checkPermission } from "../../middlewares/permission.middleware"; 

const router = Router();

// All permission routes are admin-protected
router.get(
  "/",
  authenticate,
  checkPermission("read", "permissions"),
  PermissionController.getAll
);

router.post(
  "/",
  authenticate,
  checkPermission("create", "permissions"),
  PermissionController.create
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("delete", "permissions"),
  PermissionController.remove
);

export default router;
