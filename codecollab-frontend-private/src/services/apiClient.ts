import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Token persistence in localStorage for simplicity
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || "";
export const setAccessToken = (token: string) => {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
};
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) || "";
export const setRefreshToken = (token: string) => {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    const hdrs = (config.headers || {}) as any;
    hdrs.Authorization = `Bearer ${token}`;
    config.headers = hdrs;
  }
  return config;
});

let isRefreshing = false as boolean;
let refreshQueue: Array<{ resolve: () => void; reject: (e: any) => void }> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status;
    if (status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      await new Promise<void>((resolve, reject) => refreshQueue.push({ resolve, reject }));
      original._retry = true;
      return api(original);
    }

    isRefreshing = true;
    original._retry = true;
    try {
      const rt = getRefreshToken();
      if (!rt) throw new Error("No refresh token");
      const { data } = await api.post("/auth/refresh-token", { refreshToken: rt });
      const newAccess = data?.accessToken || data?.token;
      const newRefresh = data?.refreshToken || rt;
      if (newAccess) setAccessToken(newAccess);
      if (newRefresh) setRefreshToken(newRefresh);
      refreshQueue.forEach((q) => q.resolve());
      refreshQueue = [];
      return api(original);
    } catch (e) {
      refreshQueue.forEach((q) => q.reject(e));
      refreshQueue = [];
      setAccessToken("");
      setRefreshToken("");
      try { window.location.href = "/login"; } catch {}
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
