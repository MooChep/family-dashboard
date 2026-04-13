'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { formatRelative } from '@/lib/formatDate'
import type { LabeurCompletion, LabeurTask, User } from '@prisma/client'

type CompletionEntry = LabeurCompletion & {
  task: Pick<LabeurTask, 'id' | 'title'>
  user: Pick<User, 'id' | 'name'>
}

const PAGE_SIZE = 20

/**
 * Historique paginé de toutes les réalisations du foyer.
 * Filtre optionnel par membre.
 */
export default function HistoriquePage() {
  const { data: session } = useSession()

  const [completions, setCompletions] = useState<CompletionEntry[]>([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [userFilter,  setUserFilter]  = useState<'all' | string>('all')
  const [users,       setUsers]       = useState<{ id: string; name: string }[]>([])
  const [loading,     setLoading]     = useState(true)

  // Charger la liste des membres pour le filtre
  useEffect(() => {
    fetch('/api/labeur/balances')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setUsers(data.map((b: { user: { id: string; name: string } }) => b.user))
      })
  }, [])

  const fetchCompletions = useCallback(async (p: number, uid: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      page:  String(p),
      limit: String(PAGE_SIZE),
    })
    if (uid !== 'all') params.set('userId', uid)

    const res = await fetch(`/api/labeur/completions?${params}`)
    if (res.ok) {
      const { data } = await res.json()
      setCompletions(data?.data ?? [])
      setTotal(data?.total ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCompletions(page, userFilter)
  }, [page, userFilter, fetchCompletions])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Total écu gagnés dans la sélection courante
  const totalEcu = completions.reduce((s, c) => s + c.ecuAwarded, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          Historique
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Toutes les réalisations du foyer
        </p>
      </div>

      {/* ── Filtres ── */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setUserFilter('all'); setPage(1) }}
          className="px-3 py-1.5 rounded-lg text-sm transition-all"
          style={{
            backgroundColor: userFilter === 'all' ? 'var(--accent-dim)' : 'var(--surface)',
            color:           userFilter === 'all' ? 'var(--accent)'      : 'var(--text2)',
            border:          userFilter === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)',
          }}
        >
          Tous
        </button>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => { setUserFilter(u.id); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: userFilter === u.id ? 'var(--accent-dim)' : 'var(--surface)',
              color:           userFilter === u.id ? 'var(--accent)'      : 'var(--text2)',
              border:          userFilter === u.id ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* ── Stats rapides ── */}
      {!loading && completions.length > 0 && (
        <div className="flex gap-3">
          <div
            className="flex-1 rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
              {total}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>réalisations</p>
          </div>
          <div
            className="flex-1 rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
              {totalEcu}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>écu (page courante)</p>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <div className="flex justify-center py-10">
          <span style={{ color: 'var(--muted)' }}>Chargement…</span>
        </div>
      ) : completions.length === 0 ? (
        <div
          className="rounded-xl px-4 py-10 flex flex-col items-center gap-2"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span className="text-3xl">📜</span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            Aucune réalisation pour l'instant.
          </span>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {completions.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < completions.length - 1 ? '1px solid var(--border)' : undefined }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {c.user.name.charAt(0).toUpperCase()}
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  <span className="font-medium">{c.user.name}</span>
                  {' — '}
                  <span>{c.task.title}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {formatRelative(new Date(c.completedAt))}
                </p>
              </div>

              {/* Écu */}
              <div className="shrink-0 flex items-center gap-1">
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                  +{c.ecuAwarded}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>écu</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm disabled:opacity-40"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            ← Précédent
          </button>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm disabled:opacity-40"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            Suivant →
          </button>
        </div>
      )}

    </div>
  )
}
