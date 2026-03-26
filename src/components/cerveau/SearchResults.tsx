'use client'

import { CheckCircle2, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import type { SearchResult, MatchRange } from '@/lib/cerveau/search'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'
import type { EntryWithRelations } from '@/lib/cerveau/types'

// ── HighlightedText ────────────────────────────────────────────────────────

function HighlightedText({ text, ranges }: { text: string; ranges?: MatchRange[] }) {
  if (!ranges || ranges.length === 0) return <span>{text}</span>

  const segments: { text: string; highlight: boolean }[] = []
  let pos = 0

  for (const range of ranges) {
    if (range.start > pos) {
      segments.push({ text: text.slice(pos, range.start), highlight: false })
    }
    if (range.start < range.end) {
      segments.push({ text: text.slice(range.start, range.end), highlight: true })
    }
    pos = range.end
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), highlight: false })
  }

  return (
    <span>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="rounded-[2px] px-0 font-semibold"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  )
}

// ── Level badge ────────────────────────────────────────────────────────────

const LEVEL_LABEL = {
  exact: null,     // no badge — most common, no noise
  fuzzy: 'approx',
  anagram: '~',
} as const

// ── SearchResults ──────────────────────────────────────────────────────────

interface SearchResultsProps {
  results:      SearchResult[]
  query:        string
  refetch:      () => void
  showToast:    ToastFn
  onOpenDetail: (entry: EntryWithRelations) => void
}

export function SearchResults({ results, query, refetch, showToast, onOpenDetail }: SearchResultsProps) {
  if (results.length === 0 && query.trim().length > 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
          Aucun résultat pour « {query} »
        </p>
      </div>
    )
  }

  async function handleDone(id: string) {
    try {
      const res = await fetch(`/api/cerveau/entries/${id}/done`, { method: 'POST' })
      if (!res.ok) { showToast('Erreur', 'error'); return }
      refetch()
      showToast('Marqué comme fait', 'success')
    } catch {
      showToast('Erreur', 'error')
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/cerveau/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) { showToast('Erreur', 'error'); return }
      refetch()
      showToast('Archivé', 'success')
    } catch {
      showToast('Erreur', 'error')
    }
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {results.map(({ entry, level, titleRanges }) => {
        const meta = TYPE_CONFIG[entry.type]
        const levelLabel = LEVEL_LABEL[level]
        const bodySnippet = entry.body
          ? entry.body.slice(0, 80) + (entry.body.length > 80 ? '…' : '')
          : null

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-4 py-3 group cursor-pointer transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--surface)' }}
            onClick={() => onOpenDetail(entry)}
          >
            {/* Type badge */}
            <span
              className={cn('shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white', meta.color)}
            >
              {meta.label}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                <HighlightedText text={entry.title} ranges={titleRanges} />
                {levelLabel && (
                  <span className="ml-1.5 text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
                    {levelLabel}
                  </span>
                )}
              </p>
              {bodySnippet && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--muted)' }}>
                  {bodySnippet}
                </p>
              )}
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="shrink-0 flex gap-1" onClick={e => e.stopPropagation()}>
              {(entry.type === 'TODO' || entry.type === 'REMINDER') && (
                <button
                  type="button"
                  onClick={() => handleDone(entry.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--surface2)', color: 'var(--success, #22c55e)' }}
                  aria-label="Marquer comme fait"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleArchive(entry.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                aria-label="Archiver"
              >
                <Archive size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
