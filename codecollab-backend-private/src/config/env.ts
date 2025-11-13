// src/config/env.ts
import * as dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV!,
  PORT: Number(process.env.PORT!),
  APP_NAME: process.env.APP_NAME!,
  APP_URL: process.env.APP_URL!,
  CLIENT_URLS: process.env.CLIENT_URLS!,
  DATABASE_URL: process.env.DATABASE_URL!,

  // 🔐 JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN!,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN!,

  // 🧠 Redis
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: process.env.REDIS_PORT!,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD!,
  REDIS_URL: process.env.REDIS_URL!,

  // 📧 Mail
  MAIL_HOST: process.env.MAIL_HOST!,
  MAIL_PORT: Number(process.env.MAIL_PORT!),
  MAIL_USER: process.env.MAIL_USER!,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD!,
  MAIL_FROM: process.env.MAIL_FROM!,
  MAIL_SECURE: process.env.MAIL_SECURE === "true",

  // 📧 Password Reset / Client App URLs
  CLIENT_RESET_URL: process.env.CLIENT_RESET_URL!,

  // ⚙️ Logging & CORS
  LOG_LEVEL: process.env.LOG_LEVEL!,
  CORS_ORIGINS: process.env.CORS_ORIGINS!,

  // 🧱 Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS!,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS!,

  // 🪲 Sentry Monitoring (optional)
  SENTRY_DSN: process.env.SENTRY_DSN || "",
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || "0",

  // 💳 Razorpay Integration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET!,

  // ⚙️ Execution Engine Config (NEW)
  EXECUTION_TIMEOUT: Number(process.env.EXECUTION_TIMEOUT!) || 10000, // ms
  QUEUE_RETRY_LIMIT: Number(process.env.QUEUE_RETRY_LIMIT!) || 3,
  DOCKER_IMAGE_NODE: process.env.DOCKER_IMAGE_NODE || "node:18",
  DOCKER_IMAGE_PYTHON: process.env.DOCKER_IMAGE_PYTHON || "python:3.11",
  DOCKER_IMAGE_CPP: process.env.DOCKER_IMAGE_CPP || "gcc:latest",
  DOCKER_IMAGE_JAVA: process.env.DOCKER_IMAGE_JAVA || "openjdk:17",
};
