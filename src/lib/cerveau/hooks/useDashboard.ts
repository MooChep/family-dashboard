'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EntryType } from '@prisma/client'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import { computeProjectHealth } from '@/lib/cerveau/projectHealth'

export type DashboardSectionData = {
  id: string
  label: string
  entries: EntryWithRelations[]
  isOverdue?: boolean
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isPast(date: Date): boolean {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return date < today
}

export function useDashboard(activeCategory: EntryType | 'ALL' = 'ALL') {
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/cerveau/entries')
      if (!res.ok) return
      const data = await res.json() as { success: boolean; data: EntryWithRelations[] }
      if (data.success) setEntries(data.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Derived sections
  const overdue = entries.filter(
    e => e.dueDate && isPast(new Date(e.dueDate)) && e.status === 'ACTIVE',
  )
  const overdueIds = new Set(overdue.map(e => e.id))

  const urgentSection: DashboardSectionData = {
    id: 'urgent',
    label: 'En retard',
    entries: overdue,
    isOverdue: true,
  }

  const todaySection: DashboardSectionData = {
    id: 'today',
    label: "Aujourd'hui",
    entries: entries.filter(
      e => !overdueIds.has(e.id) && !!e.dueDate && isToday(new Date(e.dueDate)),
    ),
  }

  const todoSection: DashboardSectionData = {
    id: 'todo',
    label: 'Todos',
    entries: entries.filter(e => e.type === 'TODO' && !overdueIds.has(e.id)),
  }

  const reminderSection: DashboardSectionData = {
    id: 'reminder',
    label: 'Rappels',
    entries: entries.filter(e => e.type === 'REMINDER'),
  }

  const notePinnedSection: DashboardSectionData = {
    id: 'note-pinned',
    label: 'Notes épinglées',
    entries: entries
      .filter(e => e.type === 'NOTE' && e.status === 'ACTIVE' && e.pinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }

  const noteSection: DashboardSectionData = {
    id: 'note',
    label: 'Notes',
    entries: entries
      .filter(e => e.type === 'NOTE' && e.status === 'ACTIVE' && !e.pinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }

  const projectEntries = entries.filter(e => e.type === 'PROJECT')
  const healthOrder = { red: 0, orange: 1, green: 2 } as const
  projectEntries.sort((a, b) =>
    healthOrder[computeProjectHealth(a).status] - healthOrder[computeProjectHealth(b).status],
  )
  const projectSection: DashboardSectionData = {
    id: 'project',
    label: 'Projets',
    entries: projectEntries,
  }

  const listSection: DashboardSectionData = {
    id: 'list',
    label: 'Listes',
    entries: entries.filter(e => e.type === 'LIST'),
  }

  const discussionSection: DashboardSectionData = {
    id: 'discussion',
    label: 'Discussions',
    entries: entries.filter(e => e.type === 'DISCUSSION'),
  }

  const eventSection: DashboardSectionData = {
    id: 'event',
    label: 'Événements',
    entries: entries.filter(e => e.type === 'EVENT'),
  }

  // Mobile: all non-empty sections ordered by relevance
  // When a category filter is active, only show the matching section(s)
  const CATEGORY_SECTION_IDS: Record<EntryType, string[]> = {
    TODO:       ['todo', 'urgent', 'today'],
    REMINDER:   ['reminder'],
    NOTE:       ['note', 'note-pinned'],
    PROJECT:    ['project'],
    LIST:       ['list'],
    DISCUSSION: ['discussion'],
    EVENT:      ['event'],
  }

  const allSections = [
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
  ].filter(s => {
    if (s.entries.length === 0) return false
    if (activeCategory === 'ALL') return true
    return CATEGORY_SECTION_IDS[activeCategory]?.includes(s.id) ?? false
  })

  return {
    entries,
    sections: allSections,
    urgentSection,
    todaySection,
    todoSection,
    reminderSection,
    notePinnedSection,
    noteSection,
    projectSection,
    listSection,
    discussionSection,
    eventSection,
    isLoading,
    refetch,
  }
}
