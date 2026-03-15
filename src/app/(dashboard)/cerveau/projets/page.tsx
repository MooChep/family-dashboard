import { type ReactElement } from 'react'
import { ProjectsPanel } from '@/components/cerveau/projects/ProjectsPanel'

export const metadata = { title: 'Projets · Cerveau' }

/** Page /cerveau/projets — tous les projets actifs avec progression. */
export default function ProjetsPage(): ReactElement {
  return (
    <div style={{ padding: '0 16px 100px' }}>

      {/* ── En-tête ── */}
      <div style={{ padding: '16px 0 12px' }}>
        <h1
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '14px',
            fontWeight:    700,
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin:        0,
          }}
        >
          ◈ Projets
        </h1>
      </div>

      <ProjectsPanel />

    </div>
  )
}
