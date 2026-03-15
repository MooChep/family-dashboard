import { type ReactElement } from 'react'
import { ListsPanel } from '@/components/cerveau/lists/ListsPanel'

export const metadata = { title: 'Listes · Cerveau' }

/** Page /cerveau/listes — toutes les listes actives avec items. */
export default function ListesPage(): ReactElement {
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
          ☰ Listes
        </h1>
      </div>

      <ListsPanel />

    </div>
  )
}
