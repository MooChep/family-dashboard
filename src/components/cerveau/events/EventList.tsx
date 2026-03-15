'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { EventCard, type EventEntry } from './EventCard'
import { EventDetail } from './EventDetail'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Filtres ──

type FilterTab = 'tous' | 'ilan' | 'camille' | 'partage'

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'tous',    label: 'Tous'    },
  { id: 'ilan',    label: 'Ilan'    },
  { id: 'camille', label: 'Camille' },
  { id: 'partage', label: 'Partagé' },
]

function applyFilter(entries: EventEntry[], tab: FilterTab): EventEntry[] {
  switch (tab) {
    case 'ilan':    return entries.filter((e) => e.assignedTo === 'ILAN')
    case 'camille': return entries.filter((e) => e.assignedTo === 'CAMILLE')
    case 'partage': return entries.filter((e) => e.assignedTo === 'SHARED')
    default:        return entries
  }
}

// ── Composant ──

/**
 * Liste chronologique des Événements.
 * Section À VENIR triée startDate ASC · section PASSÉS repliable triée DESC.
 */
export function EventList(): ReactElement {
  const [entries,    setEntries]    = useState<EventEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<FilterTab>('tous')
  const [detail,     setDetail]     = useState<EventEntry | null>(null)
  const [showPassed, setShowPassed] = useState(false)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=EVENT')
      .then((r) => r.json() as Promise<EventEntry[]>)
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers ──

  function handleArchive(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'ARCHIVED' }),
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleCancel(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'CANCELLED' }),
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleDelete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, { method: 'DELETE' })
      .then(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id))
      })
  }

  function handleSaved(updated: EventEntry): void {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    setDetail((prev) => prev?.id === updated.id ? updated : prev)
  }

  // ── Partition upcoming / passed ──

  const now      = new Date()
  const filtered = applyFilter(entries, activeTab)
  const upcoming = filtered
    .filter((e) => new Date(e.startDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const passed   = filtered
    .filter((e) => new Date(e.startDate) < now)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return (
    <div>

      <EventDetail
        entry={detail}
        onClose={() => { setDetail(null) }}
        onSaved={handleSaved}
        onRemoved={(id) => {
          setEntries((prev) => prev.filter((e) => e.id !== id))
          setDetail(null)
        }}
      />

      {/* ── Filtres ── */}
      <div
        className="flex gap-2"
        style={{ overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id) }}
            style={{
              padding:      '5px 12px',
              borderRadius: '20px',
              border:       '1px solid var(--border)',
              background:   activeTab === tab.id ? 'var(--cerveau-event)' : 'var(--surface)',
              color:        activeTab === tab.id ? 'var(--text-on-accent)' : 'var(--muted)',
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
      ) : upcoming.length === 0 && passed.length === 0 ? (
        <EmptyState icon="◉" message="Aucun événement à venir." />
      ) : (
        <>
          {/* ── Événements à venir ── */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '10px',
                  color:         'var(--cerveau-event)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom:  '8px',
                }}
              >
                À venir
              </div>
              <div
                style={{
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow:     'hidden',
                }}
              >
                {upcoming.map((entry, i) => (
                  <EventCard
                    key={entry.id}
                    entry={entry}
                    isLast={i === upcoming.length - 1}
                    onArchive={handleArchive}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                    onTap={(e) => { setDetail(e) }}
                  />
                ))}
              </div>
            </div>
          )}

          {upcoming.length === 0 && (
            <EmptyState icon="◉" message="Aucun événement à venir." />
          )}

          {/* ── Événements passés (repliable) ── */}
          {passed.length > 0 && (
            <div>
              <button
                onClick={() => { setShowPassed((v) => !v) }}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '6px',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    '0 0 10px',
                }}
              >
                <span
                  style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '10px',
                    color:         'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {showPassed ? '▾' : '▸'} Passés ({passed.length})
                </span>
              </button>

              {showPassed && (
                <div
                  style={{
                    background:   'var(--surface)',
                    border:       '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow:     'hidden',
                  }}
                >
                  {passed.map((entry, i) => (
                    <EventCard
                      key={entry.id}
                      entry={entry}
                      isLast={i === passed.length - 1}
                      onArchive={handleArchive}
                      onCancel={handleCancel}
                      onDelete={handleDelete}
                      onTap={(e) => { setDetail(e) }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}
