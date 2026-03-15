import { type ReactElement } from 'react'
import { EventList } from '@/components/cerveau/events/EventList'

export const metadata = { title: 'Événements · Cerveau' }

/** Page /cerveau/evenements — liste chronologique des événements. */
export default function EvenementsPage(): ReactElement {
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
          ◉ Événements
        </h1>
      </div>

      <EventList />

    </div>
  )
}
