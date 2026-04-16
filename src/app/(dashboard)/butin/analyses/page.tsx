'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/butin/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/butin/analyses/PeriodPicker'
import { MultiLineChart, BarChartVertical, StatCard, SectionCard } from '@/components/butin/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { ButinLayout } from '@/components/butin/ButinLayout'

function shortLabel(iso: string): string {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const [, m] = iso.split('-')
  return MONTHS[parseInt(m) - 1]
}

const COLORS = ['var(--accent)','var(--warning)','var(--danger)','var(--success)','var(--muted)']

export default function AnalysesButinPage(): ReactElement {
  const [period, setPeriod] = useState<Period>({ type: 'preset', value: 6 })
  const { data, isLoading, error } = useAnalyses(period)

  const PERIOD_START = '2024-10'
  const currentMonth = new Date().toISOString().slice(0, 7)
  const availableMonths = getAvailableMonths(
    data?.periodStart ?? PERIOD_START,
    currentMonth,
  )

  // Filtre les mois selon la période sélectionnée
  const periodFrom = data?.period.from ?? ''
  const periodTo   = data?.period.to   ?? ''

  // Soldes cumulés par projet — filtrés par période
  const cumulMonths = data
    ? Object.keys(data.cumulByProject[Object.keys(data.cumulByProject)[0]] ?? {})
        .filter((m) => m >= periodFrom && m <= periodTo)
        .sort()
    : []
  const cumulData = cumulMonths.map((m) => {
    const row: Record<string, string | number> = { month: shortLabel(m) }
    if (data) {
      for (const project of data.projects) {
        row[project.name] = data.cumulByProject[project.id]?.[m] ?? 0
      }
    }
    return row
  })

  // Fortune totale — filtrée par période
  const wealthMonths = data
    ? Object.keys(data.wealthByMonth)
        .filter((m) => m >= periodFrom && m <= periodTo)
        .sort()
    : []
  const wealthData = wealthMonths.map((m) => ({
    month: shortLabel(m),
    'Fortune totale': data?.wealthByMonth[m] ?? 0,
  }))
  const latestWealth = wealthMonths.length > 0
    ? (data?.wealthByMonth[wealthMonths[wealthMonths.length - 1]] ?? 0)
    : 0

  // Taux de butin
  const rateMonths = data ? Object.keys(data.savingsRateByMonth).sort() : []
  const rateData = rateMonths.map((m) => {
    const rate = data?.savingsRateByMonth[m] ?? 0
    return {
      label: shortLabel(m),
      value: rate,
      color: rate >= 20 ? 'var(--success)' : rate >= 10 ? 'var(--warning)' : 'var(--danger)',
    }
  })

  const periodHeader = (
    <PeriodPicker period={period} onChange={setPeriod} availableMonths={availableMonths} />
  )

  if (error) {
    return (
      <AnalysesLayout subHeader={periodHeader}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      </AnalysesLayout>
    )
  }

  return (
    <ButinLayout>
      {/* padding décalage avec le header */}
      <div className='pt-10 md:pt-0'> 
      <AnalysesLayout subHeader={periodHeader}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10 md:pt-0">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          /* Passage en 1 colonne sur mobile, 2 sur desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Fortune totale */}
            <div className="md:col-span-2">
              <SectionCard
                title="Fortune totale"
                action={
                  <span className="text-base md:text-lg font-semibold text-(--accent) font-(--font-mono)]">
                    {formatAmount(latestWealth)}
                  </span>
                }
              >
                <MultiLineChart
                  data={wealthData}
                  lines={[{ key: 'Fortune totale', label: 'Fortune totale' }]}
                  height={220}
                  formatter={(v) => [v !== undefined ? formatAmount(v) : '—', 'Fortune totale']}
                />
              </SectionCard>
            </div>

            {/* Soldes cumulés par projet */}
            <div className="col-span-1 md:col-span-1">
              <SectionCard title="Évolution des soldes">
                <MultiLineChart
                  data={cumulData}
                  lines={data?.projects.map((p) => ({ key: p.name, label: p.name })) ?? []}
                  height={240}
                  formatter={(v, name) => [v !== undefined ? formatAmount(v) : '—', name as string]}
                />
              </SectionCard>
            </div>

            {/* Taux de butin */}
            <SectionCard title="Taux de butin mensuel">
              <BarChartVertical
                data={rateData}
                height={220}
                showValues={true}
                yAxisFormatter={(v) => `${v}%`}
                tooltipFormatter={(v) => [v !== undefined ? `${v}%` : '—', 'Taux']}
              />
              <div className="flex flex-wrap gap-3 mt-3">
                {[
                  { label: '≥ 20%', color: 'var(--success)' },
                  { label: '≥ 10%', color: 'var(--warning)' },
                  { label: '< 10%', color: 'var(--danger)' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-(--muted) font-(--font-mono)]">{s.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Projections - Grid adaptatif pour les mini-cards */}
            <div className="col-span-1 md:col-span-2">
              <SectionCard title="Projections">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data?.projections.map((p, i) => (
                    <div key={p.id} className="flex flex-col gap-2 p-4 rounded-xl bg-(--surface2) border border-(--border)]">
                      <div className="text-xs text-(--muted)]">{p.name}</div>
                      <div className="text-lg font-semibold text-(--text) font-(--font-mono)]">
                        {formatAmount(p.currentAmount)}
                      </div>
                      {p.targetAmount && (
                        <>
                          <div className="text-[10px] text-(--muted2)]">sur {formatAmount(p.targetAmount)}</div>
                          <div className="h-1 rounded-full bg-(--surface)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.percentComplete}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-(--muted) font-(--font-mono)]">{p.percentComplete.toFixed(0)}%</span>
                            {p.monthsToTarget != null && (
                              <span className="text-[10px] text-(--accent) font-(--font-mono)]">~{p.monthsToTarget} mois</span>
                            )}
                          </div>
                        </>
                      )}
                      <div className="flex flex-col gap-0.5 pt-1 border-t border-(--border)]">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-(--muted) font-(--font-mono)]">moy./mois</span>
                          <span className="font-medium text-(--text) font-(--font-mono)]">{formatAmount(p.avgMonthlySaving)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-(--muted) font-(--font-mono)]">% revenus</span>
                          <span className="font-medium text-(--accent) font-(--font-mono)]">{p.avgPct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </AnalysesLayout>
        </div>
    </ButinLayout>
  )
}