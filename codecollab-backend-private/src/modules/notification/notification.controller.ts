import { Request, Response } from "express";
import { NotificationService } from "./notification.service";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ✅ Fetch all notifications for logged-in user
  async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const notifications = await this.notificationService.getUserNotifications(userId);
      return res.json({ success: true, notifications });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Mark one notification as read
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const updated = await this.notificationService.markAsRead(id, userId);
      return res.json({ success: true, notification: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Clear all notifications for user
  async clearAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      await this.notificationService.clearAll(userId);
      return res.json({ success: true, message: "All notifications cleared" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
