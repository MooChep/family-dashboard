import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/cerveau/dashboard ──

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  try {
    // ── Requêtes parallèles principales ──
    const [
      overdue,
      discussions,
      today,
      todosRaw,
      projectsRaw,
      listsRaw,
      pinned,
      events,
      statsTotal,
      statsTodos,
      statsReminders,
      statsDiscussions,
    ] = await Promise.all([
      // EN RETARD — Rappels et Todos avec dueDate dépassée
      prisma.entry.findMany({
        where: {
          status:  'OPEN',
          dueDate: { lt: todayStart },
          type:    { in: ['REMINDER', 'TODO'] },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // DISCUSSIONS — ouvertes, urgentes en premier, limite 3
      prisma.entry.findMany({
        where:   { type: 'DISCUSSION', status: 'OPEN' },
        orderBy: [{ isUrgent: 'desc' }, { updatedAt: 'desc' }],
        take:    3,
      }),

      // AUJOURD'HUI — dueDate ou startDate dans la journée courante
      prisma.entry.findMany({
        where: {
          status: 'OPEN',
          OR: [
            { dueDate:   { gte: todayStart, lt: todayEnd } },
            { startDate: { gte: todayStart, lt: todayEnd } },
          ],
        },
        orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
      }),

      // TODOS — jusqu'à 50 pour tri en mémoire, puis slice à 5
      // TODO (S17) : trier par priorité une fois le champ ajouté au schéma
      prisma.entry.findMany({
        where:   { type: 'TODO', status: 'OPEN' },
        orderBy: { dueDate: 'asc' },
        take:    50,
      }),

      // PROJETS — actifs ou en pause, limite 3
      prisma.entry.findMany({
        where:   { type: 'PROJECT', status: { in: ['OPEN', 'PAUSED'] } },
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
        take:    3,
      }),

      // LISTES — avec items non archivés, limite 3
      prisma.entry.findMany({
        where:   { type: 'LIST', status: 'OPEN' },
        orderBy: { updatedAt: 'desc' },
        take:    3,
      }),

      // NOTES ÉPINGLÉES
      prisma.entry.findMany({
        where:   { type: 'NOTE', isPinned: true, status: 'OPEN' },
        orderBy: { updatedAt: 'desc' },
      }),

      // ÉVÉNEMENTS — à venir, limite 4
      prisma.entry.findMany({
        where:   { type: 'EVENT', startDate: { gte: now }, status: 'OPEN' },
        orderBy: { startDate: 'asc' },
        take:    4,
      }),

      // STATS
      prisma.entry.count({ where: { status: 'OPEN' } }),
      prisma.entry.count({ where: { type: 'TODO',       status: 'OPEN' } }),
      prisma.entry.count({ where: { type: 'REMINDER',   status: 'OPEN' } }),
      prisma.entry.count({ where: { type: 'DISCUSSION', status: 'OPEN' } }),
    ])

    // ── Todos : nulls last, puis dueDate ASC ──
    const todos = todosRaw
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
      .slice(0, 5)

    // ── Progression des projets ──
    const projectIds = projectsRaw.map((p) => p.id)

    const [projectTotals, projectDone] = await Promise.all([
      prisma.entry.groupBy({
        by:    ['projectId'],
        where: { projectId: { in: projectIds } },
        _count: { id: true },
      }),
      prisma.entry.groupBy({
        by:    ['projectId'],
        where: { projectId: { in: projectIds }, status: { in: ['DONE', 'CANCELLED'] } },
        _count: { id: true },
      }),
    ])

    const totalByProject = Object.fromEntries(
      projectTotals.map((r) => [r.projectId, r._count.id])
    )
    const doneByProject = Object.fromEntries(
      projectDone.map((r) => [r.projectId, r._count.id])
    )

    const projects = projectsRaw.map((p) => {
      const entryCount = totalByProject[p.id] ?? 0
      const doneCount  = doneByProject[p.id]  ?? 0
      // Progression = entrées terminées / total entrées du projet
      const progress   = entryCount > 0 ? Math.round((doneCount / entryCount) * 100) : 0
      return { ...p, progress, entryCount }
    })

    // ── Compteurs d'items des listes ──
    const listIds = listsRaw.map((l) => l.id)

    const [listTotals, listUnchecked] = await Promise.all([
      prisma.listItem.groupBy({
        by:    ['entryId'],
        where: { entryId: { in: listIds }, archivedAt: null },
        _count: { id: true },
      }),
      prisma.listItem.groupBy({
        by:    ['entryId'],
        where: { entryId: { in: listIds }, archivedAt: null, checked: false },
        _count: { id: true },
      }),
    ])

    const itemCountByList = Object.fromEntries(
      listTotals.map((r) => [r.entryId, r._count.id])
    )
    const uncheckedByList = Object.fromEntries(
      listUnchecked.map((r) => [r.entryId, r._count.id])
    )

    const lists = listsRaw.map((l) => ({
      ...l,
      itemCount:     itemCountByList[l.id] ?? 0,
      uncheckedCount: uncheckedByList[l.id] ?? 0,
    }))

    return NextResponse.json({
      overdue,
      discussions,
      today,
      todos,
      projects,
      lists,
      pinned,
      events,
      stats: {
        total:       statsTotal,
        todos:       statsTodos,
        reminders:   statsReminders,
        discussions: statsDiscussions,
      },
    })
  } catch (err) {
    console.error('[GET /api/cerveau/dashboard]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
