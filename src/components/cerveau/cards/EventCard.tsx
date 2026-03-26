import { BaseCard } from '@/components/cerveau/BaseCard'
import { formatAbsolute, formatCountdown } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export function EventCard({ entry, actions, onOpenDetail }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  const d         = entry.dueDate ? new Date(entry.dueDate) : null
  const dateStr   = d ? formatAbsolute(d)   : null
  const countdown = d ? formatCountdown(d)  : null

  return (
    <BaseCard entry={entry} actions={actions} onOpenDetail={onOpenDetail}>
      <p className="font-headline text-base" style={{ color: 'var(--text)' }}>{entry.title}</p>
      {dateStr && (
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>{dateStr}</p>
      )}
      {countdown && (
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>{countdown}</p>
      )}
    </BaseCard>
  )
}
