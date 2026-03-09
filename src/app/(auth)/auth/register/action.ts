'use server'

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function registerUser(formData: FormData) {
  // Extraction des données du formulaire
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const invitationKey = formData.get('invitationKey') as string

  // 1. Vérification de la clé d'invitation (Sécurité Admin)
  if (invitationKey !== process.env.REGISTRATION_SECRET) {
    return { error: "Clé d'invitation invalide. Accès refusé." }
  }

  // 2. Validation des champs
  if (!name || !email || !password) {
    return { error: 'Tous les champs sont requis' }
  }

  try {
    // 3. Vérification si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return { error: 'Cet email est déjà utilisé' }
    }

    // 4. RÉSOLUTION DU BUG THEME : On récupère un thème valide en BDD
    // On cherche d'abord le thème par défaut, sinon le premier disponible
    const defaultTheme = await prisma.theme.findFirst({
      where: { isDefault: true }
    }) || await prisma.theme.findFirst();

    if (!defaultTheme) {
      console.error("ERREUR : Aucun thème trouvé en base de données. Lancez le seed !");
      return { error: "Configuration système incomplète (Thèmes manquants). Contactez l'administrateur." }
    }

    // 5. Hashage du mot de passe avec bcryptjs
    const hashedPassword = await hash(password, 12)

    // 6. Création de l'utilisateur et de sa config dans une seule transaction
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        config: {
          create: {
            themeId: defaultTheme.name, // Utilise le nom réel trouvé en BDD (ex: "dark" ou "Dark")
            preferences: JSON.stringify({}),
          }
        }
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erreur registration détaillée:', error)
    return { error: 'Erreur lors de la création du compte sur le serveur' }
  }
}