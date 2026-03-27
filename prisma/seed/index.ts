import { PrismaClient } from '@prisma/client'
import { seedThemes } from './themes.js'
import { seedPopote } from './popote.js'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  await seedThemes(prisma)
  await seedPopote(prisma)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
