# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- deps (full, for building) ----------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- build --------------------------------------------------------------
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- prod deps only -----------------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# ---- runtime --------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S scamwatch && adduser -S scamwatch -G scamwatch
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package.json ./
USER scamwatch
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
