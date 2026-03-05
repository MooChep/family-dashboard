'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import {
  BarChartVertical,
  BarChartHorizontal,
  SectionCard,
} from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const COLORS = ['var(--accent)','var(--warning)','var(--danger)','var(--success)','var(--muted)','var(--muted2)']

function shortLabel(iso: string): string {
  const [, m] = iso.split('-')
  return MONTHS_SHORT[parseInt(m) - 1]
}

export default function AnalysesDepensesPage(): ReactElement {
  const [period, setPeriod]         = useState<Period>({ type: 'preset', value: 6 })
  const [selectedCat, setSelectedCat] = useState<string>('')
  const { data, isLoading, error }  = useAnalyses(period)

  const PERIOD_START = '2024-10'
  const availableMonths = getAvailableMonths(
    data?.periodStart ?? PERIOD_START,
    new Date().toISOString().slice(0, 7),
  )

  const months     = data ? Object.keys(data.expensesByMonth).sort() : []
  // Noms des projets d'épargne à exclure (leurs catégories PROJECT ne sont pas des dépenses)
  const projectNames = new Set((data?.projects ?? []).map((p) => p.name))
  const categories = data
    ? [...new Set(months.flatMap((m) => Object.keys(data.expensesByMonth[m] ?? {})))]
        .filter((cat) => !projectNames.has(cat))
    : []

  const activeCat = selectedCat || categories[0] || ''

  // Cumul par poste sur la période
  const cumulsData = categories
    .map((cat, i) => ({
      label: cat,
      value: months.reduce((s, m) => s + (data?.expensesByMonth[m]?.[cat] ?? 0), 0),
      color: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)

  // Évolution mensuelle de la catégorie sélectionnée
  const avg =
    months.length > 0
      ? months.reduce((s, m) => s + (data?.expensesByMonth[m]?.[activeCat] ?? 0), 0) /
        months.length
      : 0

  const catEvolution = months.map((m) => {
    const v = data?.expensesByMonth[m]?.[activeCat] ?? 0
    return {
      label: shortLabel(m),
      value: v,
      color: v > avg * 1.2 ? 'var(--danger)' : 'var(--accent)',
    }
  })

  const periodHeader = (
    <PeriodPicker period={period} onChange={setPeriod} availableMonths={availableMonths} />
  )

  return (
    <EpargneLayout>
      <AnalysesLayout subHeader={periodHeader}>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">

            {/* Cumul par poste */}
            <SectionCard title="Cumul par poste">
              {cumulsData.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Aucune dépense sur cette période
                </p>
              ) : (
                <BarChartHorizontal data={cumulsData} />
              )}
            </SectionCard>

            {/* Top 5 */}
            <SectionCard title="Top 5 postes">
              <div className="flex flex-col gap-3">
                {cumulsData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>
                        {d.label}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                    >
                      {formatAmount(d.value)}
                    </span>
                  </div>
                ))}
                {cumulsData.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>—</p>
                )}
              </div>
            </SectionCard>

            {/* Évolution par catégorie */}
            <div className="col-span-2">
              <SectionCard
                title="Évolution par catégorie"
                action={
                  categories.length > 0 ? (
                    <select
                      value={activeCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg outline-none"
                      style={{
                        backgroundColor: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : undefined
                }
              >
                {catEvolution.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Aucune donnée
                  </p>
                ) : (
                  <>
                    <BarChartVertical
                      data={catEvolution}
                      height={220}
                      tooltipFormatter={(v) => [
                        v !== undefined ? formatAmount(v) : '—',
                        activeCat,
                      ]}
                    />
                    <p className="text-xs mt-2" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--danger)' }}>●</span>{' '}
                      &gt;20% au-dessus de la moyenne ({formatAmount(avg)}/mois)
                    </p>
                  </>
                )}
              </SectionCard>
            </div>

          </div>
        )}
      </AnalysesLayout>
    </EpargneLayout>
  )
}