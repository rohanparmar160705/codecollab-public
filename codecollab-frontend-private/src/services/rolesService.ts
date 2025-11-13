import { api } from "./apiClient";

export const createRole = async (payload: { name: string; description?: string }) => (await api.post("/roles", payload)).data;
export const listRoles = async () => (await api.get("/roles")).data;
export const assignPermission = async (payload: { roleId: string; permissionId: string }) => (await api.post("/roles/assign-permission", payload)).data;
export const setParentRole = async (payload: { roleId: string; parentRoleId: string }) => (await api.post("/roles/set-parent", payload)).data;
export const getRoleHierarchy = async () => (await api.get("/roles/hierarchy")).data;
