import { api } from "./apiClient";

export const listPermissions = async () => (await api.get("/permissions")).data;
export const createPermission = async (payload: { action: string; resource: string; description?: string }) => (await api.post("/permissions", payload)).data;
export const deletePermission = async (id: string) => (await api.delete(`/permissions/${id}`)).data;
