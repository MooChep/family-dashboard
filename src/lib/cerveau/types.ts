import type { CerveauEntry, CerveauListItem, EntryType, Priority, AssignedTo, EntryStatus } from '@prisma/client'

// ─── Types de base re-exportés ────────────────────────
export type { EntryType, Priority, AssignedTo, EntryStatus }

// ─── Entry enrichie avec ses relations ───────────────
// tags est désérialisé depuis JSON string → string[] dans les API routes
export type EntryWithRelations = Omit<CerveauEntry, 'tags'> & {
  listItems: CerveauListItem[]
  children: CerveauEntry[]
  parent: CerveauEntry | null
  tags: string[]
}

// ─── Payload de création (depuis le capture bar) ─────
export type CreateEntryPayload = {
  type: EntryType
  title: string
  body?: string
  priority?: Priority
  assignedTo?: AssignedTo
  dueDate?: string        // ISO string
  remindAt?: string       // ISO string
  listItems?: string[]    // labels seulement à la création
  parentId?: string
  tags?: string[]
  recurrence?: string
}

// ─── Payload de mise à jour ───────────────────────────
export type UpdateEntryPayload = Partial<CreateEntryPayload> & {
  status?: EntryStatus
  pinned?: boolean
  snoozedUntil?: string
}

// ─── Réponse API standard ─────────────────────────────
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}
