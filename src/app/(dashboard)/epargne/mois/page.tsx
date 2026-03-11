'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { MonthSummary } from '@/components/epargne/MonthSummary'
import { TransactionTable } from '@/components/epargne/TransactionTable'
import { TransactionForm } from '@/components/epargne/TransactionForm'
import { FixedChargesTable } from '@/components/epargne/FixedChargesTable'
import { VariableChargesTable, type VariableChargeRow } from '@/components/epargne/VariableChargesTable'
import { AllocationForm } from '@/components/epargne/AllocationForm'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatMonthLabel } from '@/lib/formatters'
import { type Transaction, type Category, type SavingsProject } from '@prisma/client'

type TransactionWithCategory = Transaction & { category: Category }

interface FixedChargeRow {
  categoryId: string
  categoryName: string
  chargeId: string | null
  estimated: number
  reel: number
  // Champ ajouté : total des BudgetEntry du mois pour cette catégorie
  budgeted: number | null
}

interface AllocationRow {
  projectId: string
  percentage: number
  amount: number
}

// Réponse de l'API budget/{month} — on n'utilise que les entries ici
interface BudgetMonthResponse {
  entries: { categoryId: string; amount: number }[]
}

function getCurrentMonth(): string {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

function extractUniqueTags(txs: TransactionWithCategory[]): string[] {
  const set = new Set<string>()
  for (const tx of txs) {
    let parsed: string[] = []
    try { parsed = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : [] }
    catch { parsed = [] }
    for (const tag of parsed) { if (tag) set.add(tag) }
  }
  return Array.from(set).sort()
}

type ProjectWithCategory = SavingsProject & { category: { id: string } | null }

export default function MoisPage(): ReactElement {
  const [currentMonth, setCurrentMonth]           = useState(getCurrentMonth())
  const [transactions, setTransactions]           = useState<TransactionWithCategory[]>([])
  const [charges, setCharges]                     = useState<FixedChargeRow[]>([])
  const [variableCharges, setVariableCharges]     = useState<VariableChargeRow[]>([])
  const [categories, setCategories]               = useState<Category[]>([])
  const [projects, setProjects]                   = useState<ProjectWithCategory[]>([])
  const [allocations, setAllocations]             = useState<AllocationRow[]>([])
  const [reste, setReste]                         = useState(0)
  const [totalFortune, setTotalFortune]           = useState(0)
  const [search, setSearch]                       = useState('')
  const [isLoading, setIsLoading]                 = useState(true)
  const [summary, setSummary]                     = useState({ revenus: 0, depenses: 0, reste: 0, allocationPercent: 0 })
  const [isFormOpen, setIsFormOpen]               = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null)
  const [existingTags, setExistingTags]           = useState<string[]>([])

  const loadAll = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const [txRes, chargesRes, varRes, catsRes, projetsRes, allocRes, allTxRes, budgetRes] =
        await Promise.all([
          fetch('/api/epargne/transactions?month=' + currentMonth),
          fetch('/api/epargne/charges-fixes?month=' + currentMonth),
          fetch('/api/epargne/charges-variables?month=' + currentMonth),
          fetch('/api/epargne/categories'),
          fetch('/api/epargne/projets'),
          fetch('/api/epargne/allocations?month=' + currentMonth),
          fetch('/api/epargne/transactions'),
          // Fetch du budget du mois — on ignore l'erreur si pas encore créé (404 = pas de budget)
          fetch('/api/epargne/budget/' + currentMonth).then((r) => r.ok ? r.json() : null),
        ])

      const [txData, chargesData, varData, catsData, projetsData, allocData, allTxData] =
        await Promise.all([
          txRes.json() as Promise<TransactionWithCategory[]>,
          chargesRes.json() as Promise<FixedChargeRow[]>,
          varRes.json() as Promise<VariableChargeRow[]>,
          catsRes.json() as Promise<Category[]>,
          projetsRes.json() as Promise<ProjectWithCategory[]>,
          allocRes.json() as Promise<{ allocations: AllocationRow[]; reste: number }>,
          allTxRes.json() as Promise<TransactionWithCategory[]>,
        ])

      const budgetData = budgetRes as BudgetMonthResponse | null

      // ── Construit un map categoryId → total budgété ────────────────────────
      // Somme toutes les BudgetEntry du mois par catégorie
      const budgetMap: Record<string, number> = {}
      if (budgetData?.entries) {
        for (const entry of budgetData.entries) {
          budgetMap[entry.categoryId] = (budgetMap[entry.categoryId] ?? 0) + entry.amount
        }
      }

      // ── Injecte le budgeted dans les charges fixes ─────────────────────────
      const chargesWithBudget: FixedChargeRow[] = chargesData.map((c) => ({
        ...c,
        budgeted: budgetMap[c.categoryId] ?? null,
      }))

      // ── Injecte le budgeted dans les charges variables ─────────────────────
      const varWithBudget: VariableChargeRow[] = varData.map((c) => ({
        ...c,
        budgeted: budgetMap[c.categoryId] ?? null,
      }))

      setTransactions(txData)
      setCharges(chargesWithBudget)
      setVariableCharges(Array.isArray(varWithBudget) ? varWithBudget : [])
      setCategories(catsData)
      setProjects(projetsData)
      setTotalFortune(projetsData.filter((p) => p.isActive).reduce((s, p) => s + p.currentAmount, 0))
      setReste(allocData.reste)
      setExistingTags(extractUniqueTags(Array.isArray(allTxData) ? allTxData : []))
      setAllocations(allocData.allocations)

      const revenus           = txData.filter((t) => t.category.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
      const depenses          = txData.filter((t) => t.category.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0)
      const allocationPercent = allocData.allocations.reduce((s, a) => s + a.percentage, 0)
      setSummary({ revenus, depenses, reste: allocData.reste, allocationPercent })
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { void loadAll() }, [loadAll])

  async function handleSaveTransaction(f: {
    categoryId: string
    amount: number
    tags: string[]
    pointed: boolean
  }): Promise<void> {
    const cat = categories.find((c) => c.id === f.categoryId)
    const isProjectCat = cat?.type === 'PROJECT'

    if (isProjectCat && !editingTransaction) {
      const projet = projects.find((p) => p.categoryId === f.categoryId)
      if (!projet) throw new Error('Projet introuvable pour cette catégorie')
      const res = await fetch(`/api/epargne/projets/${projet.id}/depense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: f.amount, month: currentMonth, tags: f.tags, pointed: f.pointed }),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde opération projet')
    } else {
      const url = editingTransaction
        ? '/api/epargne/transactions/' + editingTransaction.id
        : '/api/epargne/transactions'
      const res = await fetch(url, {
        method: editingTransaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, month: currentMonth }),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')
    }
    await loadAll()
  }

  async function handleDeleteTransaction(id: string): Promise<void> {
    const res = await fetch('/api/epargne/transactions/' + id, { method: 'DELETE' })
    if (!res.ok) throw new Error('Erreur suppression')
    await loadAll()
  }

  async function handleTogglePointage(id: string): Promise<void> {
    await fetch('/api/epargne/transactions/' + id + '/pointage', { method: 'PATCH' })
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, pointed: !t.pointed } : t))
  }

  async function handleUpdateFixed(categoryId: string, estimated: number): Promise<void> {
    await fetch('/api/epargne/charges-fixes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, categoryId, estimated }),
    })
    await loadAll()
  }

  async function handleUpdateVariable(categoryId: string, estimated: number): Promise<void> {
    await fetch('/api/epargne/charges-variables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, categoryId, estimated }),
    })
    await loadAll()
  }

  async function handleSaveAllocations(allocs: { projectId: string; percentage: number }[]): Promise<void> {
    const res = await fetch('/api/epargne/allocations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, allocations: allocs }),
    })
    if (!res.ok) throw new Error('Erreur allocations')
    await loadAll()
  }

  const monthSelector = (
    <div className="flex items-center gap-0">
      <button
        onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
        aria-label="Mois précédent"
      >←</button>
      <h2
        className="text-base font-semibold min-w-36 text-center"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
      >
        {formatMonthLabel(currentMonth)}
      </h2>
      <button
        onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
        aria-label="Mois suivant"
      >→</button>
      <button
        onClick={() => setCurrentMonth(getCurrentMonth())}
        className="text-xs px-3 py-1 rounded-lg ml-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
      >
        Aujourd'hui
      </button>
    </div>
  )

  return (
<EpargneLayout
  stickySubHeader={monthSelector}
  fabCategories={categories}
  fabMonth={currentMonth}
  onFabSaved={() => void loadAll()}
>      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <>
            <MonthSummary
              revenus={summary.revenus}
              depenses={summary.depenses}
              reste={summary.reste}
              allocationPercent={summary.allocationPercent}
            />

            {/* Transactions */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <input
                  type="text"
                  placeholder="Rechercher une transaction (catégorie, tag, montant…)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                />
              </div>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Transactions</h2>
                <Button variant="primary" size="sm" onClick={() => { setEditingTransaction(null); setIsFormOpen(true) }}>
                  + Ajouter
                </Button>
              </div>
              <TransactionTable
                transactions={transactions.filter((t) => {
                  if (!search.trim()) return true
                  const q = search.toLowerCase()
                  const tags = (() => { try { return JSON.parse(t.tags as string) as string[] } catch { return [] } })()
                  return (
                    t.category.name.toLowerCase().includes(q) ||
                    String(t.amount).includes(q) ||
                    tags.some((tag) => tag.toLowerCase().includes(q))
                  )
                })}
                onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true) }}
                onDelete={handleDeleteTransaction}
                onTogglePointage={handleTogglePointage}
              />
            </div>

            {/* Charges fixes — reçoit maintenant le champ budgeted */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Charges fixes</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Cliquer sur un montant pour le modifier</p>
              </div>
              <FixedChargesTable charges={charges} onUpdateEstimated={handleUpdateFixed} />
            </div>

            {/* Dépenses variables — reçoit maintenant le champ budgeted */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Dépenses variables</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Catégories avec transactions ce mois. Cliquer sur un estimé pour le modifier.</p>
              </div>
              <VariableChargesTable charges={variableCharges} onUpdateEstimated={handleUpdateVariable} />
            </div>

            {/* Affectation épargne */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Affectation épargne</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Reste disponible après dépenses</p>
              </div>
              <AllocationForm
                projects={projects}
                reste={reste}
                totalFortune={totalFortune}
                initialAllocations={allocations}
                onSave={handleSaveAllocations}
              />
            </div>
          </>
        )}
      </div>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTransaction(null) }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        categories={categories}
        existingTags={existingTags}
        />
    </EpargneLayout>
  )
}