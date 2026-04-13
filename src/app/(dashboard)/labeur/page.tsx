'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { InflationBanner } from '@/components/labeur/dashboard/InflationBanner'
import { EcuBalances } from '@/components/labeur/dashboard/EcuBalances'
import { TasksDueToday } from '@/components/labeur/dashboard/TasksDueToday'
import { RecentCompletions } from '@/components/labeur/dashboard/RecentCompletions'
import { MarketPreview } from '@/components/labeur/dashboard/MarketPreview'
import type {
  InflationSummary,
  EcuBalanceWithTitle,
  LabeurTaskWithRelations,
  LabeurMarketItemWithPurchases,
} from '@/lib/labeur/types'
import type { LabeurCompletion, LabeurTask, User } from '@prisma/client'

type CompletionEntry = LabeurCompletion & {
  task: Pick<LabeurTask, 'id' | 'title'>
  user: Pick<User, 'id' | 'name'>
}

/**
 * Tableau de bord du module Labeur.
 * Charge les données côté client pour bénéficier de rafraîchissements optimistes
 * (soldes et inflation mis à jour sans reload complet après complétion).
 */
export default function LabeurPage() {
  const router = useRouter()

  const [inflation,    setInflation]    = useState<InflationSummary | null>(null)
  const [balances,     setBalances]     = useState<EcuBalanceWithTitle[]>([])
  const [tasksDue,     setTasksDue]     = useState<LabeurTaskWithRelations[]>([])
  const [completions,  setCompletions]  = useState<CompletionEntry[]>([])
  const [marketItems,  setMarketItems]  = useState<LabeurMarketItemWithPurchases[]>([])
  const [loading,      setLoading]      = useState(true)

  // ── Chargement de toutes les données du dashboard ──────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [inflRes, balRes, tasksRes, compsRes, mktRes] = await Promise.all([
        fetch('/api/labeur/inflation'),
        fetch('/api/labeur/balances'),
        fetch('/api/labeur/tasks/overdue'),
        fetch('/api/labeur/completions?limit=5'),
        fetch('/api/labeur/market?limit=4'),
      ])

      if (inflRes.ok)  setInflation((await inflRes.json()).data)
      if (balRes.ok)   setBalances((await balRes.json()).data)
      if (tasksRes.ok) setTasksDue((await tasksRes.json()).data)
      if (compsRes.ok) setCompletions((await compsRes.json()).data?.data ?? [])
      if (mktRes.ok)   setMarketItems(((await mktRes.json()).data ?? []).slice(0, 4))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Complétion d'une tâche depuis le dashboard ──────────────────────────────
  async function handleComplete(taskId: string) {
    const res = await fetch(`/api/labeur/tasks/${taskId}/complete`, { method: 'POST' })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error ?? 'Erreur lors de la complétion')
      return
    }
    // Rafraîchir toutes les données pour refléter les nouveaux soldes et l'inflation
    await fetchAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            ⚒ Labeur
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Corvées & récompenses du foyer
          </p>
        </div>
        <Link
          href="/labeur/taches/nouvelle"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Plus size={15} />
          Tâche
        </Link>
      </div>

      {/* ── Bandeau inflation ── */}
      {inflation && <InflationBanner inflation={inflation} />}

      {/* ── Soldes écu ── */}
      {balances.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Soldes écu
          </h2>
          <EcuBalances balances={balances} />
        </section>
      )}

      {/* ── Tâches du jour / en retard ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Tâches à faire
          </h2>
          <Link href="/labeur/taches" className="text-xs" style={{ color: 'var(--accent)' }}>
            Toutes →
          </Link>
        </div>
        <TasksDueToday tasks={tasksDue} onComplete={handleComplete} />
      </section>

      {/* ── Dernières réalisations ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Dernières réalisations
          </h2>
          <Link href="/labeur/historique" className="text-xs" style={{ color: 'var(--accent)' }}>
            Historique →
          </Link>
        </div>
        <RecentCompletions completions={completions} />
      </section>

      {/* ── Aperçu du Marché ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Le Marché
          </h2>
          <Link href="/labeur/marche" className="text-xs" style={{ color: 'var(--accent)' }}>
            Tout voir →
          </Link>
        </div>
        <MarketPreview items={marketItems} />
      </section>

    </div>
  )
}
