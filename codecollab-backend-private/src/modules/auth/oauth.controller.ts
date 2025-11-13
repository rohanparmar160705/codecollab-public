// src/modules/auth/oauth.controller.ts
import { Request, Response } from "express";
import prisma from "../../config/prisma";
import { ENV } from "../../config/env";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";

const PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${ENV.APP_URL}/api/auth/oauth/google/callback`,
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    emailsUrl: "https://api.github.com/user/emails",
    scope: "read:user user:email",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    redirectUri: process.env.GITHUB_REDIRECT_URI || `${ENV.APP_URL}/api/auth/oauth/github/callback`,
  },
} as const;

type ProviderName = keyof typeof PROVIDERS;

export const OAuthController = {
  url(req: Request, res: Response) {
    const provider = (req.params.provider || "").toLowerCase() as ProviderName;
    if (!PROVIDERS[provider]) return res.status(400).json({ message: "Unsupported provider" });
    const cfg = PROVIDERS[provider];
    const state = encodeURIComponent(String(req.query.state || ""));
    if (provider === "google") {
      const url = `${cfg.authUrl}?response_type=code&client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&scope=${encodeURIComponent(cfg.scope)}&access_type=offline&prompt=consent&state=${state}`;
      return res.json({ url });
    }
    if (provider === "github") {
      const url = `${cfg.authUrl}?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&scope=${encodeURIComponent(cfg.scope)}&state=${state}`;
      return res.json({ url });
    }
  },

  async callback(req: Request, res: Response) {
    const provider = (req.params.provider || "").toLowerCase() as ProviderName;
    if (!PROVIDERS[provider]) return res.status(400).json({ message: "Unsupported provider" });
    const code = String(req.query.code || "");
    if (!code) return res.status(400).json({ message: "Missing code" });
    const cfg = PROVIDERS[provider];
    const state = String(req.query.state || "");

    try {
      let accessToken = "";
      if (provider === "google") {
        const r = await fetch(cfg.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            redirect_uri: cfg.redirectUri,
            grant_type: "authorization_code",
          }) as any,
        });
        const tok = await r.json();
        accessToken = tok.access_token;
        if (!accessToken) throw new Error("Google token exchange failed");
        const ur = await fetch(cfg.userUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        const profile: any = await ur.json();
        const email = profile.email;
        const providerId = profile.id || profile.sub;
        const avatarUrl = profile.picture;
        const username = profile.name || email?.split("@")[0] || `user_${providerId}`;
        const user = await upsertOAuthUser({ provider: "google", providerId: String(providerId), email, username, avatarUrl, accessToken });
        return issueTokens(res, user, state);
      }

      if (provider === "github") {
        const r = await fetch(cfg.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            code,
            redirect_uri: cfg.redirectUri,
          }),
        });
        const tok = await r.json();
        accessToken = tok.access_token;
        if (!accessToken) throw new Error("GitHub token exchange failed");
        const ur = await fetch(cfg.userUrl, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } });
        const profile: any = await ur.json();
        let email = profile.email;
        if (!email) {
          const er = await fetch((PROVIDERS.github as any).emailsUrl, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } });
          const emails: any[] = await er.json();
          const primary = emails.find((e) => e.primary) || emails[0];
          email = primary?.email;
        }
        const providerId = profile.id;
        const avatarUrl = profile.avatar_url;
        const username = profile.login || email?.split("@")[0] || `gh_${providerId}`;
        const user = await upsertOAuthUser({ provider: "github", providerId: String(providerId), email, username, avatarUrl, accessToken });
        return issueTokens(res, user, state);
      }

      return res.status(400).json({ message: "Unsupported provider" });
    } catch (e: any) {
      console.error("OAuth callback error:", e);
      return res.status(500).json({ message: "OAuth failed", error: e?.message });
    }
  },
};

async function upsertOAuthUser(params: { provider: string; providerId: string; email?: string; username: string; avatarUrl?: string; accessToken: string }) {
  const { provider, providerId, email, username, avatarUrl, accessToken } = params;
  // Ensure OAuthAccount exists, create user if needed
  let account = await prisma.oAuthAccount.findUnique({ where: { provider_providerId: { provider, providerId } } as any });
  if (account) {
    // update token
    account = await prisma.oAuthAccount.update({ where: { id: account.id }, data: { accessToken } });
    const user = await prisma.user.findUnique({ where: { id: account.userId } });
    return user!;
  }

  // Create user if no account found. Prefer existing email if present.
  let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) {
    user = await prisma.user.create({ data: { username, email: email || `${provider}_${providerId}@example.com`, avatarUrl, emailVerified: !!email } });
  }
  await prisma.oAuthAccount.create({ data: { provider, providerId, userId: user.id, accessToken } });
  return user;
}

function issueTokens(res: Response, user: any, state?: string) {
  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id });
  // If popup mode requested via state=popup, render HTML to post tokens to opener
  if (state === 'popup') {
    const html = `<!DOCTYPE html><html><body><script>(function(){
      try {
        if (window.opener && window.opener.postMessage) {
          window.opener.postMessage({ type: 'oauth:success', accessToken: '${accessToken}', refreshToken: '${refreshToken}' }, '*');
        }
      } catch(e) {}
      try { window.close(); } catch(e) {}
    })();</script><p>Authenticated. You can close this window.</p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }
  return res.json({ success: true, data: { accessToken, refreshToken, user } });
}
