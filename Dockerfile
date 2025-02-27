# Install dependencies only when needed
FROM node:20.15-alpine3.20 AS deps

# Instalar dependencias necesarias para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libc6-compat

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the app with cache dependencies
FROM node:20.15-alpine3.20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production image, copy all the files and run next
FROM node:20.15-alpine3.20 AS runner

# Set working directory
WORKDIR /usr/src/app

# Instalar Puppeteer sin descargar Chromium (usaremos el del sistema)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY package.json yarn.lock ./
RUN yarn install --prod

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
