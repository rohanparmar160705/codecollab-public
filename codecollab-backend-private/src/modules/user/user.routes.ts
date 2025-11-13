// src/modules/user/user.routes.ts
import { Router } from "express";
import { UserController } from "./user.controller";
import { verifyToken } from "../../middlewares/auth.middleware";
import { checkPermission } from "../../middlewares/permission.middleware";

const router = Router();

// 🔒 All user routes require authentication
router.use(verifyToken);

// 👤 Current user
router.get("/profile", UserController.getProfile);
router.put("/profile", UserController.updateProfile);

// 🧩 New: Fetch rooms of a specific user
router.get("/:id/rooms", checkPermission("read", "rooms"), UserController.getUserRooms);

// 🧑‍💼 Admin endpoints
router.get("/", checkPermission("read", "users"), UserController.getAll);
router.post("/assign-role", checkPermission("update", "roles"), UserController.assignRole);

export default router;
