# CodeCollab Backend

A real-time collaborative coding platform backend — think “LeetCode + Google Docs” for code. Teams co-edit code in rooms, run code securely in sandboxed containers, manage files and snapshots, and analyze usage — with robust RBAC, billing, and admin panels.

## Overview
- Node.js + Express + TypeScript backend with Prisma ORM (PostgreSQL)
- Real-time collaboration with Socket.IO
- Redis for rate limiting and horizontal scale-out
- Sentry for error tracing (optional)
- Production logging with Pino (pretty in dev; file logs in prod)

## Tech Stack
- Backend: Node.js, Express, TypeScript, Prisma, Socket.IO
- Database: PostgreSQL
- Cache/Queue: Redis
- Monitoring: Sentry

## Architecture Overview
- Auth: JWT access/refresh, secure password hashing
- Users: Profile, settings
- Roles/Permissions (RBAC): Roles, permissions, role hierarchy, assignments
- Rooms: Create/list/join/leave collaborative rooms
- Files: Per-room files, CRUD
- Snapshots: Versioned code snapshots
- Execution Engine: Code run using language-specific images (Node, Python, C++, Java)
- Billing: Razorpay integration (create/verify), active subscription checks
- Analytics: Platform usage, weekly trends
- Notifications: List/mark/clear user notifications
- Admin: Users, rooms, subscriptions
- Health: `/api/health`

Realtime flow
- Client joins a Socket.IO room per `roomId`
- Code/file updates broadcast to room participants
- Optional Redis pub/sub enables multi-instance scale-out

## Environment (.env example)
```
# App
NODE_ENV=development
PORT=4000
APP_NAME=CodeCollab
APP_URL=http://localhost:4000
CLIENT_URLS=http://localhost:3000
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000

# Database (Prisma)
DATABASE_URL=postgresql://user:pass@localhost:5432/codecollab?schema=public

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Razorpay (optional in dev)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Sentry (optional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1

# Execution engine
EXECUTION_TIMEOUT=10000
QUEUE_RETRY_LIMIT=3
DOCKER_IMAGE_NODE=node:18
DOCKER_IMAGE_PYTHON=python:3.11
DOCKER_IMAGE_CPP=gcc:latest
DOCKER_IMAGE_JAVA=openjdk:17
```

## Local Development
```
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
- Healthcheck: http://localhost:4000/api/health
- Swagger: http://localhost:4000/api/docs

## Testing APIs
- Postman collection: `src/docs/postman_collection.json`
  - Uses `{{baseUrl}}` (defaults to `http://localhost:4000/api`).
  - Collection pre-request script handles register → login → sets `{{authToken}}` and `{{userId}}` automatically.
- PowerShell full suite: `./scripts/api_full_test.ps1 -BaseUrl "http://localhost:4000/api"`
  - Covers all endpoints except forgot/reset password
  - Dynamically provisions RBAC for admin endpoints

## Production Readiness
- Rate Limiting: `express-rate-limit` with RedisStore, configurable via env
- Logging: Pino pretty in dev; JSON file logs in prod under `./logs/`
- Sentry: Optional DSN; request/tracing/error handlers wired; user context attached when authenticated

## API Coverage Summary
- Total endpoints (collection): 45
- Excluded from test suite: 2 (Forgot, Reset password)
- Tested: 43; Working: 43/43 (first pre-register login 401 is expected by design)

## Frontend Mapping
- Auth: Login / Register
- Dashboard: rooms list, recent files, analytics widgets
- Code Editor: real-time collab via Socket.IO per room
- Room Management: create/join/leave
- File Management: create/update/delete
- Execution Console: run code via backend execution engine
- Profile & Settings
- Notifications
- Billing / Subscription
- Admin Panel: users, roles, permissions, subscriptions

## Folder Structure Summary
- `src/config`: env, swagger
- `src/middlewares`: auth, admin, permission, rateLimiter, error
- `src/modules/*`: feature modules (auth, user, room, file, execution, billing, analytics, admin)
- `src/services`: docker/execution services
- `src/utils`: logger, errors
- `prisma/`: schema and migrations
- `src/docs`: postman collection
- `scripts`: `api_full_test.ps1` automated API coverage

## Future Enhancements
- CRDT-based cursor/caret synchronization and selections
- Presence tracking (user cursors/avatars)
- Version history and diff/merge for snapshots
- Resource quotas and per-plan rate limits
- AI-assist code completion and tests generation

## Project Run Flow
1) Clone repo
2) Create `.env` (see example)
3) Start Postgres + Redis locally (or managed services)
4) `npx prisma migrate dev`
5) `npm run dev`
6) Open http://localhost:4000/api/health
7) Import Postman collection and run APIs

Redis usage
- Rate limiter store
- Optional Socket.IO scale-out (when clustered)

Prisma
- Connects to PostgreSQL via `DATABASE_URL`.

## Docker Compose (optional)
If you prefer containers, you can run Postgres, Redis, and the backend via Docker Compose. This works on both Windows and Linux (Docker Desktop or Docker Engine required).

Example docker-compose.yml (save at project root):

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-codecollab}
      POSTGRES_USER: ${POSTGRES_USER:-codeuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-codepass}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql://${POSTGRES_USER:-codeuser}:${POSTGRES_PASSWORD:-codepass}@postgres:5432/${POSTGRES_DB:-codecollab}?schema=public}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      PORT: ${PORT:-4000}
      NODE_ENV: ${NODE_ENV:-production}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "4000:4000"
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

Commands
- Start: `docker compose up -d --build`
- Status: `docker ps`
- Backend logs: `docker compose logs -f backend`
- Stop: `docker compose down`

Notes
- The backend waits for Postgres and Redis to be healthy before starting.
- On start, the backend runs Prisma migration deploy and then starts the server.
- Windows and Linux are supported (ensure Docker Desktop/Engine is running).
