import { api } from "./apiClient";

export const getProfile = async () => (await api.get("/users/profile")).data;
export const updateProfile = async (payload: { username?: string; email?: string; avatarUrl?: string }) =>
  (await api.put("/users/profile", payload)).data;
export const getUserRooms = async (userId: string) => (await api.get(`/users/${userId}/rooms`)).data;
export const getUsers = async () => (await api.get("/users")).data;
export const assignRole = async (payload: { userId: string; roleId: string }) =>
  (await api.post("/users/assign-role", payload)).data;
