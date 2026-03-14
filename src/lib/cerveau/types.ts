import {
  StickyNote, CircleCheck, BellRing, List,
  FolderKanban, MessageCircle, CalendarDays,
  type LucideIcon,
} from 'lucide-react'
import { type EntryType } from '@prisma/client'

// ── Types ──

export interface EntryTypeMeta {
  icon:     LucideIcon
  colorVar: string
  label:    string
}

// ── Métadonnées des 7 types d'entrée ──

export const ENTRY_TYPE_META: Record<EntryType, EntryTypeMeta> = {
  NOTE:       { icon: StickyNote,    colorVar: 'var(--cerveau-note)',       label: 'Note' },
  TODO:       { icon: CircleCheck,   colorVar: 'var(--cerveau-todo)',       label: 'Todo' },
  REMINDER:   { icon: BellRing,      colorVar: 'var(--cerveau-reminder)',   label: 'Rappel' },
  LIST:       { icon: List,          colorVar: 'var(--cerveau-list)',       label: 'Liste' },
  PROJECT:    { icon: FolderKanban,  colorVar: 'var(--cerveau-project)',    label: 'Projet' },
  DISCUSSION: { icon: MessageCircle, colorVar: 'var(--cerveau-discussion)', label: 'Discussion' },
  EVENT:      { icon: CalendarDays,  colorVar: 'var(--cerveau-event)',      label: 'Événement' },
}

// ── Helpers ──

/** Retourne la couleur CSS d'un type d'entrée. */
export function getTypeColor(type: EntryType): string {
  return ENTRY_TYPE_META[type].colorVar
}

/** Retourne le label localisé d'un type d'entrée. */
export function getTypeLabel(type: EntryType): string {
  return ENTRY_TYPE_META[type].label
}

/** Retourne le composant icône Lucide d'un type d'entrée. */
export function getTypeIcon(type: EntryType): LucideIcon {
  return ENTRY_TYPE_META[type].icon
}
