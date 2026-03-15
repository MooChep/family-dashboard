import { type ReactElement } from 'react'
import { DiscussionList } from '@/components/cerveau/discussions/DiscussionList'

export const metadata = { title: 'Discussions · Cerveau' }

/** Page /cerveau/discussions — liste des discussions à avoir. */
export default function DiscussionsPage(): ReactElement {
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
          ◈ Discussions
        </h1>
      </div>

      <DiscussionList />

    </div>
  )
}
