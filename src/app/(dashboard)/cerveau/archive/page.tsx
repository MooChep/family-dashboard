'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, RotateCcw, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import { formatDateFR } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import type { EntryType } from '@prisma/client'

const TYPE_FILTERS: EntryType[] = ['NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT']

type Period = 'week' | 'month' | 'all'

function getPeriodStart(period: Period): Date | null {
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  if (period === 'month') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return d
  }
  return null
}

export default function ArchivePage() {
  const [entries,    setEntries]    = useState<EntryWithRelations[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState<EntryType | null>(null)
  const [period,     setPeriod]     = useState<Period>('all')
  const [confirmId,  setConfirmId]  = useState<string | null>(null)
  const { toast, showToast, dismiss } = useCerveauToast()

  async function load() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/cerveau/entries?status=ARCHIVED&status=DONE')
      const data = await res.json() as { success: boolean; data: EntryWithRelations[] }
      if (data.success) setEntries(data.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleDelete(id: string) {
    const res = await fetch(`/api/cerveau/entries/${id}?purge=true`, { method: 'DELETE' })
    const data = await res.json() as { success: boolean }
    if (data.success) {
      setEntries(prev => prev.filter(e => e.id !== id))
      setConfirmId(null)
      showToast('Entrée supprimée', 'success')
    } else {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  async function handleRestore(id: string) {
    const res = await fetch(`/api/cerveau/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) {
      showToast('Restauré dans Cerveau', 'success')
      await load()
    } else {
      showToast('Erreur lors de la restauration', 'error')
    }
  }

  const filtered = useMemo(() => {
    const periodStart = getPeriodStart(period)
    return entries.filter(e => {
      if (typeFilter && e.type !== typeFilter) return false
      const q = search.toLowerCase()
      if (q && !e.title.toLowerCase().includes(q) && !e.body?.toLowerCase().includes(q)) return false
      if (periodStart) {
        const refDate = e.archivedAt ?? e.doneAt ?? e.createdAt
        if (new Date(refDate) < periodStart) return false
      }
      return true
    })
  }, [entries, search, typeFilter, period])

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-4 pt-14 pb-4 md:pt-6">
        <div className="flex items-center gap-3">
          <Link
            href="/cerveau"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
              Archive
            </h1>
            <p className="font-mono text-[8px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>
              entrées terminées et archivées
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Search size={15} style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setTypeFilter(null)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: !typeFilter ? 'var(--accent)' : 'var(--surface)',
            color: !typeFilter ? '#fff' : 'var(--text2)',
            border: '1px solid var(--border)',
          }}
        >
          Tout
        </button>
        {TYPE_FILTERS.map(type => {
          const meta = TYPE_CONFIG[type]
          const active = typeFilter === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(active ? null : type)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text2)',
                border: '1px solid var(--border)',
              }}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Period filter */}
      <div className="px-4 mb-6 flex gap-2">
        {(['week', 'month', 'all'] as Period[]).map(p => {
          const label = p === 'week' ? 'Cette semaine' : p === 'month' ? 'Ce mois' : 'Tout'
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: period === p ? 'var(--surface2)' : 'transparent',
                color: period === p ? 'var(--text)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl mb-2 animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 mt-16 text-center">
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            {entries.length === 0 ? 'Aucune entrée archivée.' : 'Aucun résultat.'}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-1">
          {filtered.map(entry => {
            const meta = TYPE_CONFIG[entry.type]
            const refDate = entry.archivedAt ?? entry.doneAt ?? entry.createdAt
            const dateStr = formatDateFR(new Date(refDate))
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-headline text-sm truncate" style={{ color: 'var(--text)' }}>
                    {entry.title}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {meta.label} · {dateStr} · {entry.status === 'DONE' ? 'Terminé' : 'Archivé'}
                  </p>
                </div>
                {confirmId === entry.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: 'var(--danger, #e53e3e)', color: '#fff' }}
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleRestore(entry.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'var(--surface2)', color: 'var(--accent)' }}
                      title="Restaurer"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(entry.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
