import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import webpush from 'web-push'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, NoteWithRelations, CreateNotePayload } from '@/lib/parchemin/types'

function initVapid(): boolean {
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub  = process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr'
  if (!pub || !priv) return false
  webpush.setVapidDetails(sub, pub, priv)
  return true
}

async function notifyOther(creatorEmail: string, noteTitle: string, creatorName: string, noteId: string) {
  const ILAN    = process.env.ILAN_EMAIL    ?? ''
  const CAMILLE = process.env.CAMILLE_EMAIL ?? ''
  const otherEmail = creatorEmail === ILAN ? CAMILLE : creatorEmail === CAMILLE ? ILAN : null
  if (!otherEmail || !initVapid()) return

  const other = await prisma.user.findUnique({ where: { email: otherEmail } })
  if (!other) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId: other.id } })
  const payload = JSON.stringify({
    title: 'Nouvelle note',
    body:  `"${noteTitle}" créée par ${creatorName} !`,
    url:   `/parchemin/${noteId}`,
    actions: [
      { action: 'open',      label: '📖 Voir !' },
      { action: 'snooze_2h', label: '⏳ Patience', minutes: 120 },
      { action: 'pin',       label: '📌 Clouer' },
    ],
  })
  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  )
}

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const notes = await prisma.parcheminNote.findMany({
      where: { archivedAt: null },
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
      orderBy: [
        { pinned:    'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return Response.json({ success: true, data: notes } satisfies ApiResponse<NoteWithRelations[]>)
  } catch (error) {
    console.error('[parchemin/notes GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: CreateNotePayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.title?.trim()) {
    return Response.json({ success: false, error: 'title est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const note = await prisma.parcheminNote.create({
      data: {
        title:       body.title.trim(),
        format:      body.format ?? 'TEXT',
        body:        body.body,
        parentId:    body.parentId,
        pinned:      body.pinned ?? false,
        dueDate:     body.dueDate ? new Date(body.dueDate) : null,
        createdById: session.user.id,
        items: body.items?.length
          ? { create: body.items.map((label, index) => ({ label, order: index })) }
          : undefined,
      },
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
    })

    // Notification à l'autre membre si préférence activée
    const creatorEmail = session.user.email ?? ''
    const creatorName  = session.user.name  ?? ''
    if (creatorEmail) {
      try {
        const prefs = await prisma.parcheminPreferences.findUnique({ where: { userId: session.user.id } })
        if (prefs?.notifyOnCreate ?? true) {
          void notifyOther(creatorEmail, note.title, creatorName, note.id)
        }
      } catch {
        void notifyOther(creatorEmail, note.title, creatorName, note.id)
      }
    }

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>, { status: 201 })
  } catch (error) {
    console.error('[parchemin/notes POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
