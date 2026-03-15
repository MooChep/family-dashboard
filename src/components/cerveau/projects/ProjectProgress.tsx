'use client'

import { type ReactElement } from 'react'

// ── Types ──

interface ProjectProgressProps {
  /** Nombre d'entrées completables terminées (status DONE ou CANCELLED). */
  done:  number
  /** Nombre total d'entrées completables (type !== NOTE). */
  total: number
}

// ── Composant ──

/** Barre de progression horizontale d'un Projet avec ratio done/total. */
export function ProjectProgress({ done, total }: ProjectProgressProps): ReactElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          flex:         1,
          height:       '4px',
          background:   'var(--surface2)',
          borderRadius: '2px',
          overflow:     'hidden',
        }}
      >
        <div
          style={{
            width:        `${pct}%`,
            height:       '100%',
            background:   'var(--cerveau-project)',
            borderRadius: '2px',
            transition:   'width 500ms ease',
          }}
        />
      </div>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize:   '10px',
          color:      total > 0 && done === total ? 'var(--cerveau-project)' : 'var(--muted)',
          flexShrink: 0,
        }}
      >
        {done}/{total}
      </span>
    </div>
  )
}
