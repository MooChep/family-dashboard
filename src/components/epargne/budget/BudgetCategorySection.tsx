'use client'

import { useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { formatAmount } from '@/lib/formatters'
import type { Category } from '@prisma/client'
import type { LocalEntry } from './BudgetMonthView'

interface BudgetCategorySectionProps {
  category: Category
  entries: LocalEntry[]
  realAmount: number
  suggestion: number | null
  isEditMode: boolean
  isValidated: boolean
  onUpdate: (id: string, field: 'label' | 'amount' | 'editScope' | 'deleteScope', value: string | number) => void
  onDelete: (id: string, scope: 'once' | 'all') => void
  onRestore: (id: string) => void
  onAdd: (entry: Omit<LocalEntry, 'id' | 'isNew' | 'isDeleted' | 'deleteScope' | 'editScope' | 'originalLabel' | 'originalAmount'>) => void
}

function getTrackingColor(real: number, budget: number): string {
  if (budget === 0) return 'var(--muted)'
  const ratio = real / budget
  if (ratio > 1)    return 'var(--danger)'
  if (ratio > 0.85) return 'var(--warning)'
  return 'var(--success)'
}

function getAddLabel(type: string): string {
  if (type === 'PROJECT') return '+ Ajouter un projet (ex: Maroc 2000€)'
  if (type === 'INCOME')  return '+ Ajouter un revenu prévu'
  return '+ Ajouter une dépense prévue'
}

function getPlaceholderLabel(type: string): string {
  if (type === 'PROJECT') return 'Nom du projet (ex: Maroc)'
  if (type === 'INCOME')  return 'Libellé (ex: Salaire)'
  return 'Libellé (ex: Netflix)'
}

const RECURRENCE_LABELS: Record<string, string> = {
  NONE: 'Ponctuel', MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', ANNUAL: 'Annuel', CUSTOM: 'Personnalisé',
}

export function BudgetCategorySection({
  category,
  entries,
  realAmount,
  suggestion,
  isEditMode,
  isValidated,
  onUpdate,
  onDelete,
  onRestore,
  onAdd,
}: BudgetCategorySectionProps): ReactElement {
  const [isExpanded, setIsExpanded]           = useState(entries.filter((e) => !e.isDeleted).length > 0)
  const [showAddForm, setShowAddForm]         = useState(false)
  const [addLabel, setAddLabel]               = useState('')
  const [addAmount, setAddAmount]             = useState('')
  const [addRecurrence, setAddRecurrence]     = useState<LocalEntry['recurrence']>('NONE')
  const [addCustomMonths, setAddCustomMonths] = useState('3')
  const [scopeModal, setScopeModal]           = useState<string | null>(null)

  const typeColor = category.type === 'INCOME'  ? 'var(--success)'
    : category.type === 'PROJECT' ? 'var(--accent)'
    : 'var(--danger)'

  const border = '1px solid var(--border)'

  const visibleEntries = entries.filter((e) => !e.isDeleted)
  const deletedEntries = isEditMode ? entries.filter((e) => e.isDeleted) : []
  const totalBudget    = visibleEntries.reduce((s, e) => s + e.amount, 0)

  // Barre de progression : affiché dans le header si mois validé, hors PROJECT, hors mode édition
  const showProgress = isValidated && !isEditMode && totalBudget > 0 && category.type !== 'PROJECT'
  const progressPct  = showProgress ? Math.min((realAmount / totalBudget) * 100, 100) : 0
  const progressColor = getTrackingColor(realAmount, totalBudget)

  // ── Ajout ─────────────────────────────────────────────────────────────────
  function handleAdd(): void {
    if (!addLabel.trim() || !addAmount) return
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) return
    onAdd({
      label: addLabel.trim(), amount, categoryId: category.id,
      budgetLineId: null, recurrence: addRecurrence,
      recurrenceMonths: addRecurrence === 'CUSTOM' ? parseInt(addCustomMonths) : undefined,
    })
    setAddLabel(''); setAddAmount(''); setAddRecurrence('NONE')
    setShowAddForm(false)
  }

  function requestDelete(entry: LocalEntry): void {
    if (entry.budgetLineId) {
      setScopeModal(entry.id)
    } else {
      onDelete(entry.id, 'once')
    }
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border }}>

        {/* ── Header avec barre de progression intégrée ── */}
        <button
          className="w-full flex flex-col px-4 py-3 text-left gap-2"
          onClick={() => setIsExpanded((v) => !v)}
          style={{ borderBottom: isExpanded ? border : 'none' }}
        >
          {/* Ligne principale : nom + montants + chevron */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {category.name}
              </span>
              {category.type === 'PROJECT' && totalBudget > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                >
                  objectif : {formatAmount(totalBudget)}
                </span>
              )}
              {suggestion !== null && visibleEntries.length === 0 && category.type !== 'PROJECT' && (
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  moy. {formatAmount(suggestion)}/mois
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* En mode validé : affiche réel / budget côte à côte dans le header */}
              {showProgress && (
                <div className="flex items-center gap-1.5 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: progressColor }}>{formatAmount(realAmount)}</span>
                  <span style={{ color: 'var(--muted)' }}>/</span>
                  <span style={{ color: 'var(--text2)' }}>{formatAmount(totalBudget)}</span>
                </div>
              )}
              {/* En mode non validé ou PROJECT : affiche juste le total budget */}
              {!showProgress && totalBudget > 0 && (
                <span className="text-sm font-medium" style={{ color: typeColor, fontFamily: 'var(--font-mono)' }}>
                  {formatAmount(totalBudget)}
                </span>
              )}
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
            </div>
          </div>

          {/* Barre de progression — juste sous la ligne principale, dans le header */}
          {showProgress && (
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: progressColor }}
              />
            </div>
          )}
        </button>

        {/* ── Contenu ── */}
        {isExpanded && (
          <div className="flex flex-col">

            {/* Mode LECTURE */}
            {!isEditMode && visibleEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: border }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{entry.label}</span>
                  {entry.recurrence !== 'NONE' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline"
                      style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                    >
                      {RECURRENCE_LABELS[entry.recurrence]}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium flex-shrink-0" style={{ color: typeColor, fontFamily: 'var(--font-mono)' }}>
                  {formatAmount(entry.amount)}
                </span>
              </div>
            ))}

            {/* Mode ÉDITION */}
            {isEditMode && (
              <>
                {visibleEntries.map((entry) => {
                  const isChanged = entry.label !== entry.originalLabel || entry.amount !== entry.originalAmount
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 px-4 py-2.5"
                      style={{
                        borderBottom: border,
                        backgroundColor: entry.isNew
                          ? 'color-mix(in srgb, var(--success) 5%, transparent)'
                          : isChanged ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent',
                      }}
                    >
                      <input
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{ backgroundColor: 'var(--surface2)', border, color: 'var(--text)' }}
                        value={entry.label}
                        onChange={(e) => onUpdate(entry.id, 'label', e.target.value)}
                      />
                      <input
                        className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                        type="number" min="0" step="0.01"
                        style={{ backgroundColor: 'var(--surface2)', border, color: typeColor, fontFamily: 'var(--font-mono)' }}
                        value={entry.amount}
                        onChange={(e) => onUpdate(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                      />
                      {entry.budgetLineId && isChanged && !entry.isNew && (
                        <select
                          className="text-xs px-2 py-1.5 rounded-lg outline-none hidden sm:block"
                          style={{ backgroundColor: 'var(--surface2)', border, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
                          value={entry.editScope}
                          onChange={(e) => onUpdate(entry.id, 'editScope', e.target.value)}
                        >
                          <option value="once">Ce mois</option>
                          <option value="all">Tous les mois</option>
                        </select>
                      )}
                      {entry.isNew && (
                        <span className="text-xs px-1.5 py-0.5 rounded hidden sm:inline"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                          nouveau
                        </span>
                      )}
                      <button onClick={() => requestDelete(entry)}
                        className="w-7 h-7 flex items-center justify-center rounded flex-shrink-0"
                        style={{ color: 'var(--danger)' }} title="Supprimer">✕</button>
                    </div>
                  )
                })}

                {/* Lignes supprimées — barrées avec option restaurer */}
                {deletedEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 px-4 py-2.5"
                    style={{ borderBottom: border, backgroundColor: 'color-mix(in srgb, var(--danger) 5%, transparent)', opacity: 0.6 }}>
                    <span className="flex-1 text-sm line-through" style={{ color: 'var(--muted)' }}>{entry.label}</span>
                    <span className="text-xs" style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      {entry.deleteScope === 'all' ? 'supprimé (tous les mois)' : 'supprimé (ce mois)'}
                    </span>
                    <button onClick={() => onRestore(entry.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                      Restaurer
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Formulaire d'ajout (mode édition uniquement) */}
            {isEditMode && (
              showAddForm ? (
                <div className="px-4 py-3 flex flex-col gap-3" style={{ backgroundColor: 'var(--surface2)' }}>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none"
                      placeholder={getPlaceholderLabel(category.type)}
                      style={{ backgroundColor: 'var(--surface)', border, color: 'var(--text)' }}
                      value={addLabel} onChange={(e) => setAddLabel(e.target.value)}
                    />
                    <input
                      className="w-28 px-3 py-2 rounded-lg text-sm outline-none text-right"
                      placeholder="0.00" type="number" min="0" step="0.01"
                      style={{ backgroundColor: 'var(--surface)', border, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                      value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
                    />
                  </div>
                  {category.type !== 'PROJECT' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs" style={{ color: 'var(--muted)' }}>Récurrence :</label>
                      {(['NONE', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'] as const).map((r) => (
                        <button key={r} onClick={() => setAddRecurrence(r)} className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: addRecurrence === r ? 'var(--accent)' : 'var(--surface)',
                            color: addRecurrence === r ? 'var(--bg)' : 'var(--text2)',
                            border, fontFamily: 'var(--font-mono)',
                          }}>
                          {RECURRENCE_LABELS[r]}
                        </button>
                      ))}
                      {addRecurrence === 'CUSTOM' && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>tous les</span>
                          <input className="w-12 px-2 py-1 rounded text-xs text-center outline-none"
                            type="number" min="2" max="24" value={addCustomMonths}
                            onChange={(e) => setAddCustomMonths(e.target.value)}
                            style={{ backgroundColor: 'var(--surface)', border, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>mois</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setAddLabel(''); setAddAmount('') }}>Annuler</Button>
                    <Button variant="primary" size="sm" onClick={handleAdd}>Ajouter</Button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => setShowAddForm(true)}
                >
                  <span>{getAddLabel(category.type)}</span>
                  {suggestion !== null && visibleEntries.length > 0 && category.type !== 'PROJECT' && (
                    <span className="ml-auto text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      moy. {formatAmount(suggestion)}/mois
                    </span>
                  )}
                </button>
              )
            )}

            {!isEditMode && visibleEntries.length === 0 && (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
                Aucune ligne — cliquez sur ✎ Modifier pour en ajouter
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal scope suppression récurrence */}
      {scopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setScopeModal(null)}>
          <div className="w-full max-w-sm rounded-xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              Supprimer la récurrence
            </p>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Cette ligne est liée à une récurrence. Voulez-vous supprimer :
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="md" onClick={() => { onDelete(scopeModal, 'once'); setScopeModal(null) }}>
                Ce mois uniquement
              </Button>
              <Button variant="primary" size="md" onClick={() => { onDelete(scopeModal, 'all'); setScopeModal(null) }}>
                Ce mois et tous les suivants
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setScopeModal(null)}>Annuler</Button>
          </div>
        </div>
      )}
    </>
  )
}