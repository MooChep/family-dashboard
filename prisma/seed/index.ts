import { PrismaClient } from '@prisma/client'
import { seedThemes } from './themes.js'
import { seedGamelle } from './gamelle.js'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  await seedThemes(prisma)
  await seedGamelle(prisma)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
