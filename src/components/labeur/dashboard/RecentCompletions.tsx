'use client'

import { formatRelative } from '@/lib/formatDate'
import type { LabeurCompletion, LabeurTask, User } from '@prisma/client'

type CompletionEntry = LabeurCompletion & {
  task: Pick<LabeurTask, 'id' | 'title'>
  user: Pick<User, 'id' | 'name'>
}

interface RecentCompletionsProps {
  completions: CompletionEntry[]
}

/**
 * Les 5 dernières réalisations du foyer.
 * Style parchemin médiéval — prépare l'intégration avec le Crieur public (roadmap §7.6).
 */
export function RecentCompletions({ completions }: RecentCompletionsProps) {
  if (completions.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-5 flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucune réalisation encore — le labeur commence ici.
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {completions.map((c, i) => (
        <div
          key={c.id}
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: i < completions.length - 1 ? '1px solid var(--border)' : undefined,
          }}
        >
          {/* Avatar initiale */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            {c.user.name.charAt(0).toUpperCase()}
          </div>

          {/* Texte style "crieur public" */}
          <div className="flex-1 min-w-0">
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              <span className="font-medium">{c.user.name}</span>
              {' a terrassé '}
              <span className="font-medium">{c.task.title}</span>
            </span>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {formatRelative(new Date(c.completedAt))}
            </div>
          </div>

          {/* Écu gagnés */}
          <div className="shrink-0 flex items-center gap-1">
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              +{c.ecuAwarded}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>écu</span>
          </div>
        </div>
      ))}
    </div>
  )
}
