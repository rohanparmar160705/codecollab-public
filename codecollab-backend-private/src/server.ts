// src/server.ts
import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";

import { app, registerRoutes } from "./app";
import { ENV } from "./config/env";
import { logger } from "./utils/logger";
import { ensureCompilerImages } from "./services/docker.service";
// Start execution worker in-process (dev-friendly). In production you can run this as a separate process.
import "./modules/execution/execution.worker";
import { registerCollabGateway } from "./modules/collab/collab.gateway";
import { attachYjsWebsocket } from "./realtime/yjsServer";
import { registerExecutionEvents } from "./modules/execution/execution.events";

const PORT = ENV.PORT || 5000;

// ✅ Create HTTP server (required for socket.io)
const httpServer = createServer(app);

// ✅ Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ENV.CORS_ORIGINS.split(",").map((url) => url.trim()),
    credentials: true,
  },
});

// ✅ Check compiler images then register routes and start server
(async () => {
  try {
    await ensureCompilerImages();
    // Register BullMQ -> Socket.IO execution event bridge
    registerExecutionEvents(io);
    registerRoutes(app, io);
    // Register collaboration socket handlers
    registerCollabGateway(io);
    // Attach Yjs WebSocket for CRDT collaboration
    attachYjsWebsocket(httpServer);
    httpServer.listen(PORT, () => {
      logger.info(`✅ ${ENV.APP_NAME} running on port ${PORT} (${ENV.NODE_ENV})`);
      logger.info(`🌐 API URL: ${ENV.APP_URL}`);
    });
  } catch (err: any) {
    logger.error("Failed startup checks: " + err.message);
    process.exit(1);
  }
})();

// ✅ Handle socket connections (optional base setup)
io.on("connection", (socket) => {
  logger.info(`⚡ User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`❌ User disconnected: ${socket.id}`);
  });
});

// ✅ Graceful shutdown handling
process.on("SIGINT", () => {
  logger.warn("🛑 Server shutting down (SIGINT)...");
  httpServer.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  logger.warn("🛑 Server shutting down (SIGTERM)...");
  httpServer.close(() => process.exit(0));
});
