# === Stage 1: Build ===
FROM oven/bun:1.2.15 AS builder
WORKDIR /app

# Install deps first to cache effectively
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile

# Copy the rest of the source
COPY . .

# (Optional) If you have a build step (e.g. TypeScript)
# RUN bun run build

# === Stage 2: Runtime ===
FROM oven/bun:1.2.15-slim AS runner
WORKDIR /app

# Only copy built artifacts and production deps
COPY --from=builder /app ./

# Install only production dependencies
RUN bun install --production

# Set runtime env
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# OPTIONAL: Drop root privileges
# USER bun

CMD ["bun", "run", "start"]
