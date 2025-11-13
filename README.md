
# CodeCollab

Collaborate on code in real time with a robust full‑stack platform. This monorepo contains the backend (Node.js/Express/Prisma), frontend (React/TypeScript/Vite), and infrastructure (Docker Compose/Jenkins) needed to develop, run, and deploy CodeCollab.


## 🧩 Overview

CodeCollab enables teams to:

- **Authenticate** securely and manage sessions.
- **Collaborate** on code in real time with responsive UI components and live updates.
- **Automate CI/CD** via Jenkins pipelines and containerized deployments.

The repository is organized into three subprojects:

- `codecollab-backend-private` — REST APIs built with Node.js, Express, and Prisma (PostgreSQL).
- `codecollab-frontend-private` — React + TypeScript app (Vite + Tailwind CSS).
- `codecollab-infra-private` — Infrastructure (Docker Compose + Jenkins) for local orchestration and deployment.


## ⚙️ Tech Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Infra/DevOps**: Docker, Docker Compose, Jenkins


## 📁 Project Structure

```text
code-collab/
├─ codecollab-backend-private/
│  ├─ src/
│  ├─ prisma/
│  ├─ Dockerfile
│  ├─ Jenkinsfile
│  ├─ package.json
│  └─ ...
├─ codecollab-frontend-private/
│  ├─ src/
│  ├─ public/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ ...
├─ codecollab-infra-private/
│  ├─ docker-compose.yml
│  ├─ Jenkinsfile (pipeline configuration)
│  └─ ...
└─ README.md
```


## 🚀 Setup & Installation

### Prerequisites

- Node.js (LTS) and npm
- Docker and Docker Compose
- PostgreSQL (optional locally; Compose provides a DB service)

### Environment Variables

Create `.env` files as needed. Typical variables include:

```bash
# Backend (codecollab-backend-private/.env)
DATABASE_URL=postgresql://postgres:postgres@db:5432/codecollab
JWT_SECRET=change_me
PORT=4000

# Frontend (codecollab-frontend-private/.env)
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
# Optional
VITE_THIRD_PARTY_KEY=your_key

# Infra (codecollab-infra-private/.env) – if referenced by compose/jenkins
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=codecollab
```

> Adjust hosts and ports if you are not using Docker Compose defaults.


### Option A: Run with Docker Compose (recommended)

From the repo root:

```docker
# Build and start all services in the background
docker compose -f codecollab-infra-private/docker-compose.yml up -d --build

# View logs
docker compose -f codecollab-infra-private/docker-compose.yml logs -f

# Stop services
docker compose -f codecollab-infra-private/docker-compose.yml down
```

Default endpoints after startup:

- Backend API: `http://localhost:4000`
- Frontend app: `http://localhost:5173` (or as mapped in compose)
- PostgreSQL: `localhost:5432` (inside compose network as `db:5432`)


### Option B: Manual (no Docker)

Run each subproject in separate terminals.

```bash
# 1) Backend
cd codecollab-backend-private
npm install
npx prisma migrate dev
npm run dev
# or for production
npm run build && npm run start

# 2) Frontend
cd ../codecollab-frontend-private
npm install
npm run dev
# or for production
npm run build && npm run preview

# 3) (Optional) PostgreSQL
# Ensure a local PostgreSQL instance matches your DATABASE_URL
```


## 🧪 Running the App Locally

- **Docker**: Use the Docker Compose commands above to bring up API, frontend, and database together.
- **Manual**:
  - Start PostgreSQL and update `DATABASE_URL` accordingly.
  - Run `npx prisma migrate dev` once for schema setup.
  - Start backend (`npm run dev`) and frontend (`npm run dev`); update frontend `.env` to point to backend.


## 🧰 Development Scripts

Scripts may vary; refer to each subproject's `package.json`. Common examples:

```bash
# Backend (codecollab-backend-private)
npm run dev       # start dev server (nodemon/ts-node)
npm run build     # compile for production
npm run start     # start compiled server
npm run prisma:gen    # generate Prisma client
npm run prisma:migrate # run migrations

# Frontend (codecollab-frontend-private)
npm run dev       # start Vite dev server
npm run build     # build for production
npm run preview   # preview production build
```


## ☁️ Deployment (Jenkins / Docker)

### Jenkins

The repo includes `Jenkinsfile` configurations to automate:

- **Install** dependencies
- **Build** frontend and backend
- **Test** (unit/integration)
- **Dockerize** services
- **Push** images to a registry (e.g., Docker Hub/GHCR)
- **Deploy** via Docker Compose on the target server

Typical Jenkins pipeline stages:

```groovy
pipeline {
  agent any
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Backend Build & Test') { steps { sh 'cd codecollab-backend-private && npm ci && npm run build && npm test' } }
    stage('Frontend Build & Test') { steps { sh 'cd codecollab-frontend-private && npm ci && npm run build && npm test' } }
    stage('Docker Build') {
      steps {
        sh 'docker build -t your-registry/codecollab-backend:latest codecollab-backend-private'
        sh 'docker build -t your-registry/codecollab-frontend:latest codecollab-frontend-private'
      }
    }
    stage('Push Images') {
      steps {
        sh 'docker push your-registry/codecollab-backend:latest'
        sh 'docker push your-registry/codecollab-frontend:latest'
      }
    }
    stage('Deploy') {
      steps {
        sh 'docker compose -f codecollab-infra-private/docker-compose.yml pull && docker compose -f codecollab-infra-private/docker-compose.yml up -d'
      }
    }
  }
}
```

> Replace `your-registry/...` with your Docker registry path and configure credentials in Jenkins.

### Manual Docker builds

```docker
# From repo root
docker build -t your-registry/codecollab-backend:latest ./codecollab-backend-private
docker build -t your-registry/codecollab-frontend:latest ./codecollab-frontend-private

docker push your-registry/codecollab-backend:latest
docker push your-registry/codecollab-frontend:latest

# Deploy with compose (pulls latest images)
docker compose -f codecollab-infra-private/docker-compose.yml pull
docker compose -f codecollab-infra-private/docker-compose.yml up -d
```


## 🙌 Contributors

- Your Name (@yourhandle)
- Contributions welcome! Open an issue or submit a PR.


## 📜 License

This project is licensed under the MIT License. See `LICENSE` for details.

