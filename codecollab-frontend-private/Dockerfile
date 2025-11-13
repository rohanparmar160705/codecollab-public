# codecollab-frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
# Optional: custom nginx config for SPA routing
RUN sed -i 's#/usr/share/nginx/html;#/usr/share/nginx/html;\n    try_files $uri /index.html;#' /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
