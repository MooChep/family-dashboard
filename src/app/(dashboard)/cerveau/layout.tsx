import { type ReactNode, type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreatePreferences } from '@/lib/cerveau/preferences'
import { initWorkers } from '@/lib/cerveau/workers'

/**
 * Layout du module Cerveau — initialise les préférences utilisateur au premier accès.
 * L'authentification est déjà vérifiée par le layout parent (dashboard).
 */
export default async function CerveauLayout({
  children,
}: {
  children: ReactNode
}): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  // Vérifie que l'utilisateur existe toujours en base (JWT peut être périmé après un reset)
  const userExists = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true },
  })

  if (!userExists) {
    redirect('/auth/login')
  }

  // Upsert silencieux : no-op si les prefs existent déjà
  await getOrCreatePreferences(session.user.id)

  // Démarre les workers BullMQ (singleton — no-op après le premier appel)
  initWorkers()

  return <>{children}</>
}
