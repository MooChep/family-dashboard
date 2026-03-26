'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Pin, PinOff, Pencil } from 'lucide-react'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'

interface EntryContextMenuProps {
  entry:        EntryWithRelations
  position:     { x: number; y: number }
  onClose:      () => void
  actions:      {
    snooze1h:  (id: string) => Promise<void>
    togglePin: (id: string, pinned: boolean) => Promise<void>
  }
  showToast:    ToastFn
  onOpenDetail: (entry: EntryWithRelations) => void
}

export function EntryContextMenu({
  entry,
  position,
  onClose,
  actions,
  showToast: _showToast,
  onOpenDetail,
}: EntryContextMenuProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const menuItems = [
    {
      icon: Clock,
      label: 'Snooze 1h',
      action: async () => { await actions.snooze1h(entry.id); onClose() },
    },
    {
      icon: entry.pinned ? PinOff : Pin,
      label: entry.pinned ? 'Désépingler' : 'Épingler',
      action: async () => { await actions.togglePin(entry.id, !entry.pinned); onClose() },
    },
    {
      icon: Pencil,
      label: 'Modifier',
      action: () => { onClose(); onOpenDetail(entry) },
    },
  ]

  return createPortal(
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-199" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-200 min-w-40 rounded-xl overflow-hidden py-1"
        style={{
          top:             position.y,
          left:            position.x,
          backgroundColor: 'var(--surface2)',
          boxShadow:       '0 8px 32px rgba(0,0,0,.18)',
          transform:       'translateX(-100%)',
        }}
      >
        {menuItems.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onClick={() => void action()}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-opacity hover:opacity-70 active:opacity-50"
            style={{ color: 'var(--text)' }}
          >
            <Icon size={14} style={{ color: 'var(--muted)' }} />
            {label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
