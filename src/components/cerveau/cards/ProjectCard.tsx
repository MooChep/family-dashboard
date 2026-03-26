'use client'

import { useState } from 'react'
import { BaseCard } from '@/components/cerveau/BaseCard'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import { computeProjectHealth } from '@/lib/cerveau/projectHealth'

const HEALTH_COLOR: Record<string, string> = {
  green:  'var(--accent)',
  orange: 'var(--warning, #b5860d)',
  red:    'var(--danger, #c0392b)',
}

export function ProjectCard({ entry, actions }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  const total    = entry.children.length
  const done     = entry.children.filter(c => c.status === 'DONE').length
  const progress = total > 0 ? (done / total) * 100 : 0

  const health    = computeProjectHealth(entry)
  const [tip, setTip] = useState(false)

  return (
    <BaseCard entry={entry} actions={actions} navigateTo={`/cerveau/projets/${entry.id}`}>
      {/* Title row + health dot */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-headline text-base flex-1" style={{ color: 'var(--text)' }}>
          {entry.title}
        </p>

        {/* Health indicator */}
        <div className="relative shrink-0 mt-1.5">
          <button
            type="button"
            className="w-2.5 h-2.5 rounded-full block"
            style={{ backgroundColor: HEALTH_COLOR[health.status] }}
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            onClick={() => setTip(v => !v)}
            aria-label={`Santé : ${health.reasons.join(', ') || 'bonne'}`}
          />
          {tip && (
            <div
              className="absolute right-0 top-4 z-20 rounded-lg px-3 py-2 shadow-float"
              style={{
                backgroundColor: 'var(--surface)',
                minWidth: '160px',
                maxWidth: '240px',
              }}
            >
              {health.reasons.length > 0 ? (
                health.reasons.map((r, i) => (
                  <p key={i} className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {r}
                  </p>
                ))
              ) : (
                <p className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
                  Projet en bonne santé
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {entry.body && (
        <p className="font-body text-sm leading-relaxed mt-1 line-clamp-2" style={{ color: 'var(--text2)' }}>
          {entry.body}
        </p>
      )}

      {total > 0 && (
        <>
          <p className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--muted)' }}>
            {done}/{total} tâches
          </p>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </>
      )}
    </BaseCard>
  )
}
