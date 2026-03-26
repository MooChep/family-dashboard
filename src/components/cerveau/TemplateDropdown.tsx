'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import type { TemplateSuggestion } from '@/app/api/cerveau/templates/suggestions/route'
import type { ApiResponse, EntryWithRelations } from '@/lib/cerveau/types'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'

interface TemplateDropdownProps {
  suggestions:      TemplateSuggestion[]
  isLibraryShortcut: boolean   // true when * was typed alone
  onSelect:         () => void // called after successful instantiation
  refetch:          () => void
  showToast:        ToastFn
}

export function TemplateDropdown({
  suggestions,
  isLibraryShortcut,
  onSelect,
  refetch,
  showToast,
}: TemplateDropdownProps) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  // Redirect to library when * alone was typed
  useEffect(() => {
    if (isLibraryShortcut) {
      router.push('/cerveau/templates')
      onSelect()
    }
  }, [isLibraryShortcut, router, onSelect])

  if (isLibraryShortcut || suggestions.length === 0) return null

  async function handleUse(id: string) {
    try {
      const res = await fetch(`/api/cerveau/templates/${id}/use`, { method: 'POST' })
      const data = await res.json() as ApiResponse<EntryWithRelations>
      if (data.success) {
        refetch()
        showToast('Template appliqué ✓', 'success')
        onSelect()
      } else {
        showToast('Erreur lors de l\'application du template', 'error')
      }
    } catch {
      showToast('Erreur réseau', 'error')
    }
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-float z-50"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {suggestions.map(s => {
        const meta = TYPE_CONFIG[s.type]
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => void handleUse(s.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80 active:opacity-60"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono text-white ${meta.color}`}
              >
                {meta.label}
              </span>
              {s.name}
              {s.shortcut && (
                <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  *{s.shortcut}
                </span>
              )}
            </span>
            {s.itemCount > 0 && (
              <span className="text-xs font-mono shrink-0 ml-2" style={{ color: 'var(--muted)' }}>
                × {s.itemCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
