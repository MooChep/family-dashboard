'use client'

import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import { BarChartVertical, MultiLineChart, StatCard, SectionCard } from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

function shortLabel(iso: string): string {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const [, m] = iso.split('-')
  return MONTHS[parseInt(m) - 1]
}

export default function AnalysesGlobalPage(): ReactElement {
  const [period, setPeriod] = useState<Period>({ type: 'preset', value: 6 })
  const { data, isLoading, error } = useAnalyses(period)

  const availableMonths = data
    ? getAvailableMonths(data.period.from, data.period.to)
    : getAvailableMonths('2025-01', new Date().toISOString().slice(0, 7))

  const months = data ? Object.keys(data.revenueByMonth).sort() : []
  const n = months.length || 1

  const avgRev = months.reduce((s, m) => s + (data?.revenueByMonth[m] ?? 0), 0) / n
  const avgDep = months.reduce((s, m) => {
    return s + Object.values(data?.expensesByMonth[m] ?? {}).reduce((a, v) => a + v, 0)
  }, 0) / n
  const avgSav = months.reduce((s, m) => {
    return s + Object.values(data?.savingsByMonth[m] ?? {}).reduce((a, v) => a + v, 0)
  }, 0) / n

  const netData = months.map((m) => {
    const rev = data?.revenueByMonth[m] ?? 0
    const dep = Object.values(data?.expensesByMonth[m] ?? {}).reduce((s, v) => s + v, 0)
    const net = rev - dep
    return {
      label: shortLabel(m),
      value: net,
      color: net >= 500 ? 'var(--success)' : net >= 0 ? 'var(--warning)' : 'var(--danger)',
    }
  })

  const revDepData = months.map((m) => ({
    month: shortLabel(m),
    Revenus: data?.revenueByMonth[m] ?? 0,
    Dépenses: Object.values(data?.expensesByMonth[m] ?? {}).reduce((s, v) => s + v, 0),
  }))

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
          {/* Moyennes */}
          <div className="col-span-2">
            <SectionCard title="Moyennes mensuelles sur la période">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Revenus"  value={formatAmount(avgRev)} sub="/ mois en moyenne" color="var(--success)" />
                <StatCard label="Dépenses" value={formatAmount(avgDep)} sub="/ mois en moyenne" color="var(--danger)" />
                <StatCard label="Épargne"  value={formatAmount(avgSav)} sub="/ mois en moyenne" color="var(--accent)" />
              </div>
            </SectionCard>
          </div>

          {/* Solde net */}
          <SectionCard title="Solde net mensuel">
            <BarChartVertical
              data={netData}
              height={220}
              tooltipFormatter={(v) => [v !== undefined ? formatAmount(v) : '—', 'Solde net']}
            />
          </SectionCard>

          {/* Revenus vs Dépenses */}
          <SectionCard title="Revenus vs Dépenses">
            <MultiLineChart
              data={revDepData}
              lines={[
                { key: 'Revenus',  label: 'Revenus' },
                { key: 'Dépenses', label: 'Dépenses' },
              ]}
              height={220}
            />
          </SectionCard>
        </div>
      )}
    </AnalysesLayout>
    </EpargneLayout>
  )
}