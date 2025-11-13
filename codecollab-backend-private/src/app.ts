// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import compression from "compression";
import cookieParser from "cookie-parser";

import { globalErrorHandler } from "./middlewares/error.middleware";
import { rateLimiter } from "./middlewares/rateLimiter.middleware";
import { ENV } from "./config/env";
import { logger } from "./utils/logger";
import { setupSwagger } from "./config/swagger";


// Route imports (Phase 1: Auth only)
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import roleRoutes from "./modules/role/role.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import permissionRoutes from "./modules/permission/permission.routes";
import roomRoutes from "./modules/room/room.routes";
import executionRoutes from "./modules/execution/execution.routes";
import billingRoutes from "./modules/billing/billing.routes";
import createNotificationRoutes from "./modules/notification/notification.routes";
import createFileRoutes from "./modules/file/file.routes"; // ✅ added
import adminRoutes from "./modules/admin/admin.routes"; // ✅ new
import { verifyAdmin } from "./middlewares/admin.middleware"; // ✅ new
import { authenticate } from "./middlewares/auth.middleware";
import chatRoutes from "./modules/chat/chat.routes";

dotenv.config();

const app = express();

// ========================================================
// 🛡️ Optional Sentry setup (enabled when SENTRY_DSN is set)
// ========================================================
let Sentry: any = null;
try {
  if (ENV.SENTRY_DSN) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      environment: ENV.NODE_ENV,
      tracesSampleRate: Number(ENV.SENTRY_TRACES_SAMPLE_RATE || 0.0),
    });
  }
} catch (e) {
  logger.warn("Sentry not initialized (package missing or DSN not set)");
}

// ========================================================
// 🧱 Core Middlewares
// ========================================================
app.use(
  cors({
    origin: ENV.CORS_ORIGINS.split(",").map((url) => url.trim()),
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan(ENV.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(rateLimiter);

// Sentry request & tracing handlers should be before any routes
if (Sentry) {
  const H = (Sentry as any).Handlers;
  if (H?.requestHandler) {
    app.use(H.requestHandler());
  }
  if (H?.tracingHandler) {
    app.use(H.tracingHandler());
  }
}

// Swagger API docs
setupSwagger(app);
console.log("✅ Swagger docs set up at http://localhost:4000/api/docs");



// ========================================================
// 🌍 Routes
// ========================================================
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    message: "CodeCollab backend running 🚀",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// User routes
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

// Permission routes
app.use("/api/permissions", permissionRoutes);

// Analytics routes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/chat", chatRoutes);

// Admin routes (require auth first, then admin check)
app.use("/api/admin", authenticate, verifyAdmin, adminRoutes); 

// ========================================================
// 🔌 Socket-dependent routes
// ========================================================
export const registerRoutes = (app: express.Application, io: any) => {
  app.use("/api/notifications", createNotificationRoutes(io));
  app.use("/api/files", createFileRoutes(io));
};





// ========================================================
// 🧩 Global Error Handler
// ========================================================
// Attach user context to Sentry (must be after most auth middlewares ran)
if (Sentry) {
  app.use((req, _res, next) => {
    try {
      const user = (req as any).user;
      if (user) {
        Sentry.setUser({ id: String(user.id), email: user.email });
      }
    } catch {}
    next();
  });
  // Sentry error handler before our global error handler
  const H = (Sentry as any).Handlers;
  if (H?.errorHandler) {
    app.use(H.errorHandler());
  }
}

app.use(globalErrorHandler);

export { app };
