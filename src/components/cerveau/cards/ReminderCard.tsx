import { BaseCard } from '@/components/cerveau/BaseCard'
import { formatAbsolute } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export function ReminderCard({ entry, actions, onOpenDetail }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  const remindStr = entry.remindAt ? formatAbsolute(new Date(entry.remindAt)) : null

  return (
    <BaseCard entry={entry} actions={actions} onOpenDetail={onOpenDetail}>
      <p className="font-headline text-base" style={{ color: 'var(--text)' }}>{entry.title}</p>
      {remindStr && (
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>{remindStr}</p>
      )}
    </BaseCard>
  )
}
