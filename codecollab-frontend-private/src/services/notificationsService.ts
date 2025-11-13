import { api } from "./apiClient";

export const listNotifications = async () => (await api.get("/notifications")).data;
export const markRead = async (notificationId: string) => (await api.patch(`/notifications/${notificationId}/read`)).data;
export const clearAll = async () => (await api.delete("/notifications/clear")).data;
