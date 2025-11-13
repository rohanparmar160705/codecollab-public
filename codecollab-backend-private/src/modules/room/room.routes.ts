// src/modules/room/room.routes.ts
import { Router } from "express";
import { RoomController } from "./room.controller";
import { verifyToken } from "../../middlewares/auth.middleware";
import { checkPermission } from "../../middlewares/permission.middleware";
import { limitPerWindow } from "../../middlewares/tokenBucket.middleware";

const router = Router();

// CRUD
router.post(
  "/",
  verifyToken,
  checkPermission("create", "rooms"),
  limitPerWindow({
    key: (req) => `room:create:${(req as any).user?.id || "anon"}`,
    windowSec: 24 * 60 * 60,
    max: 3,
  }),
  RoomController.create
);
router.get("/", verifyToken, checkPermission("read", "rooms"), RoomController.getAll);
router.get("/:id", verifyToken, checkPermission("read", "rooms"), RoomController.getById);
router.delete("/:id", verifyToken, checkPermission("delete", "rooms"), RoomController.delete);

// Join / Leave
router.post("/join", verifyToken, RoomController.join);
router.post("/leave", verifyToken, RoomController.leave);

// Content autosave
router.post("/:id/content", verifyToken, RoomController.saveContent);

// Visibility & sharing
router.put("/:id/visibility", verifyToken, checkPermission("update", "rooms"), RoomController.setVisibility);
router.get("/:id/share", verifyToken, checkPermission("read", "rooms"), RoomController.getShare);

export default router;
