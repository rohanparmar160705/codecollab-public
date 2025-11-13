import { api } from "./apiClient";

function unwrap<T = any>(res: any): T {
  const outer = res?.data ?? res;
  if (outer && typeof outer === "object" && "data" in outer) return (outer as any).data as T;
  return outer as T;
}

export const listRooms = async () => unwrap<any[]>(await api.get("/rooms")) ?? [];
export const getRoom = async (id: string, inviteCode?: string) =>
  unwrap<any>(await api.get(`/rooms/${id}`, { params: inviteCode ? { inviteCode } : {} }));
export const createRoom = async (payload: { name: string; language: string; description?: string }) =>
  unwrap<any>(await api.post("/rooms", payload));
export const deleteRoom = async (id: string) => unwrap<any>(await api.delete(`/rooms/${id}`));
export const joinRoom = async (payload: { roomId: string; userId: string; inviteCode?: string }) =>
  unwrap<any>(await api.post("/rooms/join", payload));
export const leaveRoom = async (payload: { roomId: string; userId: string }) =>
  unwrap<any>(await api.post("/rooms/leave", payload));

export const saveRoomContent = async (payload: { roomId: string; content: string; language?: string }) =>
  unwrap<any>(await api.post(`/rooms/${payload.roomId}/content`, { content: payload.content, language: payload.language }));

export const setRoomVisibility = async (id: string, isPublic: boolean) =>
  unwrap<any>(await api.put(`/rooms/${id}/visibility`, { public: isPublic }));

export const getRoomShare = async (id: string) => unwrap<any>(await api.get(`/rooms/${id}/share`));
