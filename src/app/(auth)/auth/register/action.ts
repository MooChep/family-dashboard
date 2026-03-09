'use server'

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const invitationKey = formData.get('invitationKey') as string

  // 1. Vérification de la clé d'invitation
  if (invitationKey !== process.env.REGISTRATION_SECRET) {
    return { error: "Clé d'invitation invalide. Accès refusé." }
  }

  if (!name || !email || !password) {
    return { error: 'Tous les champs sont requis' }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return { error: 'Cet email est déjà utilisé' }
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        config: {
          create: {
            themeId: 'dark',
            preferences: JSON.stringify({}),
          }
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Erreur registration:', error)
    return { error: 'Erreur lors de la création du compte' }
  }
}