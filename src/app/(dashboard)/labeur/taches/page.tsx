'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Archive, RefreshCw, CalendarClock } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { TaskList } from '@/components/labeur/tasks/TaskList'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

type FilterStatus = 'active' | 'archived'
type FilterType   = 'all' | 'RECURRING' | 'ONESHOT'

export default function TachesPage() {
  const { data: session } = useSession()

  const [tasks,        setTasks]        = useState<LabeurTaskWithRelations[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active')
  const [filterType,   setFilterType]   = useState<FilterType>('all')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus === 'archived') {
      params.set('status', 'ARCHIVED')
    } else {
      params.set('all', 'false')
    }
    if (filterType !== 'all') params.set('type', filterType)

    const res = await fetch(`/api/labeur/tasks?${params}`)
    if (res.ok) {
      const { data } = await res.json()
      setTasks(data ?? [])
    }
    setLoading(false)
  }, [filterStatus, filterType])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // CompletionButton et le swipe appellent déjà l'API — ce callback ne fait que rafraîchir
  function handleComplete(_taskId: string) {
    void fetchTasks()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          Tâches
        </h1>
        <Link
          href="/labeur/taches/nouvelle"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Plus size={15} />
          Nouvelle
        </Link>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col gap-2">
        {/* Statut */}
        <div className="flex gap-2">
          {(['active', 'archived'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: filterStatus === s ? 'var(--accent-dim)' : 'var(--surface)',
                color:           filterStatus === s ? 'var(--accent)'      : 'var(--text2)',
                border:          filterStatus === s ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {s === 'archived' && <Archive size={12} />}
              {s === 'active' ? 'Actives' : 'Archivées'}
            </button>
          ))}
        </div>

        {/* Type */}
        <div className="flex gap-2">
          {(['all', 'RECURRING', 'ONESHOT'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: filterType === t ? 'var(--surface2)' : 'transparent',
                color:           filterType === t ? 'var(--text)'      : 'var(--muted)',
                fontWeight:      filterType === t ? 600 : 400,
              }}
            >
              {t === 'all' ? 'Toutes' : t === 'RECURRING'
                ? <><RefreshCw size={12} className="inline mr-1" />Récurrentes</>
                : <><CalendarClock size={12} className="inline mr-1" />Ponctuelles</>
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div className="flex justify-center py-10">
          <span style={{ color: 'var(--muted)' }}>Chargement…</span>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          currentUserId={session?.user?.id ?? ''}
          onComplete={handleComplete}
        />
      )}

    </div>
  )
}
