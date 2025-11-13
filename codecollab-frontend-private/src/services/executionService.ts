import { api } from "./apiClient";

export const executeCode = async (payload: { code: string; language: string; input?: string; roomId?: string }) =>
  (await api.post("/execution/execute", payload)).data;
export const listExecutions = async () => (await api.get("/execution")).data;
export const getExecution = async (id: string) => (await api.get(`/execution/${id}`)).data;
