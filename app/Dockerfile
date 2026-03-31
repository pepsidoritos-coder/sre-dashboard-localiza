# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .

# Production stage — serve with nginx
FROM nginx:alpine
COPY --from=builder /app /usr/share/nginx/html

# Nginx config for SPA
RUN echo 'server { \
  listen 80; \
  server_name _; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  gzip on; \
  gzip_types text/css application/javascript text/html; \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
