'use client'

import { useRouter } from 'next/navigation'
import type { EntryType } from '@prisma/client'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'

export type CategoryFilter = EntryType | 'ALL'

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'ALL',        label: 'Tout' },
  { id: 'TODO',       label: TYPE_CONFIG.TODO.label },
  { id: 'REMINDER',   label: TYPE_CONFIG.REMINDER.label },
  { id: 'EVENT',      label: TYPE_CONFIG.EVENT.label },
  { id: 'NOTE',       label: TYPE_CONFIG.NOTE.label },
  { id: 'PROJECT',    label: TYPE_CONFIG.PROJECT.label },
  { id: 'DISCUSSION', label: TYPE_CONFIG.DISCUSSION.label },
  { id: 'LIST',       label: TYPE_CONFIG.LIST.label },
]

interface CategoryNavProps {
  active: CategoryFilter
  /** 'horizontal' for mobile strip, 'vertical' for desktop sidebar */
  layout?: 'horizontal' | 'vertical'
}

export function CategoryNav({ active, layout = 'horizontal' }: CategoryNavProps) {
  const router = useRouter()

  function select(cat: CategoryFilter) {
    const params = new URLSearchParams()
    if (cat !== 'ALL') params.set('cat', cat)
    router.push('/cerveau' + (params.size ? '?' + params.toString() : ''))
  }

  if (layout === 'vertical') {
    return (
      <div className="flex flex-col gap-1 px-3 pb-2">
        <p
          className="font-mono text-[9px] uppercase tracking-widest px-3 pb-1 pt-3"
          style={{ color: 'var(--muted)' }}
        >
          Filtrer
        </p>
        {CATEGORIES.map(cat => {
          const isActive = active === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => select(cat.id)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={
                isActive
                  ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                  : { color: 'var(--text2)' }
              }
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar"
      style={{ scrollbarWidth: 'none' }}
    >
      {CATEGORIES.map(cat => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => select(cat.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={
              isActive
                ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                : { backgroundColor: 'var(--surface2)', color: 'var(--text2)' }
            }
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
