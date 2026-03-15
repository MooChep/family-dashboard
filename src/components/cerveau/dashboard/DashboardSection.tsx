'use client'

import { type ReactNode, type ReactElement } from 'react'
import Link from 'next/link'

// ── Types ──

interface DashboardSectionProps {
  title:        string
  count?:       number
  viewAllHref?: string
  children:     ReactNode
}

// ── Composant ──

/** Section générique du dashboard avec titre, compteur optionnel et lien "voir tout →". */
export function DashboardSection({
  title,
  count,
  viewAllHref,
  children,
}: DashboardSectionProps): ReactElement {
  return (
    <div style={{ marginBottom: '20px' }}>

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--muted)',
              fontFamily:    'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              style={{
                fontSize:   '10px',
                color:      'var(--muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ({count})
            </span>
          )}
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            style={{
              fontSize:       '12px',
              color:          'var(--accent)',
              fontFamily:     'var(--font-body)',
              textDecoration: 'none',
            }}
          >
            voir tout →
          </Link>
        )}
      </div>

      {/* ── Contenu ── */}
      <div
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '12px',
          overflow:     'hidden',
        }}
      >
        {children}
      </div>

    </div>
  )
}
