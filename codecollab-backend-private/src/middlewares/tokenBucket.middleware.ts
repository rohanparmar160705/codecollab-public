// src/middlewares/tokenBucket.middleware.ts
import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

/**
 * Simple Redis token bucket per key with sliding window emulation.
 * Uses INCR with TTL per window to cap events.
 */
export function limitPerWindow({ key, windowSec, max }: { key: (req: Request) => string; windowSec: number; max: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const k = key(req);
      if (!k) return next();
      const nowBucket = Math.floor(Date.now() / 1000 / windowSec);
      const redisKey = `rl:${nowBucket}:${k}`;
      const n = await redis.incr(redisKey);
      if (n === 1) {
        await redis.expire(redisKey, windowSec);
      }
      if (n > max) {
        const ttl = await redis.ttl(redisKey);
        res.setHeader("Retry-After", String(ttl > 0 ? ttl : windowSec));
        return res.status(429).json({ message: "Rate limit exceeded" });
      }
      return next();
    } catch (e) {
      return next();
    }
  };
}
