'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { SavingsChart } from '@/components/epargne/SavingsChart'
import { ExpensesChart } from '@/components/epargne/ExpensesChart'
import { AnalyticsSummary } from '@/components/epargne/AnalyticsSummary'
import { SkeletonCard } from '@/components/ui/Skeleton'

interface AnalysesData {
  period: number
  expensesByMonth: Record<string, Record<string, number>>
  projectsByMonth: Record<string, Record<string, number>>
}

const PERIODS = [
  { label: '3 mois', value: 3 },
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
]

export default function AnalysesPage(): ReactElement {
  const [period, setPeriod] = useState(6)
  const [data, setData] = useState<AnalysesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load(): Promise<void> {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/epargne/analyses?period=${period}`)
        const json = await res.json() as AnalysesData
        setData(json)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [period])

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-6">
        {/* Sélecteur période */}
        <div
          className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: period === p.value
                  ? 'var(--accent)'
                  : 'transparent',
                color: period === p.value ? 'var(--bg)' : 'var(--text2)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            <ExpensesChart expensesByMonth={data?.expensesByMonth ?? {}} />
            <SavingsChart projectsByMonth={data?.projectsByMonth ?? {}} />
            <AnalyticsSummary
              expensesByMonth={data?.expensesByMonth ?? {}}
              period={period}
            />
          </>
        )}
      </div>
    </EpargneLayout>
  )
}