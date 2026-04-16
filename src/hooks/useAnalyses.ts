'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Period } from '@/components/butin/analyses/PeriodPicker'

export interface TransactionRow {
  id: string
  month: string
  date: string
  amount: number
  isIncome: boolean
  category: string
  tags: string[]
}

export interface AnalysesData {
  period: { from: string; to: string }
  periodStart: string   // borne minimale du sélecteur (ex: "2024-10")
  expensesByMonth: Record<string, Record<string, number>>
  revenueByMonth: Record<string, number>
  savingsByMonth: Record<string, Record<string, number>>
  savingsRateByMonth: Record<string, number>
  cumulByProject: Record<string, Record<string, number>>
  wealthByMonth: Record<string, number>
  accountWealthByMonth: Record<string, number>
  projections: {
    id: string
    name: string
    targetAmount: number | null
    currentAmount: number
    avgMonthlySaving: number
    avgPct: number
    monthsToTarget: number | null
    percentComplete: number
  }[]
  tagsSummary: {
    tag: string
    category: string
    total: number
    count: number
    entries: { month: string; amount: number; isIncome: boolean }[]
  }[]
  txsByTag: Record<string, TransactionRow[]>
  projects: { id: string; name: string }[]
}

function buildUrl(period: Period): string {
  if (period.type === 'custom') {
    return `/api/butin/analyses?from=${period.from}&to=${period.to}`
  }
  return `/api/butin/analyses?period=${period.value}`
}

export function useAnalyses(period: Period) {
  const [data, setData]           = useState<AnalysesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(period))
      if (!res.ok) throw new Error('Erreur chargement analyses')
      const json = await res.json() as AnalysesData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => { void load() }, [load])

  return { data, isLoading, error, reload: load }
}

// Tous les mois entre deux dates ISO "YYYY-MM" inclus
export function getAvailableMonths(from: string, to: string): string[] {
  const months: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let year = fy, month = fm
  while (year < ty || (year === ty && month <= tm)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month > 12) { month = 1; year++ }
  }
  return months
}