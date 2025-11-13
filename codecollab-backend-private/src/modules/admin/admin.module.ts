// src/modules/admin/admin.module.ts
import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();

router.get("/users", controller.getAllUsers);
router.get("/rooms", controller.getAllRooms);
router.get("/subscriptions", controller.getAllSubscriptions);
router.get("/executions", controller.getExecutions);
router.get("/metrics", controller.getMetrics);

// RBAC management
router.get("/roles", controller.listRoles);
router.post("/roles", controller.createRole);
router.post("/roles/:id/permissions", controller.assignPermissions);
router.post("/users/:id/role", controller.assignUserRole);

export default router;
