'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { type EntryPriority } from '@prisma/client'
import { ReminderCard, type ReminderEntry } from './ReminderCard'
import { SnoozeSheet } from './SnoozeSheet'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

type FilterTab = 'tous' | 'retard' | 'aujourd-hui' | 'ilan' | 'camille' | 'partage'

// ── Helpers ──

const todayStr = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function applyFilter(entries: ReminderEntry[], tab: FilterTab): ReminderEntry[] {
  const t = todayStr()
  switch (tab) {
    case 'retard':      return entries.filter((e) => new Date(e.dueDate) < new Date())
    case 'aujourd-hui': return entries.filter((e) => e.dueDate.startsWith(t))
    case 'ilan':        return entries.filter((e) => e.assignedTo === 'ILAN')
    case 'camille':     return entries.filter((e) => e.assignedTo === 'CAMILLE')
    case 'partage':     return entries.filter((e) => e.assignedTo === 'SHARED')
    default:            return entries
  }
}

// ── Filtres ──

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'tous',         label: 'Tous'       },
  { id: 'retard',       label: 'En retard'  },
  { id: 'aujourd-hui',  label: "Aujourd'hui" },
  { id: 'ilan',         label: 'Ilan'       },
  { id: 'camille',      label: 'Camille'    },
  { id: 'partage',      label: 'Partagé'    },
]

// ── Composant ──

/** Liste complète des Rappels triés par dueDate avec section en retard séparée. */
export function ReminderList(): ReactElement {
  const [entries,       setEntries]       = useState<ReminderEntry[]>([])
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState<FilterTab>('tous')
  const [snoozeTarget,  setSnoozeTarget]  = useState<ReminderEntry | null>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=REMINDER')
      .then((r) => r.json() as Promise<ReminderEntry[]>)
      .then((data) => {
        // Tri par dueDate ASC (plus proche en premier)
        const sorted = [...data].sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
        setEntries(sorted)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers ──

  function handleDone(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'DONE' }),
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handlePriority(id: string, priority: EntryPriority | null): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ priority }),
    }).then(() => {
      setEntries((prev) =>
        prev.map((e) => e.id === id ? { ...e, priority } : e)
      )
    })
  }

  function handleDelete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'CANCELLED' }),
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  // ── Render ──

  const filtered = applyFilter(entries, activeTab)
  const overdue  = filtered.filter((e) => new Date(e.dueDate) < new Date())
  const upcoming = filtered.filter((e) => new Date(e.dueDate) >= new Date())

  return (
    <div>

      <SnoozeSheet
        entry={snoozeTarget}
        onClose={() => { setSnoozeTarget(null) }}
        onSnoozed={(id) => {
          setEntries((prev) => prev.filter((e) => e.id !== id))
        }}
        onDone={handleDone}
      />

      {/* ── Filtres ── */}
      <div
        className="flex gap-2"
        style={{
          overflowX:      'auto',
          paddingBottom:  '12px',
          scrollbarWidth: 'none',
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id) }}
            style={{
              padding:      '5px 12px',
              borderRadius: '20px',
              border:       '1px solid var(--border)',
              background:   activeTab === tab.id ? 'var(--cerveau-reminder)' : 'var(--surface)',
              color:        activeTab === tab.id ? '#000' : 'var(--muted)',
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

      {/* ── Contenu ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', padding: '32px 0' }}>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="⏰" message="Aucun rappel pour l'instant." />
      ) : (
        <>
          {/* ── Section en retard ── */}
          {overdue.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '10px',
                  color:         'var(--error)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom:  '8px',
                }}
              >
                En retard
              </div>
              <div
                style={{
                  background:   'var(--surface)',
                  border:       '1px solid var(--error)',
                  borderRadius: '12px',
                  overflow:     'hidden',
                }}
              >
                {overdue.map((entry, i) => (
                  <ReminderCard
                    key={entry.id}
                    entry={entry}
                    isLast={i === overdue.length - 1}
                    onDone={handleDone}
                    onPriority={handlePriority}
                    onDelete={handleDelete}
                    onSnooze={(e) => { setSnoozeTarget(e) }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Rappels à venir ── */}
          {upcoming.length > 0 && (
            <div
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: '12px',
                overflow:     'hidden',
              }}
            >
              {upcoming.map((entry, i) => (
                <ReminderCard
                  key={entry.id}
                  entry={entry}
                  isLast={i === upcoming.length - 1}
                  onDone={handleDone}
                  onPriority={handlePriority}
                  onDelete={handleDelete}
                  onSnooze={(e) => { setSnoozeTarget(e) }}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}
