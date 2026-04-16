'use client'
import { useState, type ReactElement } from 'react'
import { AnalysesLayout } from '@/components/butin/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/butin/analyses/PeriodPicker'
import { BarChartVertical, MultiLineChart, StatCard, SectionCard } from '@/components/butin/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { ButinLayout } from '@/components/butin/ButinLayout'

function shortLabel(iso: string): string {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const [, m] = iso.split('-')
  return MONTHS[parseInt(m) - 1]
}

export default function AnalysesGlobalPage(): ReactElement {
  const [period, setPeriod] = useState<Period>({ type: 'preset', value: 6 })
  const { data, isLoading, error } = useAnalyses(period)

  const PERIOD_START = '2024-10'
  const availableMonths = getAvailableMonths(
    data?.periodStart ?? PERIOD_START,
    new Date().toISOString().slice(0, 7),
  )

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
    <ButinLayout>
      <div className='pt-10 md:pt-0'> 
      <AnalysesLayout subHeader={periodHeader}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10 md:pt-0">
            <SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <SectionCard title="Moyennes mensuelles">
                {/* Grid adaptatif : 1 col mobile, 3 cols desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Revenus"  value={formatAmount(avgRev)} sub="/ mois moy." color="var(--success)" />
                  <StatCard label="Dépenses" value={formatAmount(avgDep)} sub="/ mois moy." color="var(--danger)" />
                  <StatCard label="Butin"    value={formatAmount(avgSav)} sub="/ mois moy." color="var(--accent)" />
                </div>
              </SectionCard>
            </div>
            
            <SectionCard title="Solde net mensuel">
              <BarChartVertical data={netData} height={200} />
            </SectionCard>

            <SectionCard title="Revenus vs Dépenses">
              <MultiLineChart
                data={revDepData}
                lines={[{ key: 'Revenus', label: 'Rev.' }, { key: 'Dépenses', label: 'Dép.' }]}
                height={200}
              />
            </SectionCard>
          </div>
        )}
      </AnalysesLayout>
    </div>
    </ButinLayout>
  )
}