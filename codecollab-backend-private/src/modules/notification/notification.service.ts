import  prisma  from "../../config/prisma";
import { NotificationType } from "@prisma/client"; // import enum

export class NotificationService {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  // ✅ Fetch all notifications for a user
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ✅ Mark single notification as read
  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // ✅ Clear all user notifications
  async clearAll(userId: string) {
    await prisma.notification.deleteMany({ where: { userId } });
  }

  // ✅ Create and emit new notification
  async createNotification({
    userId,
    type,
    message,
    refType,
    refId,
  }: {
    userId: string;
    type: NotificationType;
    message: string;
    refType?: string;
    refId?: string;
  }) {
    const notification = await prisma.notification.create({
      data: { userId, type, message, refType, refId },
    });

    // Send real-time event to user
    this.io.to(userId).emit("notification:new", notification);

    return notification;
  }
}
