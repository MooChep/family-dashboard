'use server'

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const invitationKey = formData.get('invitationKey') as string

  // 1. Sécurité Invitation
  if (invitationKey !== process.env.REGISTRATION_SECRET) {
    return { error: "Clé d'invitation invalide." }
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

    // 2. RECHERCHE DU THÈME (Fix TypeScript null)
    const themeRecord = await prisma.theme.findFirst({
      where: { 
        OR: [
          { name: 'dark-green-1773092334564' },
          { name: 'dark' },
          { isDefault: true }
        ]
      }
    }) || await prisma.theme.findFirst();

    // Si vraiment aucun thème n'existe en BDD
    if (!themeRecord) {
      return { error: "Erreur système : Aucun thème disponible en base." }
    }

    // Extraction du nom (TypeScript sait maintenant qu'il n'est pas null)
    const selectedThemeName = themeRecord.name;

    // 3. Hashage et Création
    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        config: {
          create: {
            themeId: selectedThemeName,
            preferences: JSON.stringify({}),
          }
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Erreur registration:', error)
    return { error: 'Une erreur est survenue lors de la création' }
  }
}