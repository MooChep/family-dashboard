import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── POST /api/cerveau/entries/[id]/dismiss-enrichment ──

/**
 * Marque la discussion comme enrichie (enrichNotifiedAt = now).
 * Appelé depuis le service worker quand l'utilisateur appuie sur "Ignorer"
 * dans la notification push d'enrichissement.
 * Empêche toute re-notification ENRICHMENT sur cette entrée.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  try {
    await prisma.entry.update({
      where: { id },
      data:  { enrichNotifiedAt: new Date() },
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[POST /api/cerveau/entries/[id]/dismiss-enrichment]', err)
    return NextResponse.json({ error: 'Entrée introuvable ou erreur serveur' }, { status: 404 })
  }
}
