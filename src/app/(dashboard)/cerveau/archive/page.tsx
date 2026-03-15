import { Suspense, type ReactElement } from 'react'
import { ArchiveView } from '@/components/cerveau/archive/ArchiveView'

export const metadata = { title: 'Archive · Cerveau' }

/** Page /cerveau/archive — historique de toutes les entrées complétées/annulées. */
export default function ArchivePage(): ReactElement {
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
          🗂 Archive
        </h1>
      </div>

      {/* Suspense requis par useSearchParams dans ArchiveView */}
      <Suspense
        fallback={
          <div
            style={{
              textAlign:  'center',
              color:      'var(--muted)',
              fontFamily: 'var(--font-body)',
              fontSize:   '14px',
              padding:    '40px 0',
            }}
          >
            Chargement…
          </div>
        }
      >
        <ArchiveView />
      </Suspense>

    </div>
  )
}
