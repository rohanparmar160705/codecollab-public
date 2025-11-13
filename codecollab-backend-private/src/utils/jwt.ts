// src/utils/jwt.ts
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { ENV } from "../config/env";

// Ensure ENV values exist (optional) or provide defaults in ENV module
const ACCESS_SECRET: Secret = ENV.JWT_ACCESS_SECRET as Secret;
const REFRESH_SECRET: Secret = ENV.JWT_REFRESH_SECRET as Secret;
const ACCESS_EXPIRES = (ENV.JWT_ACCESS_EXPIRES_IN as string) || "24h";
const REFRESH_EXPIRES = (ENV.JWT_REFRESH_EXPIRES_IN as string) || "30d";

export function signAccessToken(payload: object) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as SignOptions);
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as SignOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET);
}
