import { type ReactElement } from 'react'
import { ReminderList } from '@/components/cerveau/reminders/ReminderList'

export const metadata = { title: 'Rappels · Cerveau' }

/** Page /cerveau/rappels — liste des rappels avec section en retard et filtres. */
export default function RappelsPage(): ReactElement {
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
          ⏰ Rappels
        </h1>
      </div>

      <ReminderList />

    </div>
  )
}
