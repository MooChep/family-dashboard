'use client'

import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { formatAmount, formatPercent } from '@/lib/formatters'
import { type SavingsProject } from '@prisma/client'

interface ProjectCardProps {
  project: SavingsProject & { allocations: { amount: number }[] }
  onReaffecter?: (projectId: string) => void
  onAnnulerReaffectation?: (projectId: string) => void
  transferredToName?: string
}

function getProgressColor(percent: number): string {
  if (percent >= 75) return 'var(--success)'
  if (percent >= 25) return 'var(--warning)'
  return 'var(--danger)'
}

export function ProjectCard({ project, onReaffecter, onAnnulerReaffectation, transferredToName }: ProjectCardProps): ReactElement {
  const hasTarget = project.targetAmount !== null && project.targetAmount > 0
  const percent   = hasTarget ? Math.min((project.currentAmount / project.targetAmount!) * 100, 100) : 0
  const allocationThisMonth = project.allocations[0]?.amount ?? 0

  // Objectif atteint : currentAmount >= targetAmount (et un objectif défini)
  const isGoalReached = hasTarget && project.currentAmount >= project.targetAmount!

  return (
    <Card>
      <div className="flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-sm font-semibold"
                style={{
                  color: project.isActive ? 'var(--text)' : 'var(--muted)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {project.name}
              </h3>

              {/* Badge "Objectif atteint" — affiché uniquement quand currentAmount >= targetAmount */}
              {isGoalReached && project.isActive && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)',
                    color: 'var(--success)',
                    border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Le montant actuel atteint ou dépasse l'objectif fixé"
                >
                  🎯 Objectif atteint
                </span>
              )}
            </div>

            {!project.isActive && transferredToName && (
              <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                → {transferredToName}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {onReaffecter && project.isActive && (
              <button
                onClick={() => onReaffecter(project.id)}
                className="text-xs underline whitespace-nowrap"
                style={{ color: 'var(--accent)' }}
              >
                Réaffecter →
              </button>
            )}
            {onAnnulerReaffectation && !project.isActive &&
              (project as SavingsProject & { transferredToId?: string | null }).transferredToId && (
              <button
                onClick={() => onAnnulerReaffectation(project.id)}
                className="text-xs underline whitespace-nowrap"
                style={{ color: 'var(--warning)' }}
              >
                ↩ Annuler
              </button>
            )}
            {!project.isActive && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--surface2)',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                inactif
              </span>
            )}
          </div>
        </div>

        {/* ── Montant ── */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-2xl font-semibold"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
          >
            {formatAmount(project.currentAmount)}
          </span>
          {hasTarget && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              sur {formatAmount(project.targetAmount!)}
            </span>
          )}
        </div>

        {/* ── Barre de progression ── */}
        <div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--surface2)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: hasTarget ? `${percent}%` : '0%',
                backgroundColor: getProgressColor(percent),
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span
              className="text-xs"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            >
              {hasTarget ? formatPercent(percent) : '— %'}
            </span>
            {allocationThisMonth !== 0 && (
              <span
                className="text-xs"
                style={{
                  color: allocationThisMonth > 0 ? 'var(--success)' : 'var(--danger)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {allocationThisMonth > 0 ? '+' : ''}{formatAmount(allocationThisMonth)} ce mois
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}