import { api } from "./apiClient";

export type AnalyticsOverview = {
  totals: { totalUsers: number; totalRooms: number; totalExecutions: number };
  dailyExecutions: { date: string; count: number }[];
  topLanguages: { language: string; count: number }[];
  activeRooms: { id: string; name: string; updatedAt: string }[];
};

export async function getOverview(): Promise<AnalyticsOverview> {
  const { data } = await api.get("/analytics/overview");
  // controller returns { success, data }
  return (data?.data ?? data) as AnalyticsOverview;
}
