# ─── Stage 1 : dépendances ───────────────────────────────────────────────────
# "builder" installe les dépendances et compile l'app
FROM node:20-alpine AS builder

# Répertoire de travail dans le container
WORKDIR /app

# On copie d'abord uniquement les fichiers de dépendances
# pour profiter du cache Docker : si package.json n'a pas changé,
# npm install ne sera pas relancé au prochain build
COPY package.json package-lock.json* ./

RUN npm ci

# On copie le reste du code source
COPY . .

# Génère le client Prisma (fichiers TypeScript générés depuis schema.prisma)
RUN npx prisma generate

# Compile l'application Next.js
RUN npm run build

# ─── Stage 2 : production ────────────────────────────────────────────────────
# Image finale légère — ne contient que le nécessaire pour faire tourner l'app
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Crée un utilisateur non-root pour la sécurité
# (ne pas faire tourner l'app en root dans le container)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copie les fichiers compilés depuis le stage builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Donne les droits à l'utilisateur nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]