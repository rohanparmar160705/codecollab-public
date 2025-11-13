// src/middlewares/rateLimiter.middleware.ts
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import { AppError } from "../utils/appError";
import { ENV } from "../config/env";

// ✅ Redis client for distributed rate limiting
const redisClient = createClient({
  url: ENV.REDIS_URL,
//   legacyMode: true,
});

redisClient.connect().catch((err) => {
  console.error("❌ Redis connection for rate limiter failed:", err);
});

// ✅ Express rate limiter middleware
export const rateLimiter = rateLimit({
  windowMs: Number(ENV.RATE_LIMIT_WINDOW_MS || 60 * 1000), // 1 min
  max: Number(ENV.RATE_LIMIT_MAX_REQUESTS || 100), // Max requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Too many requests, please try again later.", 429));
  },
});
