'use client'

import { type ReactElement } from 'react'
import { EntryRow, type DashboardEntry } from './EntryRow'

// ── Types ──

interface OverdueSectionProps {
  entries: DashboardEntry[]
}

// ── Composant ──

/**
 * Section EN RETARD — absente si vide.
 * Toutes les entrées affichées (pas de limite), sans lien "voir tout".
 */
export function OverdueSection({ entries }: OverdueSectionProps): ReactElement | null {
  if (entries.length === 0) return null

  return (
    <div style={{ marginBottom: '20px' }}>

      {/* ── En-tête ── */}
      <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
        <span
          style={{
            fontSize:      '11px',
            fontWeight:    700,
            color:         'var(--error)',
            fontFamily:    'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          En retard
        </span>
        <span style={{ fontSize: '10px', color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>
          ({entries.length})
        </span>
        {/* Indicateur pulse */}
        <span
          style={{
            display:      'inline-block',
            width:        '6px',
            height:       '6px',
            borderRadius: '50%',
            background:   'var(--error)',
            boxShadow:    '0 0 6px var(--error)',
          }}
        />
      </div>

      {/* ── Entrées ── */}
      <div
        style={{
          background:   'var(--surface)',
          border:       '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
          borderRadius: '12px',
          overflow:     'hidden',
        }}
      >
        {entries.map((entry, i) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            meta={
              <span
                style={{
                  fontSize:      '9px',
                  fontFamily:    'var(--font-mono)',
                  color:         'var(--error)',
                  background:    'color-mix(in srgb, var(--error) 12%, transparent)',
                  border:        '1px solid color-mix(in srgb, var(--error) 25%, transparent)',
                  borderRadius:  '4px',
                  padding:       '1px 5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                retard
              </span>
            }
          />
        ))}
      </div>

    </div>
  )
}
