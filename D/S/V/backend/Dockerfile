FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN npx prisma generate

USER nextjs

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
