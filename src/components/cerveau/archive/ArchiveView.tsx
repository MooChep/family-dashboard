'use client'

import { useState, useEffect, useCallback, useTransition, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArchiveFilters, type ArchiveFiltersState, type ArchiveTypeFilter, type ArchiveUserFilter, type ArchivePeriodFilter } from './ArchiveFilters'
import { ArchiveGroup } from './ArchiveGroup'
import { EmptyState } from '@/components/cerveau/ui/EmptyState'
import { type ArchiveEntryData } from './ArchiveEntry'

// ── Types ──

interface ArchiveResponse {
  entries:    ArchiveEntryData[]
  nextCursor: string | null
}

// ── Helpers ──

/** Retourne la date d'archivage effective (archivedAt ou updatedAt en fallback). */
function archiveDate(entry: ArchiveEntryData): string {
  return entry.archivedAt ?? entry.updatedAt
}

/** Formate une date ISO en "mar. 8 avril 2026". */
function formatDateHeader(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

/** Groupe les entrées par jour d'archivage, du plus récent au plus ancien. */
function groupByDate(entries: ArchiveEntryData[]): { date: string; entries: ArchiveEntryData[] }[] {
  const groups = new Map<string, { label: string; entries: ArchiveEntryData[] }>()

  for (const entry of entries) {
    const d   = new Date(archiveDate(entry))
    // Clé de tri : YYYY-MM-DD
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups.has(key)) {
      groups.set(key, { label: formatDateHeader(archiveDate(entry)), entries: [] })
    }
    groups.get(key)!.entries.push(entry)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, group]) => ({ date: group.label, entries: group.entries }))
}

/** Construit la query string API depuis les filtres. */
function buildQuery(filters: ArchiveFiltersState, cursor?: string): string {
  const params = new URLSearchParams()
  if (filters.type !== 'all')  params.set('type',   filters.type)
  if (filters.user !== 'all')  params.set('user',   filters.user)
  params.set('period', filters.period)
  if (cursor) params.set('cursor', cursor)
  return params.toString()
}

/** Lit les filtres depuis les search params URL. */
function filtersFromParams(params: URLSearchParams): ArchiveFiltersState {
  return {
    type:   (params.get('type')   ?? 'all') as ArchiveTypeFilter,
    user:   (params.get('user')   ?? 'all') as ArchiveUserFilter,
    period: (params.get('period') ?? '30d') as ArchivePeriodFilter,
  }
}

// ── Composant ──

/** Vue principale de l'archive avec filtres, groupes par date et pagination. */
export function ArchiveView(): ReactElement {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [filters,    setFilters]    = useState<ArchiveFiltersState>(() => filtersFromParams(searchParams))
  const [entries,    setEntries]    = useState<ArchiveEntryData[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Chargement initial / changement de filtre ──

  const load = useCallback((f: ArchiveFiltersState) => {
    setLoading(true)
    setEntries([])
    setNextCursor(null)
    void fetch(`/api/cerveau/archive?${buildQuery(f)}`)
      .then((r) => r.json() as Promise<ArchiveResponse>)
      .then(({ entries: data, nextCursor: nc }) => {
        setEntries(data)
        setNextCursor(nc)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load(filters) }, [filters, load])

  // ── Changement de filtre → reset + mise à jour URL ──

  function handleFiltersChange(f: ArchiveFiltersState): void {
    setFilters(f)
    startTransition(() => {
      const params = new URLSearchParams()
      if (f.type !== 'all')  params.set('type',   f.type)
      if (f.user !== 'all')  params.set('user',   f.user)
      params.set('period', f.period)
      router.replace(`/cerveau/archive?${params.toString()}`, { scroll: false })
    })
  }

  // ── Charger plus (pagination) ──

  function handleLoadMore(): void {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    void fetch(`/api/cerveau/archive?${buildQuery(filters, nextCursor)}`)
      .then((r) => r.json() as Promise<ArchiveResponse>)
      .then(({ entries: data, nextCursor: nc }) => {
        setEntries((prev) => [...prev, ...data])
        setNextCursor(nc)
        setLoadingMore(false)
      })
  }

  // ── Restauration ──

  function handleRestore(id: string): void {
    void fetch(`/api/cerveau/entries/${id}/restore`, { method: 'POST' })
      .then(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id))
      })
  }

  // ── Suppression définitive ──

  function handleDelete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, { method: 'DELETE' })
      .then(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id))
      })
  }

  // ── Render ──

  const groups = groupByDate(entries)

  return (
    <div>
      <ArchiveFilters filters={filters} onChange={handleFiltersChange} />

      {loading ? (
        <div
          style={{
            textAlign:  'center',
            color:      'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize:   '14px',
            padding:    '40px 0',
          }}
        >
          Chargement…
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon="🗂" message="Rien dans l'archive pour cette période." />
      ) : (
        <>
          {groups.map((group) => (
            <ArchiveGroup
              key={group.date}
              date={group.date}
              entries={group.entries}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}

          {/* ── Charger plus ── */}
          {nextCursor && (
            <button
              onClick={handleLoadMore}
              style={{
                display:      'block',
                width:        '100%',
                padding:      '10px',
                background:   'transparent',
                border:       '1px solid var(--border)',
                borderRadius: '12px',
                color:        'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '12px',
                cursor:       'pointer',
                marginTop:    '4px',
              }}
            >
              {loadingMore ? 'Chargement…' : 'Charger plus →'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
