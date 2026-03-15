import { type ReactElement } from 'react'
import { NoteList } from '@/components/cerveau/notes/NoteList'

export const metadata = { title: 'Notes · Cerveau' }

/** Page /cerveau/notes — liste complète des notes avec section épinglées et filtres. */
export default function NotesPage(): ReactElement {
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
          ◆ Notes
        </h1>
      </div>

      <NoteList />

    </div>
  )
}
