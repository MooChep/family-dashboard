import { BaseCard } from '@/components/cerveau/BaseCard'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export function DiscussionCard({ entry, actions, onOpenDetail }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  return (
    <BaseCard entry={entry} actions={actions} onOpenDetail={onOpenDetail}>
      <p className="font-headline text-base" style={{ color: 'var(--text)' }}>{entry.title}</p>
      {entry.body && (
        <p className="font-body text-sm leading-relaxed mt-1 line-clamp-2" style={{ color: 'var(--text2)' }}>
          {entry.body}
        </p>
      )}
    </BaseCard>
  )
}
