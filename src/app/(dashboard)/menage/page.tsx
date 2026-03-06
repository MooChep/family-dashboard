import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'Ménage' }

export default function MenagePage(): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <span className="text-4xl">⌂</span>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
              >
                Ménage
              </h2>
              <Badge variant="warning">en développement</Badge>
            </div>
            <p className="text-sm text-center max-w-sm" style={{ color: 'var(--muted)' }}>
              Organisation des tâches ménagères. Ce module sera disponible dans une prochaine phase.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}