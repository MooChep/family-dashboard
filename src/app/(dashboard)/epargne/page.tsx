'use client'
import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { ProjectList } from '@/components/epargne/ProjectList'
import { MultiLineChart } from '@/components/epargne/analyses/AnalysesCharts'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatAmount } from '@/lib/formatters'
import { type SavingsProject, type SavingsAllocation } from '@prisma/client'

type ProjectWithAllocations = SavingsProject & { allocations: SavingsAllocation[] }

interface DashboardData {
  currentMonth: string
  summary: { revenus: number; depenses: number; epargne: number; reste: number }
  totalFortune: number
  projets: ProjectWithAllocations[]
  history: { month: Date; amount: number; project: { name: string } }[]
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function EpargneDashboard(): ReactElement {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Réaffectation
  const [reaffecterProjectId, setReaffecterProjectId] = useState<string | null>(null)
  const [targetProjectId, setTargetProjectId]         = useState('')
  const [reaffectMonth, setReaffectMonth]             = useState(getCurrentMonth())
  const [isReaffecterLoading, setIsReaffecterLoading] = useState(false)
  const [regulDone, setRegulDone] = useState<boolean | null>(null)

  async function loadData(): Promise<void> {
    try {
      setIsLoading(true)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const [dashRes, regulRes] = await Promise.all([
        fetch('/api/epargne/dashboard'),
        fetch(`/api/epargne/regul?month=${currentMonth}`),
      ])
      if (!dashRes.ok) throw new Error('Erreur chargement dashboard')
      setData(await dashRes.json() as DashboardData)
      const regulData = await regulRes.json() as Record<string, unknown> | null
      setRegulDone(regulData !== null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  async function handleReaffecter(): Promise<void> {
    if (!reaffecterProjectId || !targetProjectId) return
    setIsReaffecterLoading(true)
    try {
      const res = await fetch(`/api/epargne/projets/${reaffecterProjectId}/reaffecter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProjectId, month: reaffectMonth }),
      })
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

  // Calcule le cumul glissant par projet depuis les allocations
  const cumulByProject: Record<string, Record<string, number>> = {}
  if (data?.history) {
    // Trie par mois croissant
    const sorted = [...data.history].sort((a, b) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
    )
    for (const alloc of sorted) {
      const monthKey = new Date(alloc.month).toISOString().slice(0, 7)
      const name = alloc.project.name
      if (!cumulByProject[name]) cumulByProject[name] = {}
      const months = Object.keys(cumulByProject[name]).sort()
      const lastCumul = months.length > 0 ? cumulByProject[name][months[months.length - 1]] ?? 0 : 0
      cumulByProject[name][monthKey] = lastCumul + alloc.amount
    }
  }

  const reaffecterProject = data?.projets.find((p) => p.id === reaffecterProjectId)
  const otherProjects     = data?.projets.filter((p) => p.id !== reaffecterProjectId && p.isActive) ?? []

  // Prépare les données MultiLineChart
  const allProjectNames = Object.keys(cumulByProject)
  const allMonths = [...new Set(
    allProjectNames.flatMap((n) => Object.keys(cumulByProject[n]))
  )].sort()
  const COLORS = ['var(--accent)','var(--warning)','var(--danger)','var(--success)','var(--muted)']
  const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const cumulChartData = allMonths.map((m) => {
    const row: Record<string, string | number> = {
      month: MONTHS_SHORT[parseInt(m.split('-')[1]) - 1] + ' ' + m.split('-')[0].slice(2)
    }
    for (const name of allProjectNames) {
      // Propage le dernier cumul connu
      const known = Object.keys(cumulByProject[name]).filter((k) => k <= m).sort()
      row[name] = known.length > 0 ? cumulByProject[name][known[known.length - 1]] ?? 0 : 0
    }
    return row
  })

  if (isLoading) return (
    <EpargneLayout>
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    </EpargneLayout>
  )

  if (error) return (
    <EpargneLayout>
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={() => void loadData()}>Réessayer</Button>
      </div>
    </EpargneLayout>
  )

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-6 pt-12 md:pt-0">
        {/* Warning régul manquante */}
        {regulDone === false && (
          <a href="/epargne/regul" className="flex items-center gap-3 px-4 py-3 rounded-xl no-underline"
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)' }}>
            <span style={{ color: 'var(--warning)' }}>⚠</span>
            <span className="text-sm" style={{ color: 'var(--warning)', fontFamily: 'var(--font-body)' }}>
              La régularisation de ce mois n'a pas encore été effectuée
            </span>
            <span className="ml-auto text-xs" style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
              Faire la régul →
            </span>
          </a>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Projets d'épargne
          </h2>
          <ProjectList
            projects={data?.projets ?? []}
            onReaffecter={(id) => {
              setReaffecterProjectId(id)
              setTargetProjectId('')
              setReaffectMonth(getCurrentMonth())
            }}
          />
        </div>
        {/* Fortune totale */}
        {data && (
          <div
            className="flex items-center justify-between px-5 py-4 rounded-xl"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Fortune totale
              </span>
              <span className="text-xs" style={{ color: 'var(--muted2)' }}>Somme de tous les projets actifs</span>
            </div>
            <span className="text-2xl font-semibold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              {formatAmount(data.totalFortune)}
            </span>
          </div>
        )}

        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            Évolution des soldes par projet
          </h3>
          <MultiLineChart
            data={cumulChartData}
            lines={allProjectNames.map((name, i) => ({
              key: name,
              label: name,
              color: COLORS[i % COLORS.length],
            }))}
            height={260}
            formatter={(v, name) => [v !== undefined ? formatAmount(v as number) : '—', name as string]}
          />
        </div>
      </div>

      {/* ── Modal réaffectation ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!reaffecterProjectId}
        onClose={() => setReaffecterProjectId(null)}
        title="Réaffecter le solde"
      >
        <div className="flex flex-col gap-4">
          {/* Solde à transférer */}
          {reaffecterProject && (
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Solde de <strong style={{ color: 'var(--text)' }}>{reaffecterProject.name}</strong>
              </p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {formatAmount(reaffecterProject.currentAmount)}
              </p>
            </div>
          )}

          {/* Projet cible */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Projet cible</label>
            {otherProjects.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun autre projet actif disponible</p>
            ) : (
              <div className="flex flex-col gap-1">
                {otherProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargetProjectId(p.id)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: targetProjectId === p.id ? 'var(--accent-dim)' : 'var(--surface2)',
                      border: `1px solid ${targetProjectId === p.id ? 'var(--accent)' : 'var(--border)'}`,
                      color: targetProjectId === p.id ? 'var(--accent)' : 'var(--text)',
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {formatAmount(p.currentAmount)}
                      {p.targetAmount ? ` / ${formatAmount(p.targetAmount)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mois */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Mois de l'opération</label>
            <input
              type="month"
              value={reaffectMonth}
              onChange={(e) => setReaffectMonth(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Le projet <strong style={{ color: 'var(--text)' }}>{reaffecterProject?.name}</strong> sera marqué comme terminé et sa catégorie archivée.
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" size="md" onClick={() => setReaffecterProjectId(null)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={isReaffecterLoading} disabled={!targetProjectId} onClick={() => void handleReaffecter()}>
              Confirmer le transfert
            </Button>
          </div>
        </div>
      </Modal>
    </EpargneLayout>
  )
}