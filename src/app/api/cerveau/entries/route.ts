import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type EntryType, type EntryAssignee, type EntrySource, type EntryPriority, type EntryStatus } from '@prisma/client'
import { invalidateUserWeightsCache } from '@/lib/cerveau/nlp'

// ── Helpers durée ISO 8601 ──

/**
 * Applique une durée ISO 8601 à une date de base.
 * Supporte le préfixe "-" pour la soustraction (ex: "-P1D" = 1 jour avant).
 * Format supporté : P[nD][T[nH][nM][nS]]
 */
function applyIsoDuration(base: Date, iso: string): Date {
  const negative = iso.startsWith('-')
  const str      = negative ? iso.slice(1) : iso
  const match    = str.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!match) return base
  const days    = parseInt(match[1] ?? '0', 10)
  const hours   = parseInt(match[2] ?? '0', 10)
  const minutes = parseInt(match[3] ?? '0', 10)
  const seconds = parseInt(match[4] ?? '0', 10)
  const totalMs = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000
  return new Date(base.getTime() + (negative ? -totalMs : totalMs))
}

// ── Poids de tri pour la priorité (décroissant) ──
const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

// ── GET /api/cerveau/entries ──

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type     = searchParams.get('type')     as EntryType | null
  const status   = searchParams.get('status')   as EntryStatus | null
  const assignee = searchParams.get('assignee') as EntryAssignee | null
  const priority = searchParams.get('priority') as EntryPriority | null
  const upcoming = searchParams.get('upcoming') === 'true'

  try {
    const entries = await prisma.entry.findMany({
      where: {
        ...(type     && { type }),
        status:        status ?? 'OPEN',
        ...(assignee  && { assignedTo: assignee }),
        ...(priority  && { priority }),
        // upcoming=true : événements dont startDate est dans le futur
        ...(upcoming  && { startDate: { gte: new Date() } }),
      },
      orderBy: { createdAt: 'desc' },
      include: type === 'LIST' ? {
        listItems: {
          where:  { archivedAt: null },
          select: { checked: true, archivedAt: true },
        },
      } : undefined,
    })

    // ── Tri JS : EVENT → startDate ASC ; autres → priorité DESC puis dueDate ASC null-last ──
    const sorted = type === 'EVENT'
      ? entries.sort((a, b) => {
          if (!a.startDate && !b.startDate) return 0
          if (!a.startDate) return 1
          if (!b.startDate) return -1
          return a.startDate.getTime() - b.startDate.getTime()
        })
      : entries.sort((a, b) => {
          const pa = a.priority ? (PRIORITY_WEIGHT[a.priority] ?? 0) : 0
          const pb = b.priority ? (PRIORITY_WEIGHT[b.priority] ?? 0) : 0
          if (pa !== pb) return pb - pa
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.getTime() - b.dueDate.getTime()
        })

    // ── Enrichissement PROJECT : doneCount + totalCount pour la barre de progression ──
    if (type === 'PROJECT' && sorted.length > 0) {
      const projectIds = sorted.map((p) => p.id)
      const [totals, done] = await Promise.all([
        prisma.entry.groupBy({
          by:    ['projectId'],
          where: { projectId: { in: projectIds }, type: { not: 'NOTE' } },
          _count: { id: true },
        }),
        prisma.entry.groupBy({
          by:    ['projectId'],
          where: {
            projectId: { in: projectIds },
            type:      { not: 'NOTE' },
            status:    { in: ['DONE', 'CANCELLED'] },
          },
          _count: { id: true },
        }),
      ])

      const totalByProject = Object.fromEntries(totals.map((r) => [r.projectId, r._count.id]))
      const doneByProject  = Object.fromEntries(done.map((r) => [r.projectId, r._count.id]))

      const enriched = sorted.map((p) => ({
        ...p,
        totalCount: totalByProject[p.id] ?? 0,
        doneCount:  doneByProject[p.id]  ?? 0,
      }))
      return NextResponse.json(enriched)
    }

    return NextResponse.json(sorted)
  } catch (err) {
    console.error('[GET /api/cerveau/entries]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Types ──

interface PostBody {
  // ─── Commun ───────────────────────────────────────────
  type:             EntryType
  content:          string
  predicted?:       EntryType       // pour feedback NLP passif
  assignedTo?:      EntryAssignee
  tags?:            string[]
  projectId?:       string
  projectRef?:      string          // nom du projet → résolu en projectId côté serveur
  listRef?:         string          // nom de la liste liée (référence uniquement)
  source?:          EntrySource
  attachmentPath?:  string
  isUrgent?:        boolean

  // ─── Temporel ─────────────────────────────────────────
  dueDate?:         string          // ISO 8601 — obligatoire si REMINDER
  recurrenceRule?:  string

  // ─── Événement ────────────────────────────────────────
  startDate?:       string          // ISO 8601 — obligatoire si EVENT
  endDate?:         string
  allDay?:          boolean
  location?:        string
  eventReminders?:  string[]        // délais ISO 8601 duration

  // ─── Lieu ─────────────────────────────────────────────
  placeId?:         string
}

// ── POST /api/cerveau/entries ──

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: PostBody
  try {
    body = await request.json() as PostBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // ── Validation ──
  if (!body.type || !body.content?.trim()) {
    return NextResponse.json({ error: 'type et content sont requis' }, { status: 400 })
  }
  if (body.type === 'REMINDER' && !body.dueDate) {
    return NextResponse.json({ error: 'dueDate est obligatoire pour un Rappel' }, { status: 400 })
  }
  if (body.type === 'EVENT' && !body.startDate) {
    return NextResponse.json({ error: 'startDate est obligatoire pour un Événement' }, { status: 400 })
  }
  if (body.type === 'PROJECT' && body.content.trim().length < 2) {
    return NextResponse.json({ error: 'Le nom du projet doit faire au moins 2 caractères' }, { status: 400 })
  }

  const userId = session.user.id

  try {
    const entry = await prisma.$transaction(async (tx) => {
      // ── 1. Résoudre le projectId si projectRef fourni ──
      let projectId = body.projectId
      if (!projectId && body.projectRef) {
        const project = await tx.entry.findFirst({
          where: { type: 'PROJECT', content: body.projectRef, authorId: userId },
          select: { id: true },
        })
        if (project) projectId = project.id
      }

      // ── 2. Créer l'Entry ──
      const newEntry = await tx.entry.create({
        data: {
          type:            body.type,
          content:         body.content.trim(),
          authorId:        userId,
          assignedTo:      body.assignedTo  ?? 'SHARED',
          source:          body.source      ?? 'CAPTURE',
          isUrgent:        body.isUrgent    ?? false,
          ...(body.dueDate        && { dueDate:        new Date(body.dueDate)        }),
          ...(body.recurrenceRule && { recurrenceRule: body.recurrenceRule           }),
          ...(body.startDate      && { startDate:      new Date(body.startDate)      }),
          ...(body.endDate        && { endDate:        new Date(body.endDate)        }),
          ...(body.allDay         && { allDay:         body.allDay                   }),
          ...(body.location       && { location:       body.location                 }),
          ...(projectId           && { projectId                                     }),
          ...(body.placeId        && { placeId:        body.placeId                  }),
          ...(body.attachmentPath && { attachmentPath: body.attachmentPath           }),
        },
      })

      // ── 3. Créer les tags (upsert) ──
      const tags = Array.isArray(body.tags) ? body.tags : []
      for (const tagName of tags) {
        const tag = await tx.tag.upsert({
          where:  { name: tagName },
          create: { name: tagName },
          update: {},
        })
        await tx.entryTag.create({
          data: { entryId: newEntry.id, tagId: tag.id },
        })
      }

      // ── 4. Configurer les rappels d'événement ──
      const eventReminders = Array.isArray(body.eventReminders) ? body.eventReminders : []
      for (const delay of eventReminders) {
        await tx.eventReminder.create({
          data: { entryId: newEntry.id, delay },
        })
      }

      // ── 5. Enregistrer le feedback NLP si l'utilisateur a corrigé le type ──
      const predicted  = body.predicted  ?? body.type
      const confirmed  = body.type
      if (predicted !== confirmed) {
        await tx.nlpFeedback.create({
          data: { userId, input: body.content.trim(), predicted, corrected: confirmed },
        })
        invalidateUserWeightsCache(userId)
      }

      // ── 6. Planification des notifications ──

      // REMINDER → NotificationLog à la dueDate
      if (body.type === 'REMINDER' && body.dueDate) {
        await tx.notificationLog.create({
          data: { userId, entryId: newEntry.id, type: 'REMINDER', scheduledAt: new Date(body.dueDate) },
        })
      }

      // EVENT → une NotificationLog par délai configuré
      if (body.type === 'EVENT' && body.startDate && eventReminders.length > 0) {
        const startDate = new Date(body.startDate)
        await tx.notificationLog.createMany({
          data: eventReminders.map((delay) => ({
            userId,
            entryId:     newEntry.id,
            type:        'EVENT' as const,
            scheduledAt: applyIsoDuration(startDate, delay),
          })),
        })
      }

      // DISCUSSION → notification d'enrichissement après enrichDelay minutes
      if (body.type === 'DISCUSSION') {
        const prefs = await tx.notificationPreference.findUnique({ where: { userId } })
        const delay = prefs?.enrichDelay ?? 60
        await tx.notificationLog.create({
          data: { userId, entryId: newEntry.id, type: 'ENRICHMENT', scheduledAt: new Date(Date.now() + delay * 60 * 1000) },
        })
      }

      return newEntry
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cerveau/entries]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
