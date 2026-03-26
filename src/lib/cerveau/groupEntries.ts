import type { EntryWithRelations } from '@/lib/cerveau/types'
import type { DashboardSectionData } from '@/lib/cerveau/hooks/useDashboard'
import { computeProjectHealth } from '@/lib/cerveau/projectHealth'

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()
  )
}

function isPast(date: Date): boolean {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return date < today
}

/**
 * Groups an arbitrary list of entries into dashboard sections.
 * Filters internally to ACTIVE | SNOOZED, matching useDashboard behaviour.
 */
export function groupEntries(entries: EntryWithRelations[]): DashboardSectionData[] {
  const active = entries.filter(e => e.status === 'ACTIVE' || e.status === 'SNOOZED')

  const overdue    = active.filter(e => e.dueDate && isPast(new Date(e.dueDate)))
  const overdueIds = new Set(overdue.map(e => e.id))

  const urgentSection: DashboardSectionData = {
    id: 'urgent', label: 'En retard', entries: overdue, isOverdue: true,
  }

  const todaySection: DashboardSectionData = {
    id: 'today', label: "Aujourd'hui",
    entries: active.filter(e => !overdueIds.has(e.id) && !!e.dueDate && isToday(new Date(e.dueDate))),
  }

  const todoSection: DashboardSectionData = {
    id: 'todo', label: 'Todos',
    entries: active.filter(e => e.type === 'TODO' && !overdueIds.has(e.id)),
  }

  const reminderSection: DashboardSectionData = {
    id: 'reminder', label: 'Rappels',
    entries: active.filter(e => e.type === 'REMINDER'),
  }

  const notePinnedSection: DashboardSectionData = {
    id: 'note-pinned', label: 'Notes épinglées',
    entries: active
      .filter(e => e.type === 'NOTE' && e.pinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }

  const noteSection: DashboardSectionData = {
    id: 'note', label: 'Notes',
    entries: active
      .filter(e => e.type === 'NOTE' && !e.pinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }

  const projectEntries = active.filter(e => e.type === 'PROJECT')
  const healthOrder = { red: 0, orange: 1, green: 2 } as const
  projectEntries.sort(
    (a, b) => healthOrder[computeProjectHealth(a).status] - healthOrder[computeProjectHealth(b).status],
  )
  const projectSection: DashboardSectionData = {
    id: 'project', label: 'Projets', entries: projectEntries,
  }

  const listSection: DashboardSectionData = {
    id: 'list', label: 'Listes',
    entries: active.filter(e => e.type === 'LIST'),
  }

  const discussionSection: DashboardSectionData = {
    id: 'discussion', label: 'Discussions',
    entries: active.filter(e => e.type === 'DISCUSSION'),
  }

  const eventSection: DashboardSectionData = {
    id: 'event', label: 'Événements',
    entries: active.filter(e => e.type === 'EVENT'),
  }

  return [
    urgentSection,
    todaySection,
    todoSection,
    reminderSection,
    notePinnedSection,
    projectSection,
    listSection,
    discussionSection,
    eventSection,
    noteSection,
  ].filter(s => s.entries.length > 0)
}
