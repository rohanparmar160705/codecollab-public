// src/docs/websockets.swagger.ts

/**
 * @swagger
 * /websockets:
 *   get:
 *     summary: WebSocket Event Reference
 *     description: |
 *       This page documents all **real-time Socket.IO events** used in CodeCollab.
 *
 *       ---
 *       ### 🧩 Collaboration Events
 *
 *       Event: `join-room`
 *       - Payload schema: `JoinRoomEvent`
 *       - Example:
 *       ```json
 *       { "userId": "u1", "username": "alice", "roomId": "r1", "roomOwnerId": "u0" }
 *       ```
 *       - Emits: `presence-update` → `string[]` of usernames in room
 *
 *       Event: `leave-room`
 *       - Payload schema: `JoinRoomEvent`
 *       - Example:
 *       ```json
 *       { "userId": "u1", "username": "alice", "roomId": "r1" }
 *       ```
 *       - Emits: `presence-update` → `string[]`
 *
 *       Event: `code-change`
 *       - Payload schema: `CodeChangeEvent`
 *       - Example:
 *       ```json
 *       { "roomId": "r1", "code": "function add(a,b){return a+b}" }
 *       ```
 *       - Emits: `code-update` → `{ "code": string }`
 *
 *       Event: `cursor-move`
 *       - Throttled to 100ms per client
 *       - Payload schema: `CursorMoveEvent`
 *       - Example:
 *       ```json
 *       { "roomId": "r1", "userId": "u1", "cursor": { "line": 10, "ch": 2 } }
 *       ```
 *       - Emits: `cursor-update` → `{ "userId": string, "cursor": object }`
 *
 *       Event: `user-reconnect`
 *       - Payload schema: `JoinRoomEvent`
 *       - Emits: `presence-update` → `string[]`
 *
 *       ---
 *       ### 🔔 Notification Events
 *       Notifications are emitted server-side on certain actions (e.g., room join).
 *       - Emits: `new-notification` → `Notification`
 *
 *       ---
 *       ### 🧠 Execution Events
 *       Real-time execution updates may be emitted as `execution-result` to room namespaces.
 *
 *     tags:
 *       - WebSockets
 */
