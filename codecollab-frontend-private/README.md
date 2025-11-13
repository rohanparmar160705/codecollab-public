# CodeCollab Frontend

A React + TypeScript + Vite SPA for real‑time collaborative coding.

- UI: TailwindCSS + shadcn/ui
- Realtime: Yjs + y-websocket + Monaco, Socket.IO for chat/presence
- Data: React Query + Axios client
- Auth: Email/Password + OAuth popup (Google/GitHub)

## Getting Started

```bash
# 1) Install
npm ci

# 2) Env
cp .env.example .env
# Set VITE_API_BASE_URL, e.g. http://localhost:4000/api

# 3) Dev
npm run dev
```

## Environment Variables

- VITE_API_BASE_URL: Backend API base (http://localhost:4000/api)
- VITE_YJS_WS_URL (optional): Yjs WS base (defaults to http://localhost:4000)

## Folder Structure

- src/pages
  - RoomEditor.tsx: Monaco editor + Yjs binding, presence avatars, diff modal, execution console
  - Profile.tsx: View/update user profile
  - AdminDashboard.tsx: Users, Executions, Metrics, Roles tabs
  - Auth pages (Login, Register, Forgot/Reset) as applicable
- src/components
  - chat/ChatDrawer.tsx: chat history + Socket.IO live messages/typing
  - history/CodeHistoryPanel.tsx: file snapshots list + Monaco diff modal
  - layout/ThemeToggle.tsx, Navbar.tsx
  - ui/*: shadcn/ui primitives
- src/services
  - apiClient.ts: Axios instance with auth and refresh interceptors
  - authService.ts: login/register/refresh, OAuth popup flow
  - usersService.ts: profile, user rooms, list users, assign role
  - roomsService.ts: list/get/create/delete/join/leave/saveContent, setRoomVisibility, getRoomShare
  - filesService.ts: files CRUD, snapshots create/list
  - executionService.ts: executeCode, getExecution, listExecutions
  - chatService.ts: room chat history
  - adminService.ts: admin users, executions, metrics, roles/permissions/user-role
  - billingService.ts, analyticsService.ts, notificationsService.ts, rolesService.ts, permissionsService.ts
- src/sockets
  - socketClient.ts: Socket.IO client
- src/providers
  - ThemeProvider.tsx
- src/store (if present): auth slice, UI state

## Libraries

- react, react-router-dom, @tanstack/react-query
- axios
- monaco-editor
- yjs, y-websocket, y-monaco
- socket.io-client
- tailwindcss, class-variance-authority, shadcn/ui
- lucide-react

## API Usage (selected)

| Method | Path | Purpose | Used In |
|---|---|---|---|
| POST | /auth/login | Login | authService, Login page |
| GET | /auth/oauth/:provider/url | OAuth URL | authService, Login |
| GET | /users/profile | Profile | usersService, Profile/boot |
| PUT | /users/profile | Update profile | usersService, Profile |
| GET | /rooms/:id | Get room | roomsService, RoomEditor |
| POST | /rooms/join | Join room | roomsService, RoomEditor |
| POST | /rooms/leave | Leave room | roomsService, RoomEditor |
| POST | /rooms/:id/content | Save code | roomsService, RoomEditor |
| PUT | /rooms/:id/visibility | Public/private | roomsService, RoomEditor |
| GET | /rooms/:id/share | Share link | roomsService, RoomEditor |
| GET | /files/rooms/:roomId/files | List files | filesService, History |
| GET | /files/:fileId/snapshots | List snapshots | filesService, History |
| POST | /execution/execute | Execute code | executionService, RoomEditor |
| GET | /execution/:id | Poll execution | executionService, RoomEditor |
| GET | /chat/:roomId | Chat history | chatService, ChatDrawer |
| GET | /admin/executions | Admin | adminService, AdminDashboard |
| GET | /admin/metrics | Admin | adminService, AdminDashboard |

## WebSockets

- Socket.IO events
  - join-room / leave-room
  - presence-update (live user count)
  - chat:send / chat:receive / chat:typing
  - code-update (fallback if Yjs disabled)
  - execution:status / execution:output
- Yjs (`/yjs`)
  - Awareness: user {id, name, color}, cursor {position, selection}
  - Monaco binding for shared text

## Error Handling & Loading

- React Query handles loading/error states; components display spinners and toasts.
- Axios interceptor retries refresh token on 401, then replays the request.

## OAuth Popup

- `authService.oauthPopupLogin(provider)` opens provider URL with `state=popup` and listens for `postMessage` from backend callback HTML to receive tokens, then stores them.

## npm Scripts

- dev — run Vite dev server
- build — build production assets
- preview — preview built app
- lint — run eslint fixes

## Dockerfile

- Multi-stage:
  - node:18-alpine builds the app (npm ci, npm run build)
  - nginx:alpine serves `dist/` with SPA routing

Build locally:
```bash
docker build -t codecollab-frontend:local .
```

## Jenkinsfile (CI/CD)

- Stages: checkout → setup → npm ci → build → docker build+push → deploy
- Deploy uses infra/docker-compose.yml with env:
  - REGISTRY, FRONTEND_TAG (e.g., BUILD_NUMBER)
- Trigger: GitHub webhook → Jenkins → pipeline → image push → deploy

## Deployment

Local (root docker-compose.yml):
```bash
docker compose up -d --build
```

Production (infra/docker-compose.yml):
```bash
REGISTRY=registry.example.com/myorg \
FRONTEND_TAG=123 \
BACKEND_TAG=123 \
docker compose -f infra/docker-compose.yml pull && docker compose -f infra/docker-compose.yml up -d
```

## Frontend Workflow Overview

1) User logs in or uses OAuth popup
2) Enters a room: joins presence room via Socket.IO and Yjs awareness
3) Edits code collaboratively (multiple cursors), chats in drawer
4) Views history and diff; applies snapshot if desired
5) Executes code; sees status/output streamed
6) Admin tabs show executions/metrics/roles (if authorized)
