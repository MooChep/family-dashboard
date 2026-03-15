'use client'

import { useState, type ReactElement, type ReactNode } from 'react'

// ── Types ──

interface ProjectSectionProps {
  title:          string
  count:          number
  children:       ReactNode
  /** Section repliée par défaut (ex : COMPLÉTÉS). */
  collapsedByDefault?: boolean
}

// ── Composant ──

/** Section générique pour une vue Projet : titre cliquable + contenu repliable. */
export function ProjectSection({ title, count, children, collapsedByDefault = false }: ProjectSectionProps): ReactElement {
  const [collapsed, setCollapsed] = useState(collapsedByDefault)

  return (
    <div>
      {/* ── En-tête de section ── */}
      <button
        onClick={() => { setCollapsed((v) => !v) }}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
          width:          '100%',
          padding:        '8px 20px',
          background:     'var(--surface2)',
          border:         'none',
          borderTop:      '1px solid var(--border)',
          cursor:         'pointer',
          textAlign:      'left',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '10px',
            fontWeight:    700,
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            flex:          1,
          }}
        >
          {title}
        </span>

        <span
          style={{
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            color:        'var(--muted)',
            background:   'var(--surface)',
            padding:      '1px 6px',
            borderRadius: '8px',
          }}
        >
          {count}
        </span>

        <span
          style={{
            fontFamily:  'var(--font-mono)',
            fontSize:    '10px',
            color:       'var(--muted)',
            marginLeft:  '4px',
            transition:  'transform 200ms',
            display:     'inline-block',
            transform:   collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {/* ── Contenu ── */}
      {!collapsed && (
        <div>
          {children}
        </div>
      )}
    </div>
  )
}
