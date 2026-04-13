'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from 'lucide-react'
import type { InflationSummary } from '@/lib/labeur/types'

interface InflationBannerProps {
  inflation: InflationSummary
}

/**
 * Bandeau d'inflation du Marché.
 * Replié par défaut, affiche le % global avec un code couleur :
 *   - 0–24 %  : neutre (muted)
 *   - 25–49 % : ambre (warning)
 *   - 50 %+   : rouge (danger) + malédiction active
 * Au clic, déploie la liste des tâches responsables avec leur contribution.
 */
export function InflationBanner({ inflation }: InflationBannerProps) {
  const [expanded, setExpanded] = useState(false)

  const { globalPercent, isAboveCurse, isAboveAlert, tasks } = inflation

  // Couleur selon le niveau d'inflation
  const color = isAboveCurse
    ? 'var(--danger)'
    : isAboveAlert
    ? '#f59e0b'  // ambre
    : 'var(--muted)'

  const bgColor = isAboveCurse
    ? 'rgba(239,68,68,0.08)'
    : isAboveAlert
    ? 'rgba(245,158,11,0.08)'
    : 'var(--surface)'

  const borderColor = isAboveCurse
    ? 'rgba(239,68,68,0.25)'
    : isAboveAlert
    ? 'rgba(245,158,11,0.25)'
    : 'var(--border)'

  if (globalPercent === 0) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <TrendingUp size={16} style={{ color: 'var(--muted)' }} />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Marché stable — aucune inflation
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* ── Ligne principale (toujours visible) ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 gap-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            Marché à +{Math.round(globalPercent)} %
          </span>
          {isAboveCurse && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}
            >
              MALÉDICTION
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''} en retard
          </span>
          {expanded
            ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
          }
        </div>
      </button>

      {/* ── Liste dépliable des tâches responsables ── */}
      {expanded && tasks.length > 0 && (
        <div
          className="px-4 pb-3 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <p className="text-xs pt-2" style={{ color: 'var(--muted)' }}>
            Tâches contribuant à l'inflation :
          </p>
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-sm truncate"
                  style={{ color: 'var(--text)' }}
                >
                  {task.title}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                  {task.daysOverdue}j
                </span>
              </div>
              <span className="text-sm font-mono font-semibold ml-4 shrink-0" style={{ color }}>
                +{Math.round(task.inflationPercent)} %
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
