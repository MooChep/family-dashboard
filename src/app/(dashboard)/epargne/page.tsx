'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { ProjectList } from '@/components/epargne/ProjectList'
import { MonthSummary } from '@/components/epargne/MonthSummary'
import { SavingsChart } from '@/components/epargne/SavingsChart'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { type SavingsProject, type SavingsAllocation } from '@prisma/client'

type ProjectWithAllocations = SavingsProject & {
  allocations: SavingsAllocation[]
}

interface DashboardData {
  currentMonth: string
  summary: {
    revenus: number
    depenses: number
    epargne: number
    reste: number
  }
  projets: ProjectWithAllocations[]
  history: {
    month: Date
    amount: number
    project: { name: string }
  }[]
}

export default function EpargneDashboard(): ReactElement {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reaffecterProjectId, setReaffecterProjectId] = useState<string | null>(null)
  const [targetProjectId, setTargetProjectId] = useState('')
  const [isReaffecterLoading, setIsReaffecterLoading] = useState(false)

  async function loadData(): Promise<void> {
    try {
      setIsLoading(true)
      const res = await fetch('/api/epargne/dashboard')
      if (!res.ok) throw new Error('Erreur chargement dashboard')
      const json = await res.json() as DashboardData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  async function handleReaffecter(): Promise<void> {
    if (!reaffecterProjectId || !targetProjectId || !data) return
    setIsReaffecterLoading(true)
    try {
      const res = await fetch(
        `/api/epargne/projets/${reaffecterProjectId}/reaffecter`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetProjectId,
            month: data.currentMonth,
          }),
        },
      )
      if (!res.ok) throw new Error('Erreur réaffectation')
      setReaffecterProjectId(null)
      setTargetProjectId('')
      await loadData()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur réaffectation')
    } finally {
      setIsReaffecterLoading(false)
    }
  }

  // Construit projectsByMonth depuis l'historique pour le graphique
  const projectsByMonth: Record<string, Record<string, number>> = {}
  if (data?.history) {
    for (const alloc of data.history) {
      const monthKey = new Date(alloc.month).toISOString().slice(0, 7)
      if (!projectsByMonth[monthKey]) projectsByMonth[monthKey] = {}
      projectsByMonth[monthKey][alloc.project.name] =
        (projectsByMonth[monthKey][alloc.project.name] ?? 0) + alloc.amount
    }
  }

  const reaffecterProject = data?.projets.find((p) => p.id === reaffecterProjectId)
  const otherProjects = data?.projets.filter((p) => p.id !== reaffecterProjectId) ?? []

  if (isLoading) {
    return (
      <EpargneLayout>
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </EpargneLayout>
    )
  }

  if (error) {
    return (
      <EpargneLayout>
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => void loadData()}
          >
            Réessayer
          </Button>
        </div>
      </EpargneLayout>
    )
  }

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-6">
        {/* Résumé du mois */}
        {data && (
          <MonthSummary
            revenus={data.summary.revenus}
            depenses={data.summary.depenses}
            epargne={data.summary.epargne}
            reste={data.summary.reste}
          />
        )}

        {/* Projets */}
        <div className="flex flex-col gap-3">
          <h2
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
          >
            Projets d'épargne
          </h2>
          <ProjectList
            projects={data?.projets ?? []}
            onReaffecter={(id) => setReaffecterProjectId(id)}
          />
        </div>

        {/* Graphique */}
        <SavingsChart projectsByMonth={projectsByMonth} />
      </div>

      {/* Modale réaffectation */}
      <Modal
        isOpen={!!reaffecterProjectId}
        onClose={() => setReaffecterProjectId(null)}
        title="Réaffecter le solde"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Transférer le solde de{' '}
            <strong style={{ color: 'var(--text)' }}>
              {reaffecterProject?.name}
            </strong>{' '}
            vers :
          </p>
          <select
            value={targetProjectId}
            onChange={(e) => setTargetProjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">Sélectionner un projet...</option>
            {otherProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setReaffecterProjectId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isReaffecterLoading}
              disabled={!targetProjectId}
              onClick={() => void handleReaffecter()}
            >
              Réaffecter
            </Button>
          </div>
        </div>
      </Modal>
    </EpargneLayout>
  )
}