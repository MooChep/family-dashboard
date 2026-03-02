'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { TransactionTable } from '@/components/epargne/TransactionTable'
import { TransactionForm } from '@/components/epargne/TransactionForm'
import { FixedChargesTable } from '@/components/epargne/FixedChargesTable'
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
}

interface AllocationRow {
  projectId: string
  percentage: number
  amount: number
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function MoisPage(): ReactElement {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [charges, setCharges] = useState<FixedChargeRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [projects, setProjects] = useState<SavingsProject[]>([])
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [reste, setReste] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithCategory | null>(null)

  const loadAll = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const prevMonth = shiftMonth(currentMonth, -1)

      const [txRes, chargesRes, catsRes, projetsRes, allocRes, prevAllocRes] =
        await Promise.all([
          fetch(`/api/epargne/transactions?month=${currentMonth}`),
          fetch(`/api/epargne/charges-fixes?month=${currentMonth}`),
          fetch('/api/epargne/categories'),
          fetch('/api/epargne/projets'),
          fetch(`/api/epargne/allocations?month=${currentMonth}`),
          fetch(`/api/epargne/allocations?month=${prevMonth}`),
        ])

      const [txData, chargesData, catsData, projetsData, allocData, prevAllocData] =
        await Promise.all([
          txRes.json() as Promise<TransactionWithCategory[]>,
          chargesRes.json() as Promise<FixedChargeRow[]>,
          catsRes.json() as Promise<Category[]>,
          projetsRes.json() as Promise<SavingsProject[]>,
          allocRes.json() as Promise<{ allocations: AllocationRow[]; reste: number }>,
          prevAllocRes.json() as Promise<{ allocations: AllocationRow[]; reste: number }>,
        ])

      setTransactions(txData)
      setCharges(chargesData)
      setCategories(catsData)
      setProjects(projetsData)
      setReste(allocData.reste)

      if (allocData.allocations.length > 0) {
        setAllocations(allocData.allocations)
      } else {
        setAllocations(prevAllocData.allocations)
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { void loadAll() }, [loadAll])

  async function handleSaveTransaction(formData: {
    categoryId: string
    amount: number
    detail?: string
    pointed: boolean
  }): Promise<void> {
    const url = editingTransaction
      ? `/api/epargne/transactions/${editingTransaction.id}`
      : '/api/epargne/transactions'
    const method = editingTransaction ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, month: currentMonth }),
    })

    if (!res.ok) throw new Error('Erreur sauvegarde transaction')
    await loadAll()
  }

  async function handleDeleteTransaction(id: string): Promise<void> {
    const res = await fetch(`/api/epargne/transactions/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Erreur suppression')
    await loadAll()
  }

  async function handleTogglePointage(id: string): Promise<void> {
    await fetch(`/api/epargne/transactions/${id}/pointage`, {
      method: 'PATCH',
    })
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pointed: !t.pointed } : t)),
    )
  }

  async function handleUpdateEstimated(
    categoryId: string,
    estimated: number,
  ): Promise<void> {
    await fetch('/api/epargne/charges-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, categoryId, estimated }),
    })
    await loadAll()
  }

  async function handleSaveAllocations(
    allocs: { projectId: string; percentage: number }[],
  ): Promise<void> {
    const res = await fetch('/api/epargne/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, allocations: allocs }),
    })
    if (!res.ok) throw new Error('Erreur sauvegarde allocations')
    await loadAll()
  }

  // Sélecteur de mois — passé en stickySubHeader à EpargneLayout
  const monthSelector = (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text2)',
        }}
        aria-label="Mois précédent"
      >
        ←
      </button>
      <h2
        className="text-base font-semibold min-w-36 text-center"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
      >
        {formatMonthLabel(currentMonth)}
      </h2>
      <button
        onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text2)',
        }}
        aria-label="Mois suivant"
      >
        →
      </button>
      <button
        onClick={() => setCurrentMonth(getCurrentMonth())}
        className="text-xs px-3 py-1 rounded-lg ml-2"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Aujourd'hui
      </button>
    </div>
  )

  return (
    <EpargneLayout stickySubHeader={monthSelector}>
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            {/* Transactions */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2
                  className="text-base font-semibold"
                  style={{
                    color: 'var(--text)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Transactions
                </h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingTransaction(null)
                    setIsFormOpen(true)
                  }}
                >
                  + Ajouter
                </Button>
              </div>
              <TransactionTable
                transactions={transactions}
                onEdit={(t) => {
                  setEditingTransaction(t)
                  setIsFormOpen(true)
                }}
                onDelete={handleDeleteTransaction}
                onTogglePointage={handleTogglePointage}
              />
            </div>

            {/* Charges fixes */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2
                  className="text-base font-semibold"
                  style={{
                    color: 'var(--text)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Charges fixes
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  Cliquer sur un montant estimé pour le modifier
                </p>
              </div>
              <FixedChargesTable
                charges={charges}
                onUpdateEstimated={handleUpdateEstimated}
              />
            </div>

            {/* Allocations épargne */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2
                  className="text-base font-semibold"
                  style={{
                    color: 'var(--text)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Affectation épargne
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  Reste disponible après dépenses
                </p>
              </div>
              <AllocationForm
                projects={projects}
                reste={reste}
                initialAllocations={allocations}
                onSave={handleSaveAllocations}
              />
            </div>
          </>
        )}
      </div>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        categories={categories}
      />
    </EpargneLayout>
  )
}