import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'
import type { ApiResponse, NoteWithRelations } from '@/lib/parchemin/types'

const PARCHEMIN_BODIES = [
  'Par la barbe du Roi ! Vous aviez griffonné ceci sur le Parchemin... Est-ce l\'heure de s\'en occuper ou faut-il brûler la preuve ?',
  'L\'encre de votre Parchemin s\'anime : une note importante attend d\'être consultée. Libérez votre esprit, le domaine veille.',
  'Oyez, oyez ! Un édit consigné dans votre Parchemin refait surface. Le scribe vous rappelle à vos engagements pour la bonne marche du Fief.',
  'Holà ! La plume a tremblé : un écrit sur votre Parchemin requiert votre attention. Ne laissez pas cette pensée s\'envoler dans les oubliettes du domaine.',
]

function randomParcheminBody(noteTitle: string): string {
  const withTitle = `Un rappel du Parchemin : ne perdez pas le fil de vos pensées. Votre note sur "${noteTitle}" vous attend au logis.`
  const pool = [...PARCHEMIN_BODIES, withTitle]
  return pool[Math.floor(Math.random() * pool.length)]
}

const NOTIF_ACTIONS = [
  { action: 'open',      label: '📖 Voir !' },
  { action: 'snooze_2h', label: '⏳ Patience', minutes: 120 },
  { action: 'pin',       label: '📌 Clouer' },
]

const INCLUDE = {
  items:    { orderBy: { order: 'asc' as const } },
  children: true,
  parent:   true,
}

function initVapid(): boolean {
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub  = process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr'
  if (!pub || !priv) return false
  webpush.setVapidDetails(sub, pub, priv)
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params
  let body: { notifAt?: string; notifTo: string; notifBody?: string | null; sendNow?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    // ── Envoi immédiat ───────────────────────────────────────────────────────
    if (body.sendNow) {
      const now      = new Date()
      const noteData = await prisma.parcheminNote.findUnique({ where: { id }, select: { title: true, parentId: true } })

      if (initVapid()) {
        const ILAN    = process.env.ILAN_EMAIL    ?? ''
        const CAMILLE = process.env.CAMILLE_EMAIL ?? ''
        const emails  = body.notifTo === 'BOTH'
          ? [ILAN, CAMILLE].filter(Boolean)
          : body.notifTo === 'ILAN'    ? [ILAN].filter(Boolean)
          : body.notifTo === 'CAMILLE' ? [CAMILLE].filter(Boolean)
          : []
        const targets = await prisma.user.findMany({ where: { email: { in: emails } } })

        for (const user of targets) {
          const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } })
          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({
                  title:   noteData?.title ?? 'Parchemin',
                  body:    body.notifBody ?? randomParcheminBody(noteData?.title ?? ''),
                  url:     noteData?.parentId ? `/parchemin/${noteData.parentId}` : `/parchemin/${id}`,
                  actions: NOTIF_ACTIONS,
                }),
              )
            } catch (err) {
              console.error('[parchemin/notif sendNow] push failed', err)
            }
          }
        }
      }

      const note = await prisma.parcheminNote.update({
        where: { id },
        data: {
          notifAt:     now,
          notifTo:     body.notifTo,
          notifBody:   body.notifBody ?? null,
          notifSentAt: now,
        },
        include: INCLUDE,
      })

      return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
    }

    // ── Rappel programmé ─────────────────────────────────────────────────────
    if (!body.notifAt) {
      return Response.json({ success: false, error: 'notifAt requis' } satisfies ApiResponse<never>, { status: 400 })
    }

    const note = await prisma.parcheminNote.update({
      where: { id },
      data: {
        notifAt:     new Date(body.notifAt),
        notifTo:     body.notifTo,
        notifBody:   body.notifBody ?? null,
        notifSentAt: null,
      },
      include: INCLUDE,
    })

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
  } catch (error) {
    console.error('[parchemin/notes/[id]/notif POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params

  try {
    const note = await prisma.parcheminNote.update({
      where: { id },
      data: {
        notifAt:     null,
        notifTo:     null,
        notifBody:   null,
        notifSentAt: null,
      },
      include: INCLUDE,
    })

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
  } catch (error) {
    console.error('[parchemin/notes/[id]/notif DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
