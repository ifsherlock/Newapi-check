FROM node:20-slim

# Install only Chromium runtime dependencies (Chromium itself is mounted from host)
RUN apt-get update && apt-get install -y \
    fonts-noto-cjk \
    dbus \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxss1 \
    libgtk-3-0 \
    libnss3 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Chromium is volume-mounted; skip bundled download
# The app auto-discovers chrome in /opt/browser/chromium-*/chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install dev dependencies for build, then build, then clean up
COPY . .
RUN npm ci && npm run build && npm prune --omit=dev

# Create data directory
RUN mkdir -p /app/data/logs

ENV NODE_ENV=production
ENV PORT=3211

EXPOSE 3211

VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
