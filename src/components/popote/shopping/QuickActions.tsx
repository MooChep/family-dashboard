'use client'

import { useState } from 'react'
import { formatQuantity } from '@/lib/popote/units'

type QuickBuyEntry = { label: string; value: number; unit: string }

function defaultButtons(baseUnit: string): QuickBuyEntry[] {
  if (baseUnit === 'GRAM')       return [
    { label: '+100g',  value: 100,  unit: 'g'  },
    { label: '+250g',  value: 250,  unit: 'g'  },
    { label: '+500g',  value: 500,  unit: 'g'  },
  ]
  if (baseUnit === 'MILLILITER') return [
    { label: '+250ml', value: 250,  unit: 'ml' },
    { label: '+500ml', value: 500,  unit: 'ml' },
    { label: '+1L',    value: 1000, unit: 'ml' },
  ]
  return [
    { label: '+1', value: 1, unit: '' },
    { label: '+2', value: 2, unit: '' },
    { label: '+4', value: 4, unit: '' },
  ]
}

interface QuickActionsProps {
  label:       string
  plannedQty:  number | null
  displayUnit: string | null
  quickBuy:    QuickBuyEntry[] | null | undefined
  baseUnit:    string
  onConfirm:   (quantity: number, unit: string) => void
  onClose:     () => void
}

/**
 * Panneau Quick Actions (swipe gauche) — boutons de quantité rapide + saisie libre.
 */
export function QuickActions({
  label,
  plannedQty,
  displayUnit,
  quickBuy,
  baseUnit,
  onConfirm,
  onClose,
}: QuickActionsProps) {
  const [freeValue, setFreeValue] = useState('')

  const buttons = quickBuy && quickBuy.length > 0 ? quickBuy : defaultButtons(baseUnit)
  const unitLabel = baseUnit === 'GRAM' ? 'g' : baseUnit === 'MILLILITER' ? 'ml' : ''

  const plannedLabel = plannedQty !== null
    ? formatQuantity(plannedQty, displayUnit ?? unitLabel)
    : null

  function handleFreeConfirm() {
    const n = parseFloat(freeValue.replace(',', '.'))
    if (!isNaN(n) && n > 0) {
      onConfirm(n, unitLabel)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(0,0,0,0.4)',
          zIndex:     40,
        }}
      />

      {/* Panneau */}
      <div
        style={{
          position:     'fixed',
          bottom:       0,
          left:         0,
          right:        0,
          background:   'var(--surface)',
          borderTop:    '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          padding:      '20px 16px 32px',
          zIndex:       50,
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Titre */}
        <p className="font-display text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
          {label}
        </p>
        {plannedLabel && (
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Prévu : {plannedLabel}
          </p>
        )}

        {/* Boutons rapides */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {buttons.map(btn => (
            <button
              key={btn.label}
              onClick={() => onConfirm(btn.value, btn.unit)}
              className="px-4 py-2.5 rounded-xl font-mono text-sm font-medium"
              style={{
                background: 'var(--surface2)',
                color:      'var(--text)',
                border:     '1px solid var(--border)',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Saisie libre */}
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <input
            type="number"
            inputMode="decimal"
            value={freeValue}
            onChange={e => setFreeValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFreeConfirm()}
            placeholder={`Quantité${unitLabel ? ` (${unitLabel})` : ''}`}
            className="flex-1 py-2.5 font-mono text-sm bg-transparent outline-none"
            style={{ color: 'var(--text)' }}
          />
          <button
            onClick={handleFreeConfirm}
            disabled={!freeValue}
            className="font-mono text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Valider
          </button>
        </div>
      </div>
    </>
  )
}
