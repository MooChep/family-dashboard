import { cn } from '@/lib/utils'
import { BaseCard } from '@/components/cerveau/BaseCard'
import { formatDateLongFR } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export function TodoCard({ entry, actions, onOpenDetail }: { entry: EntryWithRelations; actions?: React.ReactNode; onOpenDetail?: (e: EntryWithRelations) => void }) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isOverdue = !!entry.dueDate && new Date(entry.dueDate) < today

  const dueDateStr = entry.dueDate ? formatDateLongFR(new Date(entry.dueDate)) : null

  const priorityStyle =
    entry.priority === 'HIGH'   ? { backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' } :
    entry.priority === 'MEDIUM' ? { backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)', color: 'var(--warning)' } :
    entry.priority === 'LOW'    ? { backgroundColor: 'var(--border)', color: 'var(--muted)' } :
    null

  const priorityLabel =
    entry.priority === 'HIGH' ? 'Haute' : entry.priority === 'MEDIUM' ? 'Normale' : 'Faible'

  return (
    <BaseCard entry={entry} actions={actions} onOpenDetail={onOpenDetail}>
      <p className="font-headline text-base" style={{ color: 'var(--text)' }}>{entry.title}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {entry.priority && priorityStyle && (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider" style={priorityStyle}>
            {priorityLabel}
          </span>
        )}
        {dueDateStr && (
          <span
            className="font-mono text-[10px]"
            style={{ color: isOverdue ? 'var(--danger)' : 'var(--muted)' }}
          >
            {dueDateStr}
          </span>
        )}
      </div>
    </BaseCard>
  )
}
