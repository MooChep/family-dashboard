import { BaseCard } from '@/components/cerveau/BaseCard'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export function ListCard({ entry, actions, onOpenDetail }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  const total = entry.listItems.length
  const checked = entry.listItems.filter(i => i.checked).length
  const progress = total > 0 ? (checked / total) * 100 : 0

  return (
    <BaseCard entry={entry} actions={actions} onOpenDetail={onOpenDetail}>
      <p className="font-headline text-base" style={{ color: 'var(--text)' }}>{entry.title}</p>
      {total > 0 && (
        <>
          <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
            {checked}/{total} items
          </p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </>
      )}
    </BaseCard>
  )
}
