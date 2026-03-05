'use client'

import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { formatAmount, formatPercent } from '@/lib/formatters'
import { type SavingsProject } from '@prisma/client'

interface ProjectCardProps {
  project: SavingsProject & { allocations: { amount: number }[] }
  onReaffecter?: (projectId: string) => void
}

function getProgressColor(percent: number): string {
  if (percent >= 75) return 'var(--success)'
  if (percent >= 25) return 'var(--warning)'
  return 'var(--danger)'
}

export function ProjectCard({ project, onReaffecter }: ProjectCardProps): ReactElement {
  const hasTarget = project.targetAmount !== null && project.targetAmount > 0
  const percent   = hasTarget ? Math.min((project.currentAmount / project.targetAmount!) * 100, 100) : 0
  const allocationThisMonth = project.allocations[0]?.amount ?? 0

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {project.name}
          </h3>
          {/* Bouton réaffecter toujours visible si handler fourni et projet actif */}
          {onReaffecter && project.isActive && (
            <button
              onClick={() => onReaffecter(project.id)}
              className="text-xs underline whitespace-nowrap shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              Réaffecter →
            </button>
          )}
        </div>

        {/* Montant */}
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
            {formatAmount(project.currentAmount)}
          </span>
          {hasTarget && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              sur {formatAmount(project.targetAmount!)}
            </span>
          )}
        </div>

        {/* Barre de progression */}
        <div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: hasTarget ? `${percent}%` : '0%', backgroundColor: getProgressColor(percent) }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {hasTarget ? formatPercent(percent) : '— %'}
            </span>
            {allocationThisMonth !== 0 && (
              <span className="text-xs" style={{ color: allocationThisMonth > 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                {allocationThisMonth > 0 ? '+' : ''}{formatAmount(allocationThisMonth)} ce mois
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}