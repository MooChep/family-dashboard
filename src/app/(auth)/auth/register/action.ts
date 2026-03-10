'use server'

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const invitationKey = formData.get('invitationKey') as string

  if (invitationKey !== process.env.REGISTRATION_SECRET) {
    return { error: "Clé d'invitation invalide." }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: 'Email déjà utilisé' }

    // On cherche le thème 'dark' par défaut, sinon le premier dispo
    const themeRecord = await prisma.theme.findFirst({
      where: { OR: [{ name: 'dark' }, { isDefault: true }] }
    }) || await prisma.theme.findFirst()

    if (!themeRecord) return { error: "Configuration système incomplète (Thèmes)." }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        config: {
          create: {
            themeId: themeRecord.name,
            preferences: JSON.stringify({}),
          }
        }
      }
    })

    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la création' }
  }
}