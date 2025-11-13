// src/config/redis.ts
import { createClient } from "redis";
import { ENV } from "./env";

const redis = createClient({
  url: ENV.REDIS_URL,
  socket: {
    host: ENV.REDIS_HOST,
    port: Number(ENV.REDIS_PORT),
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
  password: ENV.REDIS_PASSWORD,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("reconnecting", () => console.log("♻️ Redis reconnecting..."));
redis.on("end", () => console.warn("⚠️ Redis connection closed"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

/**
 * Initialize Redis connection with retry attempts
 */
export const initRedis = async () => {
  try {
    if (!redis.isOpen) await redis.connect();
  } catch (error) {
    console.error("❌ Failed to connect Redis:", error);
    setTimeout(initRedis, 5000);
  }
};

/**
 * Simple ping check to verify Redis connectivity
 */
export const pingRedis = async (): Promise<boolean> => {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
};

// Auto-init on startup
initRedis();

/**
 * ✅ JSON Helper Utilities for Redis
 */
export const redisJSON = {
  async setJSON(key: string, value: any, expireSec?: number) {
    await redis.set(key, JSON.stringify(value));
    if (expireSec) await redis.expire(key, expireSec);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  },
};

/**
 * 🔌 BullMQ-compatible Redis connection (for Worker/Queue)
 */
export const redisConnection = {
  url: ENV.REDIS_URL,
};

export default redis;
