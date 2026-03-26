'use client'

import { useEffect } from 'react'
import type { EntryType } from '@prisma/client'
import { StickyNote, CheckSquare, Bell, List, FolderOpen, MessageCircle, Calendar } from 'lucide-react'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<EntryType, React.ElementType> = {
  NOTE:       StickyNote,
  TODO:       CheckSquare,
  REMINDER:   Bell,
  LIST:       List,
  PROJECT:    FolderOpen,
  DISCUSSION: MessageCircle,
  EVENT:      Calendar,
}

const ENTRY_TYPES: EntryType[] = ['NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT']

interface TypeSelectorProps {
  selected: EntryType
  onSelect: (type: EntryType) => void
  inline?: boolean
  onClose?: () => void
}

export function TypeSelector({ selected, onSelect, inline = false, onClose }: TypeSelectorProps) {
  useEffect(() => {
    if (inline || !onClose) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [inline, onClose])

  const list = (
    <div className={cn('flex flex-col gap-0.5', inline ? '' : 'py-2')}>
      {ENTRY_TYPES.map(type => {
        const Icon = TYPE_ICONS[type]
        const meta = TYPE_CONFIG[type]
        const active = selected === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => { onSelect(type); if (!inline) onClose?.() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left w-full"
            style={{
              backgroundColor: active
                ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                : 'transparent',
            }}
          >
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', meta.color)}>
              <Icon size={15} className="text-white" />
            </span>
            <span
              className={cn('font-body text-sm', active && 'font-medium')}
              style={{ color: active ? 'var(--accent)' : 'var(--text)' }}
            >
              {meta.label}
            </span>
            {active && (
              <span className="ml-auto font-mono text-xs" style={{ color: 'var(--accent)' }}>✓</span>
            )}
          </button>
        )
      })}
    </div>
  )

  if (inline) return list

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/45" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-3 pt-3 pb-8"
        style={{ backgroundColor: 'var(--surface2)' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ backgroundColor: 'var(--border)' }} />
        <p className="font-mono text-xs uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--muted)' }}>
          Type d&apos;entrée
        </p>
        {list}
      </div>
    </>
  )
}
