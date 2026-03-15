'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { type EntryPriority } from '@prisma/client'
import { TodoCard, type TodoEntry } from './TodoCard'
import { TodoDetail } from './TodoDetail'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

type FilterTab = 'tous' | 'haute' | 'aujourd-hui' | 'sans-date' | 'ilan' | 'camille' | 'partage'

// ── Helpers ──

const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function applyFilter(entries: TodoEntry[], tab: FilterTab): TodoEntry[] {
  const t = today()
  switch (tab) {
    case 'haute':        return entries.filter((e) => e.priority === 'HIGH')
    case 'aujourd-hui':  return entries.filter((e) => e.dueDate?.startsWith(t))
    case 'sans-date':    return entries.filter((e) => !e.dueDate)
    case 'ilan':         return entries.filter((e) => e.assignedTo === 'ILAN')
    case 'camille':      return entries.filter((e) => e.assignedTo === 'CAMILLE')
    case 'partage':      return entries.filter((e) => e.assignedTo === 'SHARED')
    default:             return entries
  }
}

// ── Filtres ──

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'tous',         label: 'Tous'          },
  { id: 'haute',        label: 'Haute priorité' },
  { id: 'aujourd-hui',  label: "Aujourd'hui"   },
  { id: 'sans-date',    label: 'Sans date'     },
  { id: 'ilan',         label: 'Ilan'          },
  { id: 'camille',      label: 'Camille'       },
  { id: 'partage',      label: 'Partagé'       },
]

// ── Composant ──

/** Liste complète des Todos avec filtres et swipe actions. */
export function TodoList(): ReactElement {
  const [entries,      setEntries]      = useState<TodoEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<FilterTab>('tous')
  const [selectedEntry, setSelectedEntry] = useState<TodoEntry | null>(null)

  // ── Chargement ──
  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=TODO')
      .then((r) => r.json() as Promise<TodoEntry[]>)
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers swipe ──

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

  function handleSaved(updated: TodoEntry): void {
    setEntries((prev) =>
      prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e)
    )
  }

  // ── Render ──

  const filtered = applyFilter(entries, activeTab)

  return (
    <div>

      <TodoDetail
        entry={selectedEntry}
        onClose={() => { setSelectedEntry(null) }}
        onSaved={handleSaved}
        onDone={(id) => {
          handleDone(id)
          setSelectedEntry(null)
        }}
      />

      {/* ── Filtres ── */}
      <div
        className="flex gap-2"
        style={{
          overflowX:  'auto',
          paddingBottom: '12px',
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

      {/* ── Liste ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', padding: '32px 0' }}>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="◻" message="Rien à faire pour l'instant. Profites-en." />
      ) : (
        <div
          style={{
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            overflow:     'hidden',
          }}
        >
          {filtered.map((entry, i) => (
            <TodoCard
              key={entry.id}
              entry={entry}
              isLast={i === filtered.length - 1}
              onDone={handleDone}
              onPriority={handlePriority}
              onDelete={handleDelete}
              onTap={(e) => { setSelectedEntry(e) }}
            />
          ))}
        </div>
      )}

    </div>
  )
}
