import { api } from "./apiClient";

export const listChat = async (roomId: string) => (await api.get(`/chat/${roomId}`)).data;
