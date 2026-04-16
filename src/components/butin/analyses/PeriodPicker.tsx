'use client'

import { useState, useEffect, type ReactElement } from 'react'

export type Period =
  | { type: 'preset'; value: 3 | 6 | 12 }
  | { type: 'custom'; from: string; to: string }

interface PeriodPickerProps {
  period: Period
  onChange: (period: Period) => void
  availableMonths: string[]
}

function shortLabel(iso: string): string {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const [y, m] = iso.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`
}

export function PeriodPicker({
  period,
  onChange,
  availableMonths,
}: PeriodPickerProps): ReactElement {
  const [showCustom, setShowCustom] = useState(false)

  // Synchronise from/to quand availableMonths change (chargement async)
  const [from, setFrom] = useState(availableMonths[0] ?? '')
  const [to, setTo]     = useState(availableMonths[availableMonths.length - 1] ?? '')

  useEffect(() => {
    if (availableMonths.length === 0) return
    // Met à jour seulement si la valeur actuelle n'est pas dans la liste
    if (!availableMonths.includes(from)) setFrom(availableMonths[0])
    if (!availableMonths.includes(to))   setTo(availableMonths[availableMonths.length - 1])
  }, [availableMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  const presets: { label: string; value: 3 | 6 | 12 }[] = [
    { label: '3 mois',  value: 3 },
    { label: '6 mois',  value: 6 },
    { label: '12 mois', value: 12 },
  ]

  const isCustom = period.type === 'custom'

  const selStyle: React.CSSProperties = {
    padding: '5px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface2)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    outline: 'none',
  }

  function applyCustom(): void {
    if (!from || !to) return
    const [fy, fm] = from.split('-').map(Number)
    const [ty, tm] = to.split('-').map(Number)
    // Garantit from <= to
    if (fy > ty || (fy === ty && fm > tm)) {
      onChange({ type: 'custom', from: to, to: from })
    } else {
      onChange({ type: 'custom', from, to })
    }
    setShowCustom(false)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap pt-2">
      {/* Présets */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => { onChange({ type: 'preset', value: p.value }); setShowCustom(false) }}
            className="px-2 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: period.type === 'preset' && period.value === p.value ? 'var(--accent)' : 'transparent',
              color:           period.type === 'preset' && period.value === p.value ? 'var(--bg)' : 'var(--text2)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: isCustom ? 'var(--accent)' : showCustom ? 'var(--accent-dim)' : 'transparent',
            color:           isCustom ? 'var(--bg)' : 'var(--text2)',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Personnalisé
        </button>
      </div>

      {/* Panneau plage personnalisée */}
      {showCustom && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>Du</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)} style={selStyle}>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{shortLabel(m)}</option>
            ))}
          </select>
          <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>au</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} style={selStyle}>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{shortLabel(m)}</option>
            ))}
          </select>
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Appliquer
          </button>
        </div>
      )}

      {/* Badge plage active si custom */}
      {isCustom && !showCustom && (
        <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {shortLabel(period.from)} → {shortLabel(period.to)}
        </span>
      )}
    </div>
  )
}