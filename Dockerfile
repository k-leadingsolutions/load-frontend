# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Leverage layer caching: install dependencies before copying sources.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* env vars at build time, so the backend URL must be
# supplied as a build arg (not a runtime env var) when building this image.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# --- Runtime stage -------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
