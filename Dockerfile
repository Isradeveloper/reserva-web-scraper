# Install dependencies only when needed
FROM shivjm/node-chromium:node22-chromium131-alpine AS deps

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the app with cache dependencies
FROM shivjm/node-chromium:node22-chromium131-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production image, copy all the files and run next
FROM shivjm/node-chromium:node22-chromium131-alpine AS runner

# Set working directory
WORKDIR /usr/src/app

# Instalar Puppeteer sin descargar Chromium (usaremos el del sistema)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json yarn.lock ./
RUN yarn install --prod

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
