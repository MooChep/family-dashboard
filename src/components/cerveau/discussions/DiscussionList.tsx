'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { DiscussionCard, type DiscussionEntry } from './DiscussionCard'
import { DiscussionDetail } from './DiscussionDetail'
import { ConversionSheet } from './ConversionSheet'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'

// ── Types ──

type FilterTab = 'toutes' | 'urgentes'

// ── Constantes ──

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'toutes',   label: 'Toutes'   },
  { id: 'urgentes', label: 'Urgentes' },
]

// ── Composant ──

/** Liste complète des Discussions avec section urgentes en tête. */
export function DiscussionList(): ReactElement {
  const [entries,        setEntries]        = useState<DiscussionEntry[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState<FilterTab>('toutes')
  const [detailEntry,    setDetailEntry]    = useState<DiscussionEntry | null>(null)
  const [convertEntry,   setConvertEntry]   = useState<DiscussionEntry | null>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void fetch('/api/cerveau/entries?type=DISCUSSION')
      .then((r) => r.json() as Promise<DiscussionEntry[]>)
      .then((data) => {
        // Urgentes en premier, puis par date de création décroissante
        const sorted = [...data].sort((a, b) => {
          if (a.isUrgent && !b.isUrgent) return -1
          if (!a.isUrgent && b.isUrgent) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        setEntries(sorted)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers ──

  function handleDone(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, { method: 'DELETE' }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleConvertTodo(id: string): void {
    void fetch(`/api/cerveau/entries/${id}/convert`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetType: 'TODO' }),
    }).then((res) => {
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleConvertProject(id: string): void {
    void fetch(`/api/cerveau/entries/${id}/convert`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetType: 'PROJECT' }),
    }).then((res) => {
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleDelete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, { method: 'DELETE' }).then(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleSaved(updated: DiscussionEntry): void {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    setDetailEntry(updated)
  }

  // ── Filtres ──

  const filtered = activeTab === 'urgentes'
    ? entries.filter((e) => e.isUrgent)
    : entries

  const urgentes = filtered.filter((e) => e.isUrgent)
  const normales  = filtered.filter((e) => !e.isUrgent)

  // ── Rendu ──

  return (
    <div>

      <DiscussionDetail
        entry={detailEntry}
        onClose={() => { setDetailEntry(null) }}
        onSaved={handleSaved}
        onDone={(id) => {
          setEntries((prev) => prev.filter((e) => e.id !== id))
          setDetailEntry(null)
        }}
        onConverted={(id) => {
          setEntries((prev) => prev.filter((e) => e.id !== id))
        }}
      />

      <ConversionSheet
        entry={convertEntry}
        onClose={() => { setConvertEntry(null) }}
        onConverted={(id) => {
          setEntries((prev) => prev.filter((e) => e.id !== id))
          setConvertEntry(null)
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
              background:   activeTab === tab.id ? 'var(--cerveau-discussion)' : 'var(--surface)',
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
        <EmptyState icon="◈" message="Aucune discussion pour l'instant." />
      ) : (
        <>
          {/* ── Section urgentes ── */}
          {urgentes.length > 0 && (
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
                Urgentes
              </div>
              <div
                style={{
                  background:   'var(--surface)',
                  border:       '1px solid var(--error)',
                  borderRadius: '12px',
                  overflow:     'hidden',
                }}
              >
                {urgentes.map((entry, i) => (
                  <DiscussionCard
                    key={entry.id}
                    entry={entry}
                    isLast={i === urgentes.length - 1}
                    onDone={handleDone}
                    onConvertTodo={handleConvertTodo}
                    onConvertProject={handleConvertProject}
                    onDelete={handleDelete}
                    onTap={(e) => { setDetailEntry(e) }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Section normales ── */}
          {normales.length > 0 && (
            <div
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: '12px',
                overflow:     'hidden',
              }}
            >
              {normales.map((entry, i) => (
                <DiscussionCard
                  key={entry.id}
                  entry={entry}
                  isLast={i === normales.length - 1}
                  onDone={handleDone}
                  onConvertTodo={handleConvertTodo}
                  onConvertProject={handleConvertProject}
                  onDelete={handleDelete}
                  onTap={(e) => { setDetailEntry(e) }}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}
