import { PrismaClient } from '@prisma/client'

// Singleton Prisma = une seule instance de PrismaClient dans toute l'app.
// Sans ça, Next.js en mode dev recrée une nouvelle connexion BDD à chaque
// hot reload, ce qui épuise rapidement le pool de connexions MariaDB.
// On stocke l'instance sur l'objet global Node.js qui lui survit aux reloads.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}