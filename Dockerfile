FROM node:22-alpine AS base
WORKDIR /app

# Install ALL dependencies, including dev — `npm run build` runs `nest build`
# (@nestjs/cli) and `prisma generate` (the `prisma` CLI), both of which are
# devDependencies. A `--only=production`/`--omit=dev` install here fails
# outright, since `postinstall` (`prisma generate`) also can't find the
# `prisma` CLI it needs.
FROM base AS deps
COPY package.json package-lock.json ./
# `postinstall` (prisma generate) runs as part of `npm ci` below and needs
# the schema present — copy it before installing, not after.
COPY prisma ./prisma
RUN npm ci

# Build the application — the generated Prisma Client lands under
# node_modules/@prisma/client + node_modules/.prisma here.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Drop devDependencies from the already-built node_modules WITHOUT
# reinstalling — a fresh `npm ci --omit=dev` would re-trigger `postinstall`
# (prisma generate), which needs the `prisma` CLI a prod-only install
# doesn't have. `prune` only removes devDependency packages, leaving the
# already-generated Prisma Client (a production dependency) untouched.
RUN npm prune --omit=dev

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads && chown -R nestjs:nodejs uploads

USER nestjs
EXPOSE 7000
CMD ["node", "dist/main"]
