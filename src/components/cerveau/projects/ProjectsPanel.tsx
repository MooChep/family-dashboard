'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { ProjectCard, type ProjectEntry } from './ProjectCard'
import { ProjectDetail } from './ProjectDetail'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

interface RawProjectEntry {
  id:         string
  content:    string
  assignedTo: string
  dueDate:    string | null
  status:     string
  updatedAt:  string
  doneCount:  number
  totalCount: number
}

// ── Composant ──

/** Panneau affichant tous les Projets actifs et en pause avec progression. */
export function ProjectsPanel(): ReactElement {
  const [entries,  setEntries]  = useState<ProjectEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<ProjectEntry | null>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=PROJECT&status=OPEN')
      .then((r) => r.json() as Promise<RawProjectEntry[]>)
      .then((open) =>
        fetch('/api/cerveau/entries?type=PROJECT&status=PAUSED')
          .then((r) => r.json() as Promise<RawProjectEntry[]>)
          .then((paused) => {
            const all = [...open, ...paused]
            setEntries(all)
            setLoading(false)
          })
      )
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers ──

  function handlePatch(id: string, patch: Record<string, unknown>): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleDone(id: string): void {
    handlePatch(id, { status: 'DONE' })
  }

  function handlePause(id: string): void {
    // Toggle : OPEN → PAUSED ou PAUSED → OPEN
    const entry = entries.find((e) => e.id === id)
    const next  = entry?.status === 'PAUSED' ? 'OPEN' : 'PAUSED'
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next }),
    }).then(() => {
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: next } : e))
    })
  }

  function handleDelete(id: string): void {
    handlePatch(id, { status: 'CANCELLED' })
  }

  return (
    <div>
      <ProjectDetail
        entry={selected}
        onClose={() => { setSelected(null) }}
        onDone={(id) => { handleDone(id); setSelected(null) }}
        onPause={(id) => { handlePause(id) }}
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
        <EmptyState icon="◈" message="Aucun projet pour l'instant." />
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
            <ProjectCard
              key={entry.id}
              entry={entry}
              isLast={i === entries.length - 1}
              onDone={handleDone}
              onPause={handlePause}
              onDelete={handleDelete}
              onTap={(e) => { setSelected(e) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
