# Dockerfile

# 1. Official Node.js 20 Alpine image for a lean base
FROM node:20-alpine AS base

# 2. Set up the builder stage
FROM base AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# 3. Production image
FROM base AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage
# This includes the server, node_modules, and other necessary files
COPY --from=builder /app/.next/standalone ./

# Copy the public and static assets from their location within the standalone output
COPY --from=builder /app/.next/static ./.next/static

# Set the correct user for running the application
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the correct host for Docker
ENV HOSTNAME "0.0.0.0"

# Command to start the server
CMD ["node", "server.js"]
