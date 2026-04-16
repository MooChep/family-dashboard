'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { BudgetCategorySection } from './BudgetCategorySection'
import { BudgetSummary } from './BudgetSummary'
import type { Category, BudgetEntry, BudgetLine, Transaction } from '@prisma/client'

// ── Types ──────────────────────────────────────────────────────────────────────

export type EntryWithRelations = BudgetEntry & {
  category: Category
  budgetLine: BudgetLine | null
}

export type TransactionWithCategory = Transaction & {
  category: Category
}

interface BudgetMonthData {
  month: string
  budgetMonth: { id: string; status: 'DRAFT' | 'VALIDATED' } | null
  entries: EntryWithRelations[]
  transactions: TransactionWithCategory[]
  suggestions: { categoryId: string; label: string; average: number }[]
}

interface BudgetMonthViewProps {
  month: string
}

// Représente l'état local d'une entrée en mode édition
export interface LocalEntry {
  id: string           // id BDD existant, ou 'new-xxx' pour les nouvelles
  label: string
  amount: number
  categoryId: string
  budgetLineId: string | null
  recurrence: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM'
  recurrenceMonths?: number
  isNew: boolean       // true = à créer en BDD
  isDeleted: boolean   // true = à supprimer en BDD
  deleteScope: 'once' | 'all'
  editScope: 'once' | 'all'
  // Données BDD originales pour détecter les changements
  originalLabel: string
  originalAmount: number
}

const GROUPS: {
  type: 'INCOME' | 'EXPENSE' | 'PROJECT'
  label: string
  description: string
  color: string
}[] = [
  { type: 'INCOME',  label: 'Revenus prévus',    description: 'Salaires, primes, revenus exceptionnels…',                                                    color: 'var(--success)' },
  { type: 'EXPENSE', label: 'Dépenses prévues',  description: 'Charges fixes, variables, abonnements…',                                                       color: 'var(--danger)'  },
  { type: 'PROJECT', label: "Projets de butin", description: "Chaque ligne définit l'objectif du projet. Le total devient le montant cible à la sauvegarde.", color: 'var(--accent)'  },
]

// ── Composant ─────────────────────────────────────────────────────────────────

export function BudgetMonthView({ month }: BudgetMonthViewProps): ReactElement {
  const [data, setData]             = useState<BudgetMonthData | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [isSaving, setIsSaving]     = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showValidateWarning, setShowValidateWarning] = useState(false)

  // ── Mode édition ──────────────────────────────────────────────────────────
  // isEditMode = true → tous les champs sont des inputs, bouton Sauvegarder visible
  const [isEditMode, setIsEditMode] = useState(false)
  // Copie locale de toutes les entries, modifiable librement en mode édition
  const [localEntries, setLocalEntries] = useState<LocalEntry[]>([])

  // ── Chargement ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setIsEditMode(false)
    try {
      const [budgetRes, catRes] = await Promise.all([
        fetch(`/api/butin/budget/${month}`),
        fetch('/api/butin/categories'),
      ])
      if (!budgetRes.ok) throw new Error('Erreur chargement budget')
      const budgetData = await budgetRes.json() as BudgetMonthData
      setData(budgetData)
      setCategories(await catRes.json() as Category[])
      // Initialise les entries locales depuis la BDD
      setLocalEntries(budgetData.entries.map(entryToLocal))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [month])

  useEffect(() => { void loadData() }, [loadData])

  // ── Convertit une BudgetEntry BDD en LocalEntry ───────────────────────────
  function entryToLocal(e: EntryWithRelations): LocalEntry {
    return {
      id: e.id,
      label: e.label,
      amount: e.amount,
      categoryId: e.categoryId,
      budgetLineId: e.budgetLineId,
      recurrence: (e.budgetLine?.recurrence ?? 'NONE') as LocalEntry['recurrence'],
      recurrenceMonths: e.budgetLine?.recurrenceMonths ?? undefined,
      isNew: false,
      isDeleted: false,
      deleteScope: 'once',
      editScope: 'once',
      originalLabel: e.label,
      originalAmount: e.amount,
    }
  }

  // ── Entrée en mode édition ────────────────────────────────────────────────
  function handleStartEdit(): void {
    // Réinitialise les entries locales depuis les données BDD actuelles
    setLocalEntries((data?.entries ?? []).map(entryToLocal))
    setIsEditMode(true)
  }

  // ── Annulation du mode édition ────────────────────────────────────────────
  function handleCancelEdit(): void {
    setLocalEntries((data?.entries ?? []).map(entryToLocal))
    setIsEditMode(false)
  }

  // ── Callbacks pour BudgetCategorySection ──────────────────────────────────

  function handleUpdateEntry(id: string, field: 'label' | 'amount' | 'editScope' | 'deleteScope', value: string | number): void {
    setLocalEntries((prev) => prev.map((e) =>
      e.id === id ? { ...e, [field]: value } : e
    ))
  }

  function handleDeleteEntry(id: string, scope: 'once' | 'all'): void {
    setLocalEntries((prev) => prev.map((e) =>
      e.id === id ? { ...e, isDeleted: true, deleteScope: scope } : e
    ))
  }

  function handleRestoreEntry(id: string): void {
    setLocalEntries((prev) => prev.map((e) =>
      e.id === id ? { ...e, isDeleted: false } : e
    ))
  }

  function handleAddEntry(entry: Omit<LocalEntry, 'id' | 'isNew' | 'isDeleted' | 'deleteScope' | 'editScope' | 'originalLabel' | 'originalAmount'>): void {
    const newId = `new-${Date.now()}-${Math.random()}`
    setLocalEntries((prev) => [...prev, {
      ...entry,
      id: newId,
      isNew: true,
      isDeleted: false,
      deleteScope: 'once',
      editScope: 'once',
      originalLabel: entry.label,
      originalAmount: entry.amount,
    }])
  }

  // ── Sauvegarde batch ──────────────────────────────────────────────────────
  async function handleSave(): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const ops: Promise<Response>[] = []

      for (const entry of localEntries) {
        if (entry.isNew && !entry.isDeleted) {
          // ── Création ──────────────────────────────────────────────────────
          // Si récurrent → crée d'abord le template BudgetLine
          if (entry.recurrence !== 'NONE') {
            ops.push(fetch('/api/butin/budget/lines', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: entry.label, amount: entry.amount, categoryId: entry.categoryId,
                recurrence: entry.recurrence, recurrenceMonths: entry.recurrenceMonths,
                recurrenceStart: month,
              }),
            }))
          }
          ops.push(fetch('/api/butin/budget/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, label: entry.label, amount: entry.amount, categoryId: entry.categoryId }),
          }))
        } else if (entry.isDeleted && !entry.isNew) {
          // ── Suppression ───────────────────────────────────────────────────
          ops.push(fetch(`/api/butin/budget/entries/${entry.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: entry.deleteScope }),
          }))
        } else if (!entry.isNew && !entry.isDeleted) {
          // ── Modification si label ou amount ont changé ────────────────────
          const labelChanged  = entry.label  !== entry.originalLabel
          const amountChanged = entry.amount !== entry.originalAmount
          if (labelChanged || amountChanged) {
            ops.push(fetch(`/api/butin/budget/entries/${entry.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ label: entry.label, amount: entry.amount, scope: entry.editScope }),
            }))
          }
        }
      }

      if (ops.length === 0) {
        // Rien à sauvegarder → on sort du mode édition
        setIsEditMode(false)
        return
      }

      const results = await Promise.all(ops)
      const failed  = results.filter((r) => !r.ok)
      if (failed.length > 0) throw new Error(`${failed.length} opération(s) ont échoué`)

      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Génération des récurrences ────────────────────────────────────────────────
  async function handleGenerate(): Promise<void> {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/butin/budget/${month}`, { method: 'POST' })
      if (!res.ok) throw new Error('Erreur génération')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur génération')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Validation du mois ────────────────────────────────────────────────────────
  async function handleValidate(): Promise<void> {
    // Sauvegarde d'abord si on est en mode édition
    if (isEditMode) await handleSave()
    setIsValidating(true)
    setShowValidateWarning(false)
    try {
      const res = await fetch(`/api/butin/budget/${month}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Erreur validation')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation')
    } finally {
      setIsValidating(false)
    }
  }

  // ── Calculs affichage ─────────────────────────────────────────────────────────

  // En mode édition on affiche les totaux depuis localEntries (aperçu live)
  // En mode lecture on affiche depuis data.entries (BDD)
  const displayEntries = isEditMode
    ? localEntries.filter((e) => !e.isDeleted)
    : (data?.entries ?? []).map(entryToLocalReadonly)

  function entryToLocalReadonly(e: EntryWithRelations): LocalEntry {
    return { ...entryToLocal(e) }
  }

  const realByCategory: Record<string, number> = {}
  for (const tx of data?.transactions ?? []) {
    realByCategory[tx.categoryId] = (realByCategory[tx.categoryId] ?? 0) + Math.abs(tx.amount)
  }

  const totalRevenus  = displayEntries.filter((e) => categories.find((c) => c.id === e.categoryId)?.type === 'INCOME').reduce((s, e) => s + e.amount, 0)
  const totalDepenses = displayEntries.filter((e) => categories.find((c) => c.id === e.categoryId)?.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0)
  const solde = totalRevenus - totalDepenses

  const isValidated = data?.budgetMonth?.status === 'VALIDATED'
  const hasEntries  = displayEntries.some((e) => categories.find((c) => c.id === e.categoryId)?.type !== 'PROJECT')
  const hasModified = (data?.entries ?? []).some((e) => e.isModified)

  const categoriesByType = (type: string): Category[] =>
    categories.filter((c) => !c.isArchived && c.type === type)

  // ── Skeleton ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--danger)' }}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        <Button variant="ghost" size="sm" onClick={() => void loadData()} className="mt-3">Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Bandeau statut + bouton Modifier ── */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{
          backgroundColor: isEditMode
            ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
            : isValidated ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--surface)',
          border: `1px solid ${isEditMode ? 'var(--accent)' : isValidated ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border)'}`,
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: isEditMode ? 'var(--accent)' : isValidated ? 'var(--success)' : 'var(--muted)', fontSize: 16 }}>
            {isEditMode ? '✎' : isValidated ? '✓' : '○'}
          </span>
          <span className="text-sm font-medium" style={{
            color: isEditMode ? 'var(--accent)' : isValidated ? 'var(--success)' : 'var(--text2)',
            fontFamily: 'var(--font-body)',
          }}>
            {isEditMode ? 'Mode édition — modifiez librement, puis sauvegardez'
              : isValidated ? 'Budget validé — référence du mois'
              : 'Budget en cours de préparation'}
          </span>
          {hasModified && isValidated && !isEditMode && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}
            >
              ⚠ modifié après validation
            </span>
          )}
        </div>

        {/* Actions selon le mode */}
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" isLoading={isSaving} onClick={() => void handleSave()}>
                Sauvegarder
              </Button>
            </>
          ) : (
            <>
              {!isValidated && (
                <Button variant="ghost" size="sm" isLoading={isGenerating} onClick={() => void handleGenerate()}>
                  ↺ Récurrences
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                ✎ Modifier
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Warning mois validé en mode édition ── */}
      {isEditMode && isValidated && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            color: 'var(--warning)',
          }}
        >
          ⚠ Ce budget est validé. Vos modifications seront tracées.
        </div>
      )}

      {/* ── Groupes INCOME / EXPENSE / PROJECT ── */}
      {GROUPS.map((group) => {
        const cats = categoriesByType(group.type)
        if (cats.length === 0) return null

        const groupTotal = cats.reduce((sum, cat) =>
          sum + displayEntries.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0), 0)

        return (
          <div key={group.type} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: group.color, fontFamily: 'var(--font-mono)' }}>
                  {group.label}
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{group.description}</p>
              </div>
              {groupTotal > 0 && (
                <span className="text-sm font-semibold" style={{ color: group.color, fontFamily: 'var(--font-mono)' }}>
                  {groupTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {cats.map((cat) => (
                <BudgetCategorySection
                  key={cat.id}
                  category={cat}
                  // En mode édition → localEntries, sinon → entries BDD
                  entries={isEditMode
                    ? localEntries.filter((e) => e.categoryId === cat.id)
                    : (data?.entries ?? []).filter((e) => e.categoryId === cat.id).map(entryToLocal)
                  }
                  realAmount={realByCategory[cat.id] ?? 0}
                  suggestion={data?.suggestions.find((s) => s.categoryId === cat.id)?.average ?? null}
                  isEditMode={isEditMode}
                  isValidated={isValidated}
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                  onRestore={handleRestoreEntry}
                  onAdd={handleAddEntry}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* ── Synthèse ── */}
      {hasEntries && (
        <BudgetSummary
          totalRevenus={totalRevenus}
          totalDepenses={totalDepenses}
          solde={solde}
        />
      )}

      {/* ── Bouton validation du mois (mode lecture uniquement) ── */}
      {!isEditMode && !isValidated && (hasEntries || (data?.entries.length ?? 0) > 0) && (
        <div className="flex flex-col gap-2">
          {showValidateWarning && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
                color: 'var(--warning)',
              }}
            >
              ⚠ Une fois validé, le budget devient la référence du mois. Vous pourrez encore le modifier mais chaque modification sera tracée.
            </div>
          )}
          <div className="flex justify-end gap-3">
            {!showValidateWarning ? (
              <Button variant="primary" size="md" onClick={() => setShowValidateWarning(true)}>
                Valider le budget →
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="md" onClick={() => setShowValidateWarning(false)}>Annuler</Button>
                <Button variant="primary" size="md" isLoading={isValidating} onClick={() => void handleValidate()}>
                  Confirmer la validation
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}