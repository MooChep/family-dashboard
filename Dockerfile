# ─────────────────────────────────────────────────────────────────────────────
# Family Dashboard — Dockerfile multi-stage
#
# Stack : Next.js 14 (App Router) · Prisma · MariaDB · BullMQ/Redis
# Déployé sur OVH VPS via Docker + Nginx
#
# Stage 1 (builder) : compile l'app Next.js en mode standalone + génère le
#                     client Prisma pour linux-musl (Alpine).
# Stage 2 (runner)  : image minimale de production, exécute les migrations
#                     Prisma puis démarre le serveur Next.js.
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1 : builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# libc6-compat est requis par Prisma sur Alpine (glibc shim)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copier les manifestes en premier pour profiter du cache layer npm
COPY package.json package-lock.json* ./

# Certains packages (ex: sharp) s'attendent à trouver /app/public au build
RUN mkdir -p /app/public

# Installation stricte des dépendances (respecte package-lock.json)
RUN npm ci

# Copier le reste des sources après npm ci pour maximiser le cache
COPY . .

# DATABASE_URL est nécessaire au moment de `prisma generate` (résolution du
# provider). Elle n'est PAS embarquée dans l'image finale — uniquement dans
# le layer builder qui est écarté.
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Génère le client Prisma ciblant linux-musl-openssl-3.0.x (voir schema.prisma
# binaryTargets) puis compile Next.js en mode standalone (output: 'standalone'
# dans next.config.js).
RUN npx prisma generate
RUN npm run build

# ─── Stage 2 : runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Mode production strict + désactivation de la télémétrie Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# openssl  : requis par le client Prisma (chiffrement connexion MariaDB)
# libc6-compat : idem builder — Prisma engine en Alpine
RUN apk add --no-cache openssl libc6-compat

# Utilisateur système non-root pour limiter la surface d'attaque
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Prisma CLI installé globalement pour pouvoir lancer `prisma migrate deploy`
# au démarrage du conteneur. Les droits sur node_modules global sont délégués
# à nextjs pour que Prisma puisse écrire ses engines au runtime.
RUN npm install -g prisma@5.10.0 && \
    chown -R nextjs:nodejs /usr/local/lib/node_modules && \
    chown -R nextjs:nodejs /usr/local/bin

# ─── Copie des artefacts du stage builder ────────────────────────────────────

# Fichiers statiques publics (favicon, icons PWA, sw.js…)
COPY --from=builder /app/public ./public

# Output standalone Next.js : serveur Node.js autonome sans node_modules complet
COPY --from=builder /app/.next/standalone ./

# Assets statiques (_next/static) séparés du standalone par Next.js
COPY --from=builder /app/.next/static ./.next/static

# Schéma Prisma + migrations — nécessaires pour `prisma migrate deploy`
COPY --from=builder /app/prisma ./prisma

# Client Prisma généré (engines binaires pour linux-musl)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Assure que nextjs possède tous les fichiers (standalone + prisma engines)
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Au démarrage :
# 1. `prisma migrate deploy` — applique les migrations en attente (idempotent,
#    safe en production). Bloque le démarrage si la DB est inaccessible.
# 2. `node server.js` — démarre le serveur Next.js standalone.
CMD prisma migrate deploy && node server.js