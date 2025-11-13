// src/modules/execution/execution.routes.ts
import { Router } from "express";
import { ExecutionController } from "./execution.controller";
import { verifyToken } from "../../middlewares/auth.middleware";
import { limitPerWindow } from "../../middlewares/tokenBucket.middleware";

const router = Router();

router.post(
  "/execute",
  verifyToken,
  limitPerWindow({
    key: (req) => `exec:${(req as any).user?.id || "anon"}`,
    windowSec: 60,
    max: 5,
  }),
  ExecutionController.executeCode
);
router.get("/", verifyToken, ExecutionController.list);
router.get("/:id", verifyToken, ExecutionController.getById);

export default router;
