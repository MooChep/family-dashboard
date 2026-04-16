'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, User, Users, Store } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { MarketItem } from '@/components/labeur/market/MarketItem'
import { InflationBanner } from '@/components/labeur/dashboard/InflationBanner'
import type { LabeurMarketItemWithPurchases, InflationSummary } from '@/lib/labeur/types'

type FilterType = 'all' | 'INDIVIDUAL' | 'COLLECTIVE'

/**
 * Page principale du Marché.
 * Articles actifs avec prix gonflés + sceau de cire si malédiction.
 * Articles scellés restent visibles (grisés) pour motiver.
 */
export default function MarchePage() {
  const { data: session }           = useSession()
  const [items,      setItems]      = useState<LabeurMarketItemWithPurchases[]>([])
  const [inflation,  setInflation]  = useState<InflationSummary | null>(null)
  const [curseSeuil, setCurseSeuil] = useState(50)
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<FilterType>('all')

  const fetchAll = useCallback(async () => {
    const [mktRes, inflRes, settingsRes] = await Promise.all([
      fetch('/api/labeur/market'),
      fetch('/api/labeur/inflation'),
      fetch('/api/labeur/settings'),
    ])

    if (mktRes.ok)      setItems((await mktRes.json()).data ?? [])
    if (inflRes.ok)     setInflation((await inflRes.json()).data)
    if (settingsRes.ok) setCurseSeuil((await settingsRes.json()).data?.curseSeuil ?? 50)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = filter === 'all'
    ? items
    : items.filter((i) => i.type === filter)

  const globalInflation = inflation?.globalPercent ?? 0

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Le Marché
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Dépense tes écu en récompenses
          </p>
        </div>
        <Link
          href="/labeur/marche/nouvel-article"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Plus size={15} />
          Article
        </Link>
      </div>

      {/* ── Bandeau inflation ── */}
      {inflation && <InflationBanner inflation={inflation} />}

      {/* ── Filtres type ── */}
      <div className="flex gap-2">
        {(['all', 'INDIVIDUAL', 'COLLECTIVE'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: filter === f ? 'var(--surface2)' : 'transparent',
              color:           filter === f ? 'var(--text)'      : 'var(--muted)',
              fontWeight:      filter === f ? 600 : 400,
            }}
          >
            {f === 'all' ? 'Tous' : f === 'INDIVIDUAL'
              ? <><User size={12} className="inline mr-1" />Individuels</>
              : <><Users size={12} className="inline mr-1" />Collectifs</>
            }
          </button>
        ))}
      </div>

      {/* ── Liste articles ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl px-4 py-10 flex flex-col items-center gap-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Store size={28} style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Le Marché est vide — ajoute ta première récompense !
          </p>
          <Link
            href="/labeur/marche/nouvel-article"
            className="text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            Ajouter un article →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <MarketItem
              key={item.id}
              item={item}
              inflationPercent={globalInflation}
              curseSeuil={curseSeuil}
              currentUserId={session?.user?.id ?? ''}
              onBuySuccess={fetchAll}
            />
          ))}
        </div>
      )}

    </div>
  )
}
