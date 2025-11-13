import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { verifyToken } from "../../middlewares/auth.middleware";

export default (io: any) => {
  const router = Router();
  const notificationService = new NotificationService(io);
  const notificationController = new NotificationController(notificationService);

  router.get("/", verifyToken, (req, res) =>
    notificationController.getUserNotifications(req, res)
  );
  router.patch("/:id/read", verifyToken, (req, res) =>
    notificationController.markAsRead(req, res)
  );
  router.delete("/clear", verifyToken, (req, res) =>
    notificationController.clearAll(req, res)
  );

  return router;
};
