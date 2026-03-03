'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import { SectionCard } from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

export default function AnalysesTagsPage(): ReactElement {
  const [period, setPeriod]     = useState<Period>({ type: 'preset', value: 6 })
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')
  const { data, isLoading, error } = useAnalyses(period)

  const availableMonths = data
    ? getAvailableMonths(data.period.from, data.period.to)
    : getAvailableMonths('2025-01', new Date().toISOString().slice(0, 7))

  const categories = data
    ? [...new Set(data.tagsSummary.map((t) => t.category))]
    : []

  const filtered = (data?.tagsSummary ?? []).filter((t) => {
    const matchTag = search === '' || t.tag.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === '' || t.category === catFilter
    return matchTag && matchCat
  })

  const periodHeader = (
    <PeriodPicker period={period} onChange={setPeriod} availableMonths={availableMonths} />
  )

  return (
    <EpargneLayout>
    <AnalysesLayout subHeader={periodHeader}>
      {/* Recherche */}
      <SectionCard title="Recherche par tag">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mc → McDo, McFlurry..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
            }}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <option value="">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {search || catFilter ? 'Aucun résultat' : 'Aucun tag enregistré sur cette période'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((t, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex items-start justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <div
                    className="text-base font-semibold"
                    style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
                  >
                    {t.tag}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                    {t.category}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-lg font-semibold"
                    style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatAmount(t.total)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                    {t.count} opération(s)
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 px-5 py-3">
                {t.entries.map((e, j) => (
                  <div
                    key={j}
                    className="flex justify-between px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--surface2)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{e.month}</span>
                    <span className="text-xs" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{formatAmount(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AnalysesLayout>
    </EpargneLayout>
    
  )
}