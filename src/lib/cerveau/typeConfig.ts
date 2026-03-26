import type { EntryType } from '@prisma/client'

export type TypeMeta = {
  label: string
  color: string        // Tailwind bg class (badge/icon background)
  borderClass: string  // Tailwind border-l color class
  feminine: boolean
}

export const TYPE_CONFIG: Record<EntryType, TypeMeta> = {
  NOTE:       { label: 'Note',       color: 'bg-gray-500',   borderClass: 'border-gray-500',   feminine: true  },
  TODO:       { label: 'Todo',       color: 'bg-blue-500',   borderClass: 'border-blue-500',   feminine: false },
  REMINDER:   { label: 'Rappel',     color: 'bg-orange-500', borderClass: 'border-orange-500', feminine: false },
  LIST:       { label: 'Liste',      color: 'bg-green-500',  borderClass: 'border-green-500',  feminine: true  },
  PROJECT:    { label: 'Projet',     color: 'bg-purple-500', borderClass: 'border-purple-500', feminine: false },
  DISCUSSION: { label: 'Discussion', color: 'bg-pink-500',   borderClass: 'border-pink-500',   feminine: true  },
  EVENT:      { label: 'Événement',  color: 'bg-red-500',    borderClass: 'border-red-500',    feminine: false },
}
