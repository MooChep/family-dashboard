'use client'

import { type ReactElement } from 'react'
import { type EntryType } from '@prisma/client'

// ── Types ──

export type ArchiveTypeFilter   = EntryType | 'all'
export type ArchiveUserFilter   = 'all' | 'ilan' | 'camille'
export type ArchivePeriodFilter = '7d' | '30d' | '3m' | 'all'

export interface ArchiveFiltersState {
  type:   ArchiveTypeFilter
  user:   ArchiveUserFilter
  period: ArchivePeriodFilter
}

interface ArchiveFiltersProps {
  filters:  ArchiveFiltersState
  onChange: (filters: ArchiveFiltersState) => void
}

// ── Données de configuration ──

const TYPE_TABS: { id: ArchiveTypeFilter; label: string }[] = [
  { id: 'all',       label: 'Tous'        },
  { id: 'TODO',      label: '◻ Todo'      },
  { id: 'REMINDER',  label: '⏰ Rappel'   },
  { id: 'LIST',      label: '☰ Liste'    },
  { id: 'PROJECT',   label: '. Projet'   },
  { id: 'NOTE',      label: '◆ Note'     },
  { id: 'EVENT',     label: '◉ Événement' },
]

const USER_TABS: { id: ArchiveUserFilter; label: string }[] = [
  { id: 'all',     label: 'Tous'    },
  { id: 'ilan',    label: 'Ilan'    },
  { id: 'camille', label: 'Camille' },
]

const PERIOD_TABS: { id: ArchivePeriodFilter; label: string }[] = [
  { id: '7d',  label: '7 jours'  },
  { id: '30d', label: '30 jours' },
  { id: '3m',  label: '3 mois'   },
  { id: 'all', label: 'Tout'     },
]

// ── Sous-composant ──

function ChipRow<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs:     { id: T; label: string }[]
  active:   T
  onSelect: (id: T) => void
}): ReactElement {
  return (
    <div
      className="flex gap-2"
      style={{ overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => { onSelect(tab.id) }}
          style={{
            padding:      '4px 10px',
            borderRadius: '20px',
            border:       '1px solid var(--border)',
            background:   active === tab.id ? 'var(--accent)' : 'var(--surface)',
            color:        active === tab.id ? 'var(--text-on-accent)' : 'var(--muted)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            whiteSpace:   'nowrap',
            cursor:       'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Composant principal ──

/** Barre de filtres de l'archive (type, personne, période). */
export function ArchiveFilters({ filters, onChange }: ArchiveFiltersProps): ReactElement {
  return (
    <div className="flex flex-col gap-2" style={{ marginBottom: '16px' }}>
      <ChipRow
        tabs={TYPE_TABS}
        active={filters.type}
        onSelect={(type) => { onChange({ ...filters, type }) }}
      />
      <ChipRow
        tabs={USER_TABS}
        active={filters.user}
        onSelect={(user) => { onChange({ ...filters, user }) }}
      />
      <ChipRow
        tabs={PERIOD_TABS}
        active={filters.period}
        onSelect={(period) => { onChange({ ...filters, period }) }}
      />
    </div>
  )
}
