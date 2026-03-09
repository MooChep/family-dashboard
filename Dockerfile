# ─── Stage 1 : builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
# Indispensable pour Prisma sur Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./

RUN mkdir -p /app/public

RUN npm ci

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

# ─── Stage 2 : runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 1. INSTALLATION DES DÉPENDANCES SYSTÈME (Fix OpenSSL)
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 2. INSTALLATION DE PRISMA ET FIX DES PERMISSIONS
# On installe Prisma globalement et on donne les droits à l'utilisateur nextjs
# sur le dossier global de npm pour que Prisma puisse gérer ses "engines".
RUN npm install -g prisma@5.10.0 && \
    chown -R nextjs:nodejs /usr/local/lib/node_modules && \
    chown -R nextjs:nodejs /usr/local/bin

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# On s'assure que tout le dossier /app appartient à nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Commande de démarrage
CMD prisma migrate deploy && node server.js