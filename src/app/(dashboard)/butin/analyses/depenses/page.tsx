'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/butin/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/butin/analyses/PeriodPicker'
import {
  BarChartVertical,
  BarChartHorizontal,
  SectionCard,
} from '@/components/butin/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { ButinLayout } from '@/components/butin/ButinLayout'

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
  // Noms des projets de butin à exclure (leurs catégories PROJECT ne sont pas des dépenses)
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
    <ButinLayout>
      <div className='pt-10 md:pt-0'> 
      <AnalysesLayout subHeader={periodHeader}>
        {/* ... error handling ... */}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10 md:pt-0">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cumul par poste */}
            <SectionCard title="Cumul par poste">
              {cumulsData.length === 0 ? (
                <p className="text-sm text(--muted)]">Aucune dépense</p>
              ) : (
                <BarChartHorizontal data={cumulsData} />
              )}
            </SectionCard>

            {/* Top 5 - Masqué ou réduit sur petit écran si besoin, ici on le garde */}
            <SectionCard title="Top 5 postes">
              <div className="flex flex-col gap-3">
                {cumulsData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="truncate text(--text2)]">{d.label}</span>
                    </div>
                    <span className="font-semibold text(--text) font(--font-mono)]">
                      {formatAmount(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Évolution par catégorie - Select en dessous du titre sur mobile */}
            <div className="col-span-1 md:col-span-2">
              <SectionCard
                title="Évolution catégorie"
                action={
                  categories.length > 0 && (
                    <select
                      value={activeCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg outline-none bg(--surface2) border border(--border) text(--text) font(--font-mono) w-full md:w-auto mt-2 md:mt-0"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )
                }
              >
                <BarChartVertical
                  data={catEvolution}
                  height={220}
                  tooltipFormatter={(v) => [v !== undefined ? formatAmount(v) : '—', activeCat]}
                />
                <p className="text-[10px] mt-2 text(--muted) font(--font-mono)]">
                  <span className="text(--danger)]">●</span> &gt;20% au-dessus de la moy. ({formatAmount(avg)}/m)
                </p>
              </SectionCard>
            </div>
          </div>
        )}
      </AnalysesLayout>
      </div>
    </ButinLayout>
  )
}