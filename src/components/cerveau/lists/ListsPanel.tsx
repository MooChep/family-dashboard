'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { ListCard, type ListEntry } from './ListCard'
import { ListDetail } from './ListDetail'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

interface RawEntry {
  id:          string
  content:     string
  assignedTo:  string
  updatedAt:   string
  listItems?:  { checked: boolean; archivedAt: string | null }[]
}

// ── Helpers ──

/** Calcule les compteurs d'items à partir des données brutes d'une entrée. */
function toListEntry(raw: RawEntry): ListEntry {
  const active    = (raw.listItems ?? []).filter((i) => !i.archivedAt)
  const unchecked = active.filter((i) => !i.checked)
  return {
    id:             raw.id,
    content:        raw.content,
    assignedTo:     raw.assignedTo,
    updatedAt:      raw.updatedAt,
    itemCount:      active.length,
    uncheckedCount: unchecked.length,
  }
}

// ── Composant ──

/** Panneau affichant toutes les Listes actives avec compteurs d'items. */
export function ListsPanel(): ReactElement {
  const [entries,  setEntries]  = useState<ListEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<ListEntry | null>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=LIST')
      .then((r) => r.json() as Promise<RawEntry[]>)
      .then((data) => {
        setEntries(data.map(toListEntry))
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

  function handleDelete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method: 'DELETE',
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  return (
    <div>
      <ListDetail
        entry={selected}
        onClose={() => { setSelected(null) }}
        onArchive={(id) => {
          handleArchive(id)
          setSelected(null)
        }}
      />

      {loading ? (
        <div
          style={{
            textAlign:  'center',
            color:      'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize:   '14px',
            padding:    '32px 0',
          }}
        >
          Chargement…
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon="☰" message="Aucune liste pour l'instant." />
      ) : (
        <div
          style={{
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            overflow:     'hidden',
          }}
        >
          {entries.map((entry, i) => (
            <ListCard
              key={entry.id}
              entry={entry}
              isLast={i === entries.length - 1}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onTap={(e) => { setSelected(e) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
