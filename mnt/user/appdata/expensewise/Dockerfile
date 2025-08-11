# 1. Base Image: Use a lightweight Node.js image
FROM node:20-slim AS base

# 2. Set Working Directory
WORKDIR /app

# 3. Install pnpm: A fast, disk space-efficient package manager
RUN npm install -g pnpm

# 4. Build Stage: Build the Next.js application
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 5. Production Stage: Create the final, lean production image
FROM base AS production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Command to start the app
CMD ["pnpm", "start"]
