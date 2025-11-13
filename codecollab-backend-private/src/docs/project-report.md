# 📦 CodeCollab Backend Audit Report

Generated: 2025-11-04T18:49:00+05:30

---

## Summary
- **Total APIs**: 45
- **Total WebSocket Events**: 14
- **Total Webhooks**: 0 (Razorpay webhooks removed; signature middleware present but not routed)
- **Total Services**: 13
- **Total Prisma Models**: 22
- **Total Modules**: 13

---

## Modules

### Auth
- **APIs**
  - POST /api/auth/register → `AuthController.register`
  - POST /api/auth/login → `AuthController.login`
  - POST /api/auth/refresh-token → `AuthController.refresh`
  - POST /api/auth/forgot-password → `AuthController.forgotPassword`
  - POST /api/auth/reset-password → `AuthController.resetPassword`
- **Services**
  - `auth.service.ts` → Register/Login/Refresh/Forgot/Reset using Prisma, JWT, Mailer
- **Middlewares**
  - None applied at router level (public routes)

### User
- **APIs** (prefix /api/users; `verifyToken` applied globally)
  - GET /profile → `UserController.getProfile`
  - PUT /profile → `UserController.updateProfile`
  - GET /:id/rooms → `UserController.getUserRooms` (perm: read rooms)
  - GET / → `UserController.getAll` (perm: read users)
  - POST /assign-role → `UserController.assignRole` (perm: update roles)
- **Services**
  - `user.service.ts` → Profiles, listing, update profile, assign role, user rooms
- **Middlewares**
  - `verifyToken`, `checkPermission`

### Role
- **APIs** (prefix /api/roles; `verifyToken` applied globally)
  - POST / → `RoleController.create` (perm: create roles)
  - GET / → `RoleController.getAll` (perm: read roles)
  - POST /assign-permission → inline handler calls `RoleService.assignPermission` (perm: update permissions)
  - POST /set-parent → `RoleHierarchyController.setParent` (perm: update roles)
  - GET /hierarchy → `RoleHierarchyController.getHierarchy` (perm: read roles)
- **Services**
  - `role.service.ts`, `roleHierarchy.service.ts` → CRUD helpers and hierarchy
- **Middlewares**
  - `verifyToken`, `checkPermission`

### Permission
- **APIs** (prefix /api/permissions; protected by `authenticate` + RBAC)
  - GET / → `PermissionController.getAll` (perm: read permissions)
  - POST / → `PermissionController.create` (perm: create permissions)
  - DELETE /:id → `PermissionController.remove` (perm: delete permissions)
- **Services**
  - `permission.service.ts` → CRUD using Prisma

### Room
- **APIs** (prefix /api/rooms)
  - POST / → `RoomController.create` (verifyToken + perm: create rooms)
  - GET / → `RoomController.getAll` (verifyToken + perm: read rooms)
  - GET /:id → `RoomController.getById` (verifyToken + perm: read rooms)
  - DELETE /:id → `RoomController.delete` (verifyToken + perm: delete rooms)
  - POST /join → `RoomController.join` (verifyToken)
  - POST /leave → `RoomController.leave` (verifyToken)
- **Services**
  - `room.service.ts` → CRUD + membership ops

### File
- **APIs** (prefix /api/files; registered via factory with Socket.IO)
  - POST /rooms/:roomId/files → `FileController.create` (verifyToken)
  - GET /rooms/:roomId/files → `FileController.list` (verifyToken)
  - GET /:id → `FileController.getById` (verifyToken)
  - PUT /:id → `FileController.update` (verifyToken)
  - DELETE /:id → `FileController.delete` (verifyToken)
  - POST /:id/snapshots → `FileController.createSnapshot` (verifyToken)
  - GET /:id/snapshots → `FileController.listSnapshots` (verifyToken)
- **Services**
  - `file.service.ts` → Room files CRUD + snapshots; emits Socket.IO events

### Execution
- **APIs** (prefix /api/execution)
  - POST /execute → `ExecutionController.executeCode` (verifyToken)
  - GET / → `ExecutionController.list` (verifyToken)
  - GET /:id → `ExecutionController.getById` (verifyToken)
- **Services**
  - `execution.service.ts` → Persists executions, enqueues jobs (BullMQ), fetches records
  - `services/docker.service.ts` → Runs code inside Docker via `utils/docker`

### Billing
- **APIs** (prefix /api/billing; `authenticate`)
  - POST /create → `BillingController.startSubscription`
  - POST /verify → `BillingController.verifyPayment` (manual signature verification)
  - GET /active → `BillingController.getActiveSubscription`
- **Services**
  - `billing.service.ts` → Creates subscriptions (Razorpay), activates/deactivates
- **Webhooks**
  - None routed. `verifyRazorpayWebhook` middleware exists but not used.

### Notification
- **APIs** (prefix /api/notifications; registered via factory with Socket.IO; `verifyToken`)
  - GET / → `NotificationController.getUserNotifications`
  - PATCH /:id/read → `NotificationController.markAsRead`
  - DELETE /clear → `NotificationController.clearAll`
- **Services**
  - `notification.service.ts` → CRUD + emits `notification:new` via Socket.IO

### Analytics
- **APIs** (prefix /api/analytics)
  - GET /overview → `AnalyticsController.getOverview` (verifyToken)
- **Services**
  - Inline Prisma usage for aggregations

### Admin
- **APIs** (prefix /api/admin; protected by `verifyAdmin` at mount)
  - GET /users → `AdminController.getAllUsers`
  - GET /rooms → `AdminController.getAllRooms`
  - GET /subscriptions → `AdminController.getAllSubscriptions`
- **Services**
  - `admin.service.ts` → Prisma queries for users/rooms/subscriptions

### Collab (WebSocket)
- **Gateway**
  - `collab.gateway.ts` registered with shared `Server`
- **Events**
  - join-room → joins room + stores presence in Redis; may notify owner
  - presence-update (emit) → members list
  - code-change → emits code-update { code }
  - code-update (emit)
  - cursor-move → emits cursor-update { userId, cursor } (throttled 100ms)
  - cursor-update (emit)
  - user-reconnect → re-add presence, emit presence-update
  - leave-room → leave + remove presence, emit presence-update
  - disconnect → optional cleanup
- **Related socket emits**
  - file.service emits: file:created, file:updated, file:deleted, file:snapshot
  - notification.service emits: notification:new

---

## Webhooks
- No webhook endpoints registered.
- Middleware present:
  - `verifyRazorpayWebhook` (validates Razorpay HMAC) — not wired to a route.

---

## Services and Responsibilities
- admin.service.ts → Admin listing for users, rooms, subscriptions
- auth.service.ts → Register, login, refresh, forgot/reset password, JWT
- billing.service.ts → Razorpay subscription create, activate, deactivate/cancel
- collab/ot.service.ts → Redis-backed doc versioning (naive OT)
- execution.service.ts → Persist executions, enqueue BullMQ jobs, fetch results
- file.service.ts → File CRUD, snapshots, Socket.IO emits
- notification.service.ts → User notifications CRUD + emit
- permission.service.ts → Permission CRUD
- role.service.ts → Role CRUD + assignPermission
- roleHierarchy.service.ts → Set/get role hierarchy via parentRoleId
- room.service.ts → Room CRUD + membership
- user.service.ts → Profiles, admin listing, role assignment, user rooms
- services/docker.service.ts → Docker execution wrapper

---

## Prisma Models (schema.prisma)
- User
  - id, username, email, passwordHash?, avatarUrl?, plan (PlanType=FREE), emailVerified, timestamps
  - Relations: sessions, oauthAccounts, preferences, activityLogs, roomsCreated, memberships, messages, reactions, snapshots, executions, subscriptions, payments, notifications, userRoles
- OAuthAccount
  - provider, providerId (unique), tokens, expiresAt, userId
- Session
  - refreshToken unique, userId, expiresAt
- UserPreferences
  - theme, fontSize, tabSize, language, userId unique
- Room
  - ownerId, name, description?, language, inviteCode?, isPublic, timestamps, deletedAt?
  - Relations: members, settings, files, messages, executions, invites, analytics
- RoomMember
  - userId, roomId, role (RoleType), joinedAt, unique (userId, roomId)
- RoomSetting
  - roomId unique, autoSave, allowGuests, editorFontSize, theme
- File
  - roomId, name, content, path, timestamps, deletedAt?, snapshots
- FileSnapshot
  - fileId, userId, code, language, description?, createdAt
- Execution
  - roomId, userId, jobId?, language, code, input?, output?, status (ExecStatus), metrics, errorMessage, createdAt
- Message
  - roomId, userId, text, replyToId?, pinned, createdAt, deletedAt?, reactions
- Reaction
  - messageId, userId, emoji, unique (messageId, userId, emoji)
- Subscription
  - userId, plan, razorpayPlanId, razorpaySubId?, status (BillingStatus), period, activatedAt?, autoRenew, isActive, payments
- PaymentTransaction
  - subscriptionId?, userId, orderId?, paymentId?, amount, currency, status, provider?, rawResponse, createdAt, idx on (orderId, paymentId)
- Notification
  - userId, type (NotificationType), message, refType?, refId?, isRead, createdAt
- Invite
  - roomId, code unique, createdBy, expiresAt, createdAt
- UserActivityLog
  - userId, action, meta, createdAt
- RoomAnalytics
  - roomId unique, counters, updatedAt
- Role
  - name unique, description?, isDefault, parentRoleId?, userRoles, rolePermissions, hierarchy
- Permission
  - action, resource, unique, description?, rolePermissions
- RolePermission
  - composite id (roleId, permissionId), assignedAt
- UserRole
  - userId, roleId, unique (userId, roleId)
- Enums
  - PlanType(FREE, PRO, ENTERPRISE), RoleType(OWNER, EDITOR, VIEWER), BillingStatus(PENDING, ACTIVE, CANCELLED), ExecStatus(QUEUED, RUNNING, COMPLETED, FAILED), PaymentStatus(INITIATED, SUCCESS, FAILED, REFUNDED), NotificationType(SYSTEM, ROOM, EXECUTION, BILLING, ADMIN)

---

## Middlewares
- auth.middleware.ts
  - `authenticate` (loads user + roles/permissions), `verifyToken` (basic JWT), `authenticateWithSubscription` (authenticate + BillingGuard)
- permission.middleware.ts
  - `checkPermission(action, resource)` with parent-role inheritance
- admin.middleware.ts
  - `verifyAdmin` ensures user has ADMIN role
- error.middleware.ts
  - `globalErrorHandler`
- rateLimiter.middleware.ts
  - Redis-backed rate limiting via express-rate-limit + rate-limit-redis
- verifyEmail.middleware.ts
  - Enforces emailVerified before access
- verifyPayment.middleware.ts
  - `verifyRazorpayWebhook` (HMAC), `verifyOrderPaymentSignature`, `verifySubscriptionPaymentSignature`

---

## Utils
- utils/docker.ts → run code in Docker (used by DockerService)
- utils/jwt.ts → sign/verify access/refresh tokens
- utils/hash.ts → bcrypt hash/compare
- utils/mailer.ts → nodemailer transporter + sendMail
- utils/logger.ts → pino logger
- utils/response.ts → success/error helpers
- utils/token.ts → random token generator
- utils/permissions.ts → permission constants/helpers
- utils/appError.ts → custom error class

---

## Config
- env.ts → validated ENV accessors
- prisma.ts → Prisma client singleton
- redis.ts → Redis client + helpers
- queue.ts → BullMQ queue (code-execution) + defaults
- razorpay.client.ts → Razorpay SDK + plan mapping
- swagger.ts → OpenAPI setup and JSON emission

---

## Dependency Graph (summary)
- Controllers → Services → Prisma/Redis/Queue/Razorpay
- Routers → Middlewares: `verifyToken`/`authenticate`, `checkPermission`, `verifyAdmin`
- Socket.IO
  - collab.gateway uses NotificationService + Redis
  - file.service and notification.service emit events
- External APIs: Razorpay (billing), Nodemailer (mailer)

---

## Endpoint Counts per Module
- Auth: 5
- User: 5
- Role: 5
- Permission: 3
- Room: 6
- File: 7
- Execution: 3
- Billing: 3
- Notification: 3
- Analytics: 1
- Admin: 3
- Health: 1

---

## LOC (selected files)
- app.ts: 105
- server.ts: 53
- collab.gateway.ts: 142
- auth.routes.ts: 15; controller: 85; service: 103
- user.routes.ts: 24; controller: 65; service: 112
- role.routes.ts: 57; controller: 60; service: 27; roleHierarchy.controller: 25; roleHierarchy.service: 26
- permission.routes.ts: 32; controller: 30; service: 27
- room.routes.ts: 20; controller: 75; service: 77
- file.routes.ts: 39; controller: 189; service: 144
- execution.routes.ts: 13; controller: 61; service: 78
- billing.routes.ts: 26; controller: 87; service: 135
- notification.routes.ts: 23; controller: 47; service: 56
- admin.module.ts: 13; routes: 4; controller: 38; service: 51
- middlewares: auth 91; permission 63; admin 28; error 31; rateLimiter 33; verifyEmail 35; verifyPayment 83
- config: swagger 321; env 57; prisma 15; redis 70; queue 35; razorpay.client 24

---

## Unused/Unreferenced
- Webhook middleware present but not routed: consider removing or documenting intended use.
- src/jobs/, src/mail/, src/sockets/ directories exist but currently empty.

---

## Notes
- Swagger configured and emits JSON at src/docs/swagger-output.json.
- Socket-dependent routers are registered via `registerRoutes(app, io)` for files and notifications.
