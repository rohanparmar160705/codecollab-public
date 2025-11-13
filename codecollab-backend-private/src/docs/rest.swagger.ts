// src/docs/rest.swagger.ts

/**
 * Auto-generated Swagger path docs for REST endpoints.
 * These mirror Express routes registered in src/app.ts and module routers.
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegisterRequest'
 *           example:
 *             name: "Rohan Parmar"
 *             email: "rohan@example.com"
 *             password: "StrongPass@123"
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "<refresh-token>"
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send password reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "alice@example.com" }
 *     responses:
 *       200:
 *         description: Email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, example: "<reset-token>" }
 *               password: { type: string, example: "NewStrong@123" }
 *     responses:
 *       200:
 *         description: Password reset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags: [User]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile
 */

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [User]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *           example:
 *             name: "Alice"
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /users/{id}/rooms:
 *   get:
 *     tags: [User]
 *     summary: Get rooms for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rooms
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [User]
 *     summary: List users (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 */

/**
 * @swagger
 * /users/assign-role:
 *   post:
 *     tags: [User]
 *     summary: Assign role to user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, roleId]
 *             properties:
 *               userId: { type: string, example: "user_123" }
 *               roleId: { type: string, example: "role_admin" }
 *     responses:
 *       200:
 *         description: Role assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /roles:
 *   post:
 *     tags: [Role]
 *     summary: Create role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "moderator" }
 *               description: { type: string, example: "Can moderate rooms" }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     tags: [Role]
 *     summary: Get all roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */

/**
 * @swagger
 * /roles/assign-permission:
 *   post:
 *     tags: [Role]
 *     summary: Assign permission to role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId, permissionId]
 *             properties:
 *               roleId: { type: string, example: "role_moderator" }
 *               permissionId: { type: string, example: "perm_rooms_update" }
 *     responses:
 *       200:
 *         description: Assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /roles/set-parent:
 *   post:
 *     tags: [Role]
 *     summary: Set role parent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [childRoleId, parentRoleId]
 *             properties:
 *               childRoleId: { type: string, example: "role_moderator" }
 *               parentRoleId: { type: string, example: "role_admin" }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /roles/hierarchy:
 *   get:
 *     tags: [Role]
 *     summary: Get role hierarchy
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hierarchy
 */

/**
 * @swagger
 * /permissions:
 *   get:
 *     tags: [Permission]
 *     summary: List permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /permissions:
 *   post:
 *     tags: [Permission]
 *     summary: Create permission
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, resource]
 *             properties:
 *               action: { type: string, example: "update" }
 *               resource: { type: string, example: "rooms" }
 *               description: { type: string, example: "Update rooms" }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     tags: [Permission]
 *     summary: Delete permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */

/**
 * @swagger
 * /rooms:
 *   post:
 *     tags: [Room]
 *     summary: Create room
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomCreate'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     tags: [Room]
 *     summary: List rooms
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     tags: [Room]
 *     summary: Get room by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room
 */

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     tags: [Room]
 *     summary: Delete room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */

/**
 * @swagger
 * /rooms/join:
 *   post:
 *     tags: [Room]
 *     summary: Join room
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRoomRequest'
 *     responses:
 *       200:
 *         description: Joined
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /rooms/leave:
 *   post:
 *     tags: [Room]
 *     summary: Leave room
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRoomRequest'
 *     responses:
 *       200:
 *         description: Left
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /execution/execute:
 *   post:
 *     tags: [Execution]
 *     summary: Queue code execution
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExecutionRequest'
 *     responses:
 *       200:
 *         description: Queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId: { type: string }
 *                 executionId: { type: string }
 *                 status: { type: string }
 */

/**
 * @swagger
 * /execution:
 *   get:
 *     tags: [Execution]
 *     summary: List executions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /execution/{id}:
 *   get:
 *     tags: [Execution]
 *     summary: Get execution by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Execution
 */

/**
 * @swagger
 * /billing/create:
 *   post:
 *     tags: [Billing]
 *     summary: Create subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BillingCreateRequest'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 */

/**
 * @swagger
 * /billing/verify:
 *   post:
 *     tags: [Billing]
 *     summary: Verify payment signature
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BillingVerifyRequest'
 *     responses:
 *       200:
 *         description: Activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 */

/**
 * @swagger
 * /billing/active:
 *   get:
 *     tags: [Billing]
 *     summary: Get active subscription
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notification]
 *     summary: Get my notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notification]
 *     summary: Mark notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 */

/**
 * @swagger
 * /notifications/clear:
 *   delete:
 *     tags: [Notification]
 *     summary: Clear all notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleared
 */

/**
 * @swagger
 * /files/rooms/{roomId}/files:
 *   post:
 *     tags: [File]
 *     summary: Create file in a room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileCreate'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 */

/**
 * @swagger
 * /files/rooms/{roomId}/files:
 *   get:
 *     tags: [File]
 *     summary: List files in a room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     tags: [File]
 *     summary: Get file by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File
 */

/**
 * @swagger
 * /files/{id}:
 *   put:
 *     tags: [File]
 *     summary: Update file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileCreate'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 */

/**
 * @swagger
 * /files/{id}:
 *   delete:
 *     tags: [File]
 *     summary: Delete file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */

/**
 * @swagger
 * /files/{id}/snapshots:
 *   post:
 *     tags: [File]
 *     summary: Create snapshot for a file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SnapshotCreate'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /files/{id}/snapshots:
 *   get:
 *     tags: [File]
 *     summary: List snapshots for a file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users
 */

/**
 * @swagger
 * /admin/rooms:
 *   get:
 *     tags: [Admin]
 *     summary: List all rooms (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rooms
 */

/**
 * @swagger
 * /auth/oauth/{provider}/url:
 *   get:
 *     tags: [Auth]
 *     summary: Get OAuth URL for provider (google|github)
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [google, github] }
 *     responses:
 *       200:
 *         description: URL
 */

/**
 * @swagger
 * /auth/oauth/{provider}/callback:
 *   get:
 *     tags: [Auth]
 *     summary: OAuth callback for provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [google, github] }
 *       - in: query
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tokens and user
 */

/**
 * @swagger
 * /chat/{roomId}:
 *   get:
 *     tags: [Room]
 *     summary: Get chat messages for room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Messages
 */

/**
 * @swagger
 * /admin/executions:
 *   get:
 *     tags: [Admin]
 *     summary: List recent executions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Executions
 */

/**
 * @swagger
 * /admin/metrics:
 *   get:
 *     tags: [Admin]
 *     summary: System metrics summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics
 */

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     tags: [Admin]
 *     summary: List roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles
 */

/**
 * @swagger
 * /admin/roles:
 *   post:
 *     tags: [Admin]
 *     summary: Create role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               isDefault: { type: boolean }
 *               parentRoleId: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */

/**
 * @swagger
 * /admin/roles/{id}/permissions:
 *   post:
 *     tags: [Admin]
 *     summary: Assign permissions to role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     action: { type: string }
 *                     resource: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /admin/users/{id}/role:
 *   post:
 *     tags: [Admin]
 *     summary: Assign role to user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties:
 *               roleId: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /admin/subscriptions:
 *   get:
 *     tags: [Admin]
 *     summary: List all subscriptions (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions
 */
