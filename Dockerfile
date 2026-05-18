FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && rm -rf node_modules && npm ci --omit=dev

# ---
FROM node:20-slim

# Minimal deps for externally-mounted Chromium (it bundles its own libs)
# Only need fonts + a few essentials the bundled chrome still links against
RUN apt-get update && apt-get install -y \
    fonts-wqy-zenhei \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data/logs

ENV NODE_ENV=production
ENV PORT=3211

EXPOSE 3211
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
