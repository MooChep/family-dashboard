import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type EntryType } from '@prisma/client'

// ── Types ──

interface ConvertBody {
  targetType: 'TODO' | 'NOTE' | 'PROJECT'
}

const ALLOWED_TARGETS: EntryType[] = ['TODO', 'NOTE', 'PROJECT']

// ── POST /api/cerveau/entries/[id]/convert ──

/**
 * Convertit une Discussion en Todo, Note ou Projet.
 * Le content de la Discussion devient le content de la nouvelle entrée.
 * La Discussion est supprimée définitivement dans la même transaction.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  let body: ConvertBody
  try {
    body = await request.json() as ConvertBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.targetType || !ALLOWED_TARGETS.includes(body.targetType as EntryType)) {
    return NextResponse.json({ error: 'targetType doit être TODO, NOTE ou PROJECT' }, { status: 400 })
  }

  try {
    // ── Récupérer la Discussion ──
    const discussion = await prisma.entry.findUnique({ where: { id } })

    if (!discussion) {
      return NextResponse.json({ error: 'Discussion introuvable' }, { status: 404 })
    }
    if (discussion.type !== 'DISCUSSION') {
      return NextResponse.json({ error: "L'entrée n'est pas une Discussion" }, { status: 422 })
    }

    // ── Transaction : créer la nouvelle entrée + supprimer la Discussion ──
    const [newEntry] = await prisma.$transaction([
      prisma.entry.create({
        data: {
          type:      body.targetType,
          content:   discussion.content,
          authorId:  session.user.id,
          source:    'CAPTURE',
        },
      }),
      prisma.entry.delete({ where: { id } }),
    ])

    return NextResponse.json(newEntry, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cerveau/entries/[id]/convert]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
