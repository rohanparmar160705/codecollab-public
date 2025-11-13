// src/modules/file/file.routes.ts
import { Router } from "express";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { verifyToken } from "../../middlewares/auth.middleware";

/**
 * Exports a function that accepts io instance and returns configured router.
 * Register in app via: app.use("/api/files", createFileRoutes(io));
 */
export default (io: any) => {
  const router = Router();
  const service = new FileService(io);
  const controller = new FileController(service);

  // Room scoped file creation & listing
  router.post("/rooms/:roomId/files", verifyToken, (req, res, next) =>
    controller.create(req, res, next)
  );
  router.get("/rooms/:roomId/files", verifyToken, (req, res, next) =>
    controller.list(req, res, next)
  );

  // File direct endpoints
  router.get("/:id", verifyToken, (req, res, next) => controller.getById(req, res, next));
  router.put("/:id", verifyToken, (req, res, next) => controller.update(req, res, next));
  router.delete("/:id", verifyToken, (req, res, next) => controller.delete(req, res, next));

  // Snapshots
  router.post("/:id/snapshots", verifyToken, (req, res, next) =>
    controller.createSnapshot(req, res, next)
  );
  router.get("/:id/snapshots", verifyToken, (req, res, next) =>
    controller.listSnapshots(req, res, next)
  );

  return router;
};
