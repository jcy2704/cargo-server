# Use official Bun image for development
FROM oven/bun:1.2.15

# Set working directory
WORKDIR /app

# Copy dependencies
COPY bun.lockb /app/bun.lockb
COPY package.json /app/package.json

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose port (customize if needed)
ENV PORT=3000
EXPOSE 3000

# Start the development server (you can replace this with `bun run dev` if needed)
CMD ["bun", "run", "dev"]
