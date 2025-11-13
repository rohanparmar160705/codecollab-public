import { api } from "./apiClient";

export const listAdminUsers = async () => (await api.get("/admin/users")).data;
export const listAdminRooms = async () => (await api.get("/admin/rooms")).data;
export const listAdminSubscriptions = async () => (await api.get("/admin/subscriptions")).data;
export const listAdminExecutions = async () => (await api.get("/admin/executions")).data;
export const getAdminMetrics = async () => (await api.get("/admin/metrics")).data;

// RBAC management via admin
export const listRolesAdmin = async () => (await api.get("/admin/roles")).data;
export const createRoleAdmin = async (payload: { name: string; description?: string; isDefault?: boolean; parentRoleId?: string }) =>
  (await api.post("/admin/roles", payload)).data;
export const assignRolePermissionsAdmin = async (roleId: string, permissions: { action: string; resource: string }[]) =>
  (await api.post(`/admin/roles/${roleId}/permissions`, { permissions })).data;
export const assignUserRoleAdmin = async (userId: string, roleId: string) => (await api.post(`/admin/users/${userId}/role`, { roleId })).data;
