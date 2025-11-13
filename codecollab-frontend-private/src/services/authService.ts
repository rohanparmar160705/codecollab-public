import { api, setAccessToken, setRefreshToken } from "./apiClient";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { username: string; email: string; password: string };

function normalizeAuthResponse(raw: any) {
  const outer = raw || {};
  const d = outer.data ?? outer; // support {data:{...}} or flat
  const user = d.user ?? outer.user ?? null;
  const accessToken = d.accessToken ?? outer.accessToken ?? d.token ?? outer.token ?? null;
  const refreshToken = d.refreshToken ?? outer.refreshToken ?? null;
  return { user, accessToken, refreshToken, raw: outer };
}

export const login = async (payload: LoginPayload) => {
  const res = await api.post("/auth/login", payload);
  const norm = normalizeAuthResponse(res.data);
  if (norm.accessToken) setAccessToken(norm.accessToken);
  if (norm.refreshToken) setRefreshToken(norm.refreshToken);
  return norm;
};

export const register = async (payload: RegisterPayload) => {
  const res = await api.post("/auth/register", payload);
  const norm = normalizeAuthResponse(res.data);
  if (norm.accessToken) setAccessToken(norm.accessToken);
  if (norm.refreshToken) setRefreshToken(norm.refreshToken);
  return norm;
};

export const refreshToken = async (refreshToken: string) => {
  const res = await api.post("/auth/refresh-token", { refreshToken });
  const norm = normalizeAuthResponse(res.data);
  if (norm.accessToken) setAccessToken(norm.accessToken);
  return norm;
};

// --- OAuth helpers ---
export type OAuthProvider = "google" | "github";

export async function getOAuthUrl(provider: OAuthProvider): Promise<string> {
  const { data } = await api.get(`/auth/oauth/${provider}/url`, { params: { state: 'popup' } });
  return data?.url || data;
}

function openPopup(url: string, title: string, w = 520, h = 640) {
  const dualLeft = (window.screenLeft ?? window.screenX ?? 0);
  const dualTop = (window.screenTop ?? window.screenY ?? 0);
  const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;
  const left = width / 2 - w / 2 + dualLeft;
  const top = height / 2 - h / 2 + dualTop;
  return window.open(url, title, `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`);
}

export async function oauthPopupLogin(provider: OAuthProvider): Promise<{ accessToken?: string }> {
  const url = await getOAuthUrl(provider);
  const popup = openPopup(url, `Sign in with ${provider.toUpperCase()}`);
  return new Promise((resolve, reject) => {
    function onMsg(ev: MessageEvent) {
      try {
        const data = ev.data || {};
        if (data && data.type === 'oauth:success') {
          if (data.accessToken) setAccessToken(data.accessToken);
          if (data.refreshToken) setRefreshToken(data.refreshToken);
          try { popup?.close(); } catch {}
          window.removeEventListener('message', onMsg);
          resolve({ accessToken: data.accessToken });
        }
      } catch {}
    }
    window.addEventListener('message', onMsg);
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', onMsg);
          return reject(new Error("Popup closed"));
        }
        const href = popup.location.href;
        // Expect backend to redirect to FRONTEND_URL/oauth/callback?token=...&refreshToken=...
        if (href.includes("/oauth/callback")) {
          const urlObj = new URL(href);
          const token = urlObj.searchParams.get("token") || urlObj.searchParams.get("accessToken");
          const rt = urlObj.searchParams.get("refreshToken");
          if (token) setAccessToken(token);
          if (rt) setRefreshToken(rt);
          try { popup.close(); } catch {}
          clearInterval(timer);
          window.removeEventListener('message', onMsg);
          resolve({ accessToken: token ?? undefined });
        }
      } catch {
        // ignore cross-origin until redirected back
      }
    }, 400);
  });
}
