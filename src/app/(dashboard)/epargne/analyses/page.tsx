'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import { MultiLineChart, BarChartVertical, StatCard, SectionCard } from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

function shortLabel(iso: string): string {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const [, m] = iso.split('-')
  return MONTHS[parseInt(m) - 1]
}

const COLORS = ['var(--accent)','var(--warning)','var(--danger)','var(--success)','var(--muted)']

export default function AnalysesEpargnePage(): ReactElement {
  const [period, setPeriod] = useState<Period>({ type: 'preset', value: 6 })
  const { data, isLoading, error } = useAnalyses(period)

  const availableMonths = data
    ? getAvailableMonths(data.period.from, data.period.to)
    : getAvailableMonths('2025-01', new Date().toISOString().slice(0, 7))

  // Données pour le graphique soldes cumulés
  const months = data ? Object.keys(data.cumulByProject[Object.keys(data.cumulByProject)[0]] ?? {}).sort() : []

  const cumulData = months.map((m) => {
    const row: Record<string, string | number> = { month: shortLabel(m) }
    if (data) {
      for (const project of data.projects) {
        row[project.name] = data.cumulByProject[project.id]?.[m] ?? 0
      }
    }
    return row
  })

  // Données taux d'épargne
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
    <EpargneLayout>
    <AnalysesLayout subHeader={periodHeader}>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Soldes cumulés */}
          <SectionCard title="Évolution des soldes cumulés">
            <MultiLineChart
              data={cumulData}
              lines={data?.projects.map((p, i) => ({ key: p.name, label: p.name })) ?? []}
              height={240}
            />
          </SectionCard>

          {/* Taux d'épargne */}
          <SectionCard title="Taux d'épargne mensuel">
            <BarChartVertical
              data={rateData}
              height={220}
              showValues={true}
              yAxisFormatter={(v) => `${v}%`}
              tooltipFormatter={(v) => [v !== undefined ? `${v}%` : '—', 'Taux']}
            />
            <div className="flex gap-4 mt-3">
              {[
                { label: '≥ 20%', color: 'var(--success)' },
                { label: '≥ 10%', color: 'var(--warning)' },
                { label: '< 10%', color: 'var(--danger)' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Projections */}
          <div className="col-span-2">
            <SectionCard title="Projections — moyenne des 3 derniers mois">
              <div className="grid grid-cols-4 gap-3">
                {data?.projections.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 p-4 rounded-xl"
                    style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>{p.name}</div>
                    <div className="text-xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatAmount(p.currentAmount)}
                    </div>
                    {p.targetAmount && (
                      <>
                        <div className="text-xs" style={{ color: 'var(--muted2)' }}>sur {formatAmount(p.targetAmount)}</div>
                        <div className="h-1 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${p.percentComplete}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                            {p.percentComplete.toFixed(0)}%
                          </span>
                          {p.monthsToTarget != null && (
                            <span className="text-xs" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                              ~{p.monthsToTarget} mois
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted2)' }}>
                          moy. {formatAmount(p.avg3MonthsSaving)}/mois
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </AnalysesLayout>
    </EpargneLayout>
  )
}