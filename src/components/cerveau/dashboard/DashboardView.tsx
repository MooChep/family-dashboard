'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { TypeIcon } from '@/components/cerveau/ui/TypeIcon'
import { DashboardStats } from './DashboardStats'
import { DashboardSection } from './DashboardSection'
import { OverdueSection } from './OverdueSection'
import { TodaySection } from './TodaySection'
import { EntryRow, formatTime, type DashboardEntry } from './EntryRow'

// ── Types étendus ──

interface ProjectEntry extends DashboardEntry {
  progress:   number
  entryCount: number
}

interface ListEntry extends DashboardEntry {
  itemCount:      number
  uncheckedCount: number
}

interface DashboardData {
  overdue:     DashboardEntry[]
  discussions: DashboardEntry[]
  today:       DashboardEntry[]
  todos:       DashboardEntry[]
  projects:    ProjectEntry[]
  lists:       ListEntry[]
  pinned:      DashboardEntry[]
  events:      DashboardEntry[]
  stats: {
    total:       number
    todos:       number
    reminders:   number
    discussions: number
  }
}

// ── Props ──

interface DashboardViewProps {
  /** Incrémenter pour déclencher un rechargement des données. */
  refreshKey?: number
}

// ── Helpers ──

/** Nombre de jours entre maintenant et une date future (arrondi au supérieur). */
function daysFromNow(dateStr: string | null): number {
  if (!dateStr) return 0
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Lignes spécialisées ──

function ProjectRow({ entry, isLast }: { entry: ProjectEntry; isLast: boolean }): ReactElement {
  return (
    <div
      style={{
        padding:      '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
      }}
    >
      <TypeIcon type={entry.type} size={14} />
      <span
        style={{
          flex:         1,
          fontFamily:   'var(--font-body)',
          fontSize:     '14px',
          color:        'var(--text)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.content.length > 50 ? entry.content.slice(0, 50) + '…' : entry.content}
      </span>

      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {/* Barre de progression */}
        <div
          style={{
            width:        '48px',
            height:       '4px',
            borderRadius: '2px',
            background:   'var(--border)',
            overflow:     'hidden',
          }}
        >
          <div
            style={{
              width:        `${entry.progress}%`,
              height:       '100%',
              background:   'var(--cerveau-project)',
              borderRadius: '2px',
            }}
          />
        </div>
        <span
          style={{
            fontSize:   '11px',
            color:      'var(--muted)',
            fontFamily: 'var(--font-mono)',
            minWidth:   '28px',
            textAlign:  'right',
          }}
        >
          {entry.entryCount > 0 ? `${entry.progress}%` : '–'}
        </span>
      </div>
    </div>
  )
}

function ListRow({ entry, isLast }: { entry: ListEntry; isLast: boolean }): ReactElement {
  return (
    <div
      style={{
        padding:      '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
      }}
    >
      <TypeIcon type={entry.type} size={14} />
      <span
        style={{
          flex:         1,
          fontFamily:   'var(--font-body)',
          fontSize:     '14px',
          color:        'var(--text)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.content.length > 50 ? entry.content.slice(0, 50) + '…' : entry.content}
      </span>
      {entry.uncheckedCount > 0 && (
        <span
          style={{
            fontSize:   '11px',
            color:      'var(--muted)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {entry.uncheckedCount} restant{entry.uncheckedCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

function EventRow({ entry, isLast }: { entry: DashboardEntry; isLast: boolean }): ReactElement {
  const days  = daysFromNow(entry.startDate)
  const label = days <= 0 ? "Auj." : `J-${days}`
  const time  = formatTime(entry.startDate)

  return (
    <div
      style={{
        padding:      '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
      }}
    >
      <span
        style={{
          fontSize:   '10px',
          fontFamily: 'var(--font-mono)',
          color:      days <= 7 ? 'var(--error)' : 'var(--muted)',
          minWidth:   '32px',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <TypeIcon type={entry.type} size={14} />
      <span
        style={{
          flex:         1,
          fontFamily:   'var(--font-body)',
          fontSize:     '14px',
          color:        'var(--text)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.content.length > 50 ? entry.content.slice(0, 50) + '…' : entry.content}
      </span>
      {time && (
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          {time}
        </span>
      )}
    </div>
  )
}

function TodoRow({ entry, isLast }: { entry: DashboardEntry; isLast: boolean }): ReactElement {
  const dateStr = entry.dueDate
  const meta = dateStr
    ? (() => {
        const time = formatTime(dateStr)
        const label = time || new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        return (
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {label}
          </span>
        )
      })()
    : undefined

  return <EntryRow entry={entry} isLast={isLast} meta={meta} />
}

// ── Composant principal ──

/** Vue principale du dashboard Cerveau — agrège toutes les sections. */
export function DashboardView({ refreshKey }: DashboardViewProps): ReactElement {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void fetch('/api/cerveau/dashboard')
      .then((r) => r.json() as Promise<DashboardData>)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
  }, [refreshKey])

  if (loading) {
    return (
      <div
        style={{
          padding:    '32px 0',
          textAlign:  'center',
          color:      'var(--muted)',
          fontFamily: 'var(--font-body)',
          fontSize:   '14px',
        }}
      >
        Chargement…
      </div>
    )
  }

  if (!data) return <></>

  return (
    <div style={{ marginTop: '20px' }}>

      {/* ── Stats strip ── */}
      <DashboardStats stats={data.stats} />

      {/* ── EN RETARD ── */}
      <OverdueSection entries={data.overdue} />

      {/* ── DISCUSSIONS ── */}
      {data.discussions.length > 0 && (
        <DashboardSection
          title="Discussions"
          count={data.stats.discussions}
          viewAllHref="/cerveau/discussions"
        >
          {data.discussions.map((e, i) => (
            <EntryRow key={e.id} entry={e} isLast={i === data.discussions.length - 1} />
          ))}
        </DashboardSection>
      )}

      {/* ── AUJOURD'HUI ── */}
      <TodaySection entries={data.today} />

      {/* ── TODOS ── */}
      {data.todos.length > 0 && (
        <DashboardSection title="Todos" count={data.todos.length} viewAllHref="/cerveau/todos">
          {data.todos.map((e, i) => (
            <TodoRow key={e.id} entry={e} isLast={i === data.todos.length - 1} />
          ))}
        </DashboardSection>
      )}

      {/* ── PROJETS ── */}
      {data.projects.length > 0 && (
        <DashboardSection title="Projets" count={data.projects.length} viewAllHref="/cerveau/projets">
          {data.projects.map((e, i) => (
            <ProjectRow key={e.id} entry={e} isLast={i === data.projects.length - 1} />
          ))}
        </DashboardSection>
      )}

      {/* ── LISTES ── */}
      {data.lists.length > 0 && (
        <DashboardSection title="Listes" count={data.lists.length} viewAllHref="/cerveau/listes">
          {data.lists.map((e, i) => (
            <ListRow key={e.id} entry={e} isLast={i === data.lists.length - 1} />
          ))}
        </DashboardSection>
      )}

      {/* ── NOTES ÉPINGLÉES ── */}
      {data.pinned.length > 0 && (
        <DashboardSection title="Notes épinglées" count={data.pinned.length} viewAllHref="/cerveau/notes">
          {data.pinned.map((e, i) => (
            <EntryRow key={e.id} entry={e} isLast={i === data.pinned.length - 1} />
          ))}
        </DashboardSection>
      )}

      {/* ── ÉVÉNEMENTS ── */}
      {data.events.length > 0 && (
        <DashboardSection title="Événements" count={data.events.length} viewAllHref="/cerveau/evenements">
          {data.events.map((e, i) => (
            <EventRow key={e.id} entry={e} isLast={i === data.events.length - 1} />
          ))}
        </DashboardSection>
      )}

    </div>
  )
}
