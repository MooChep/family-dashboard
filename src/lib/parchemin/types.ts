import type { ParcheminNote, ParcheminItem, NoteFormat } from '@prisma/client'

export type { NoteFormat }

export type NoteWithRelations = ParcheminNote & {
  items:    ParcheminItem[]
  children: ParcheminNote[]
  parent:   ParcheminNote | null
}

export type CreateNotePayload = {
  title:     string
  format:    NoteFormat
  body?:     string | null
  parentId?: string
  items?:    string[]
  pinned?:   boolean
  dueDate?:  string | null
}

export type UpdateNotePayload = Partial<CreateNotePayload> & {
  notifAt?:    string | null
  notifTo?:    string | null
  notifBody?:  string | null
  archivedAt?: string | null
}

export type ApiResponse<T> = {
  success: boolean
  data?:   T
  error?:  string
}
