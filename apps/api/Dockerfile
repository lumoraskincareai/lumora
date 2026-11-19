# Build context is the repo root (see docker-compose.yml), because the
# lockfile lives there.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY apps/mobile/package.json ./apps/mobile/package.json

# Installs only the API's dependencies; postinstall runs `prisma generate`
RUN npm ci -w lumora-backend

WORKDIR /repo/apps/api
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
