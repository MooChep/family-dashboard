import { PrismaClient } from '@prisma/client'

// On instancie Prisma directement ici — pas besoin du singleton src/lib/prisma.ts
// car ce script tourne en dehors de Next.js
const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding themes...')

  // upsert = insert si n'existe pas, update si existe déjà
  // Permet de relancer le seed sans erreur de doublon
  await prisma.theme.upsert({
    where: { name: 'dark' },
    update: {
      label: 'Sombre',
      isDefault: true,
    },
    create: {
      name: 'dark',
      label: 'Sombre',
      isDefault: true,
    },
  })

  await prisma.theme.upsert({
    where: { name: 'light' },
    update: {
      label: 'Clair',
      isDefault: false,
    },
    create: {
      name: 'light',
      label: 'Clair',
      isDefault: false,
    },
  })

  console.log('Themes seeded : dark, light')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })