import { api } from "./apiClient";

export const listFiles = async (roomId: string) => (await api.get(`/files/rooms/${roomId}/files`)).data;
export const createFile = async (roomId: string, payload: { name: string; content: string; path: string }) =>
  (await api.post(`/files/rooms/${roomId}/files`, payload)).data;
export const getFile = async (id: string) => (await api.get(`/files/${id}`)).data;
export const updateFile = async (id: string, payload: { name?: string; content?: string; path?: string }) =>
  (await api.put(`/files/${id}`, payload)).data;
export const deleteFile = async (id: string) => (await api.delete(`/files/${id}`)).data;

export const createSnapshot = async (id: string, payload: { code: string; language: string; description?: string }) =>
  (await api.post(`/files/${id}/snapshots`, payload)).data;
export const listSnapshots = async (id: string) => (await api.get(`/files/${id}/snapshots`)).data;
