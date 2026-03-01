# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install ffmpeg and yt-dlp
RUN apk add --no-cache ffmpeg python3 py3-pip curl \
    && pip3 install --break-system-packages yt-dlp || pip3 install yt-dlp

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Runtime dirs (mounted as volumes)
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000

CMD ["node", "server.js"]
