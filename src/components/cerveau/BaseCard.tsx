'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { formatRelative } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'

interface BaseCardProps {
  entry:          EntryWithRelations
  children:       React.ReactNode
  actions?:       React.ReactNode
  onOpenDetail?:  (entry: EntryWithRelations) => void
  navigateTo?:    string
}

export function BaseCard({ entry, children, actions, onOpenDetail, navigateTo }: BaseCardProps) {
  const router  = useRouter()
  const meta    = TYPE_CONFIG[entry.type]
  const dateStr = formatRelative(new Date(entry.createdAt))

  function handleClick() {
    if (navigateTo) router.push(navigateTo)
    else if (onOpenDetail) onOpenDetail(entry)
  }

  return (
    <div
      className={cn(
        'group rounded-xl shadow-editorial border-l-4',
        meta.borderClass,
        (onOpenDetail || navigateTo) && 'cursor-pointer',
      )}
      style={{ backgroundColor: 'var(--surface)' }}
      onClick={onOpenDetail || navigateTo ? handleClick : undefined}
    >
      <div className="px-4 pt-3 pb-3">
        {children}

        {/* Actions slot — hidden by default, visible on group-hover (desktop) */}
        {actions && (
          <div className="mt-2.5 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
            {actions}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
              {dateStr}
            </span>
            {entry.recurrence && (
              <span
                className="font-mono text-[10px] rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                ↻ {entry.recurrence}
              </span>
            )}
          </div>
          {entry.assignedTo !== 'BOTH' && (
            <span
              className="font-mono text-xs rounded-full px-2 py-0.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {entry.assignedTo === 'ILAN' ? 'Ilan' : 'Camille'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
