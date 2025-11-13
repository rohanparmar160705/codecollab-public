// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import fs from "fs";
import path from "path";

/**
 * ==========================================================
 * 🧩 CodeCollab API — Swagger Documentation (Clean Version)
 * ==========================================================
 *
 * This setup ensures:
 *  - Only real REST endpoints are shown.
 *  - No unused webhook (Razorpay webhook removed ✅).
 *  - WebSocket events documented as descriptive section.
 *  - Consistent tags for each module.
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CodeCollab API",
      version: "1.0.0",
      description:
        "Real-time collaborative coding backend (WebSocket, Docker sandbox execution, Redis presence, and Razorpay-based subscription).",
      contact: {
        name: "CodeCollab Dev Team",
        email: "support@codecollab.io",
      },
    },
    servers: [
      {
        url: "http://localhost:4000/api",
        description: "Local Development",
      },
      {
        url: "https://api.codecollab.io/api",
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Use the format: Bearer {token}",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
          },
        },
        AuthRegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Alice" },
            email: { type: "string", format: "email", example: "alice@example.com" },
            password: { type: "string", format: "password", example: "StrongP@ssw0rd" },
          },
        },
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
          example: { email: "alice@example.com", password: "StrongP@ssw0rd" },
        },
        TokenResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
              },
            },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            roles: { type: "array", items: { type: "string" } },
          },
        },
        RoomCreate: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 50 },
            language: { type: "string", default: "javascript" },
            description: { type: "string", nullable: true },
          },
          example: { name: "Team Alpha", language: "typescript", description: "Frontend sprint" },
        },
        Room: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            language: { type: "string" },
            description: { type: "string", nullable: true },
            ownerId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        JoinRoomRequest: {
          type: "object",
          required: ["roomId", "userId"],
          properties: {
            roomId: { type: "string" },
            userId: { type: "string" },
          },
          example: { roomId: "room_123", userId: "user_456" },
        },
        FileCreate: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            content: { type: "string" },
            path: { type: "string" },
          },
          example: { name: "index.ts", content: "console.log('hi')", path: "/src" },
        },
        File: {
          type: "object",
          properties: {
            id: { type: "string" },
            roomId: { type: "string" },
            name: { type: "string" },
            content: { type: "string" },
            path: { type: "string" },
          },
        },
        SnapshotCreate: {
          type: "object",
          required: ["code", "language"],
          properties: {
            code: { type: "string" },
            language: { type: "string" },
            description: { type: "string" },
          },
          example: { code: "print('ok')", language: "python", description: "Working state" },
        },
        ExecutionRequest: {
          type: "object",
          required: ["code", "language"],
          properties: {
            code: { type: "string" },
            language: { type: "string", example: "javascript" },
            input: { type: "string" },
            roomId: { type: "string" },
          },
          example: { code: "console.log(1+1)", language: "javascript", input: "" },
        },
        Execution: {
          type: "object",
          properties: {
            id: { type: "string" },
            jobId: { type: "string" },
            status: { type: "string", example: "queued" },
            output: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        BillingCreateRequest: {
          type: "object",
          required: ["planType"],
          properties: {
            planType: { type: "string", enum: ["FREE", "PRO", "TEAM"], example: "PRO" },
          },
        },
        BillingVerifyRequest: {
          type: "object",
          required: ["razorpay_subscription_id", "razorpay_payment_id", "razorpay_signature"],
          properties: {
            razorpay_subscription_id: { type: "string" },
            razorpay_payment_id: { type: "string" },
            razorpay_signature: { type: "string" },
          },
        },
        Subscription: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            plan: { type: "string" },
            status: { type: "string" },
            currentPeriodEnd: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            type: { type: "string" },
            message: { type: "string" },
            isRead: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        RazorpayWebhookHeaders: {
          type: "object",
          properties: {
            "x-razorpay-signature": { type: "string", description: "HMAC-SHA256 signature" },
            "content-type": { type: "string", example: "application/json" },
          },
        },
        JoinRoomEvent: {
          type: "object",
          properties: {
            userId: { type: "string" },
            username: { type: "string" },
            roomId: { type: "string" },
            roomOwnerId: { type: "string" },
          },
          example: { userId: "u1", username: "alice", roomId: "r1", roomOwnerId: "u0" },
        },
        CodeChangeEvent: {
          type: "object",
          properties: {
            roomId: { type: "string" },
            code: { type: "string" },
          },
          example: { roomId: "r1", code: "function add(a,b){return a+b}" },
        },
        CursorMoveEvent: {
          type: "object",
          properties: {
            roomId: { type: "string" },
            userId: { type: "string" },
            cursor: { type: "object" },
          },
          example: { roomId: "r1", userId: "u1", cursor: { line: 10, ch: 2 } },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication related endpoints" },
      { name: "User", description: "User management and profile operations" },
      { name: "Role", description: "Role-based access management" },
      { name: "Permission", description: "Permission configuration APIs" },
      { name: "Room", description: "Room management for collaboration" },
      { name: "File", description: "File and snapshot management" },
      { name: "Execution", description: "Code execution endpoints" },
      { name: "Analytics", description: "Usage and system analytics" },
      { name: "Billing", description: "Razorpay billing and subscription APIs" },
      { name: "Notification", description: "User notifications and alerts" },
      { name: "Admin", description: "Administrative and moderation operations" },
      { name: "WebSockets", description: "Real-time events (Socket.IO)" },
      { name: "Webhooks", description: "Webhook endpoints and integrations" },
    ],
  },
  apis: [
    "./src/modules/**/*.controller.ts",
    "./src/modules/**/*.routes.ts",
    "./src/docs/*.ts",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function generateSwaggerJson() {
  try {
    const outPath = path.resolve(process.cwd(), "src", "docs", "swagger-output.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(swaggerSpec, null, 2), "utf-8");
  } catch {}
}

/**
 * Adds Swagger UI to /api/docs
 */
export function setupSwagger(app: Express) {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "CodeCollab API Docs",
      customCss:
        ".swagger-ui .topbar { display: none } .swagger-ui .info { margin-bottom: 30px }",
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
  // Also emit JSON spec to src/docs/swagger-output.json for tooling and CI
  generateSwaggerJson();
}
