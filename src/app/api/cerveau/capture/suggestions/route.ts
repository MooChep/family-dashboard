import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/cerveau/capture/suggestions ──

/**
 * Retourne toutes les listes et projets actifs pour alimenter le dropdown
 * de suggestions de la CaptureBar. Filtrage par préfixe côté client (S09).
 * S31 ajoutera le filtrage serveur par préfixe.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [lists, projects] = await Promise.all([
    prisma.cerveauEntry.findMany({
      where:   { type: 'LIST', status: { in: ['ACTIVE', 'SNOOZED'] } },
      select:  { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    prisma.cerveauEntry.findMany({
      where:   { type: 'PROJECT', status: { in: ['ACTIVE', 'SNOOZED'] } },
      select:  { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  return NextResponse.json({ lists, projects })
}
