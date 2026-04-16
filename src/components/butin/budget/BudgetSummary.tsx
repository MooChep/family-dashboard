'use client'

import { type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'

interface BudgetSummaryProps {
  totalRevenus: number
  totalDepenses: number
  // totalButin supprimé : les projets de butin sont des enveloppes virtuelles,
  // ils ne font pas partie du budget mensuel réel
  solde: number // = totalRevenus - totalDepenses
}

/**
 * Synthèse du budget prévu — revenus vs dépenses uniquement.
 * Les projets de butin sont volontairement exclus : ils définissent
 * des objectifs (targetAmount) mais ne sont pas des dépenses du budget.
 */
export function BudgetSummary({ totalRevenus, totalDepenses, solde }: BudgetSummaryProps): ReactElement {
  const isSoldePositif = solde >= 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>

      {/* Titre */}
      <div className="px-4 py-3" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
        >
          Synthèse du budget prévu
        </span>
      </div>

      {/* Lignes */}
      <div style={{ backgroundColor: 'var(--surface2)' }}>
        <SummaryRow label="Revenus prévus"  amount={totalRevenus}  color="var(--success)" sign="+" />
        <SummaryRow label="Dépenses prévues" amount={totalDepenses} color="var(--danger)"  sign="−" />
      </div>

      {/* Solde final */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          backgroundColor: isSoldePositif
            ? 'color-mix(in srgb, var(--success) 8%, transparent)'
            : 'color-mix(in srgb, var(--danger) 8%, transparent)',
          borderTop: `1px solid ${isSoldePositif
            ? 'color-mix(in srgb, var(--success) 20%, transparent)'
            : 'color-mix(in srgb, var(--danger) 20%, transparent)'}`,
        }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          Solde projeté
        </span>
        <span
          className="text-xl font-semibold"
          style={{ color: isSoldePositif ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}
        >
          {isSoldePositif ? '+' : ''}{formatAmount(solde)}
        </span>
      </div>
    </div>
  )
}

// ── Ligne interne ──────────────────────────────────────────────────────────────

function SummaryRow({ label, amount, color, sign }: {
  label: string
  amount: number
  color: string
  sign: '+' | '−'
}): ReactElement {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text2)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {sign} {formatAmount(amount)}
      </span>
    </div>
  )
}