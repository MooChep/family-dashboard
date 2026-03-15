'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { NoteCard, type NoteEntry } from './NoteCard'
import { NoteDetail } from './NoteDetail'
import { PinnedSection } from './PinnedSection'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

type FilterTab = 'toutes' | 'ilan' | 'camille' | 'partage'

// ── Filtres ──

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'toutes',  label: 'Toutes'  },
  { id: 'ilan',    label: 'Ilan'    },
  { id: 'camille', label: 'Camille' },
  { id: 'partage', label: 'Partagé' },
]

function applyFilter(entries: NoteEntry[], tab: FilterTab): NoteEntry[] {
  switch (tab) {
    case 'ilan':    return entries.filter((e) => e.assignedTo === 'ILAN')
    case 'camille': return entries.filter((e) => e.assignedTo === 'CAMILLE')
    case 'partage': return entries.filter((e) => e.assignedTo === 'SHARED')
    default:        return entries
  }
}

// ── Composant ──

/** Liste complète des Notes avec section épinglées séparée et filtres par personne. */
export function NoteList(): ReactElement {
  const [entries,       setEntries]       = useState<NoteEntry[]>([])
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState<FilterTab>('toutes')
  const [selectedEntry, setSelectedEntry] = useState<NoteEntry | null>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=NOTE')
      .then((r) => r.json() as Promise<NoteEntry[]>)
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

  function handlePin(id: string, pinned: boolean): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isPinned: pinned }),
    }).then(() => {
      setEntries((prev) =>
        prev.map((e) => e.id === id ? { ...e, isPinned: pinned } : e)
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

  function handleSaved(updated: NoteEntry): void {
    setEntries((prev) =>
      prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e)
    )
  }

  // ── Render ──

  const filtered = applyFilter(entries, activeTab)
  const pinned   = filtered.filter((e) => e.isPinned)
  const normal   = filtered.filter((e) => !e.isPinned)

  return (
    <div>

      <NoteDetail
        entry={selectedEntry}
        onClose={() => { setSelectedEntry(null) }}
        onSaved={handleSaved}
        onArchive={(id) => {
          handleArchive(id)
          setSelectedEntry(null)
        }}
        onPin={(id, p) => {
          handlePin(id, p)
          setSelectedEntry((prev) => prev?.id === id ? { ...prev, isPinned: p } : prev)
        }}
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
              background:   activeTab === tab.id ? 'var(--accent)' : 'var(--surface)',
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
      ) : filtered.length === 0 ? (
        <EmptyState icon="◆" message="Aucune note pour l'instant." />
      ) : (
        <>
          <PinnedSection
            entries={pinned}
            onArchive={handleArchive}
            onPin={handlePin}
            onDelete={handleDelete}
            onTap={(e) => { setSelectedEntry(e) }}
          />
          {normal.length > 0 && (
            <div
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: '12px',
                overflow:     'hidden',
              }}
            >
              {normal.map((entry, i) => (
                <NoteCard
                  key={entry.id}
                  entry={entry}
                  isLast={i === normal.length - 1}
                  onArchive={handleArchive}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  onTap={(e) => { setSelectedEntry(e) }}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}
