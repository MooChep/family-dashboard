import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const getName = (flag: string): string | undefined =>
    args[args.indexOf(flag) + 1]

  const name     = getName('--name')
  const email    = getName('--email')
  const password = getName('--password')

  if (!name || !email || !password) {
    console.error('Usage: npm run create-user -- --name "Prénom" --email "email@famille.fr" --password "motdepasse"')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`Erreur : un utilisateur avec l'email "${email}" existe déjà`)
    process.exit(1)
  }

  // hash() chiffre le mot de passe de manière irréversible
  // 12 = "salt rounds", le coût du hachage — 12 est une valeur sûre
  const hashedPassword = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      config: {
        create: {
          themeId: 'dark',
          preferences: JSON.stringify({}),
        },
      },
    },
  })

  console.log(`✓ Utilisateur créé : ${user.name} <${user.email}> (id: ${user.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })