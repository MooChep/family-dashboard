'use client'

import { useState, useEffect, type ReactElement, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { type Transaction, type Category } from '@prisma/client'

type TransactionWithCategory = Transaction & { category: Category }

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    categoryId: string
    amount: number
    detail?: string
    pointed: boolean
  }) => Promise<void>
  transaction?: TransactionWithCategory | null
  categories: Category[]
}

export function TransactionForm({
  isOpen,
  onClose,
  onSave,
  transaction,
  categories,
}: TransactionFormProps): ReactElement {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [detail, setDetail] = useState('')
  const [pointed, setPointed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplit le formulaire en mode édition
  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.categoryId)
      setAmount(String(transaction.amount))
      setDetail(transaction.detail ?? '')
      setPointed(transaction.pointed)
    } else {
      setCategoryId('')
      setAmount('')
      setDetail('')
      setPointed(false)
    }
    setError(null)
  }, [transaction, isOpen])

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Montant invalide')
      return
    }

    if (!categoryId) {
      setError('Sélectionne une catégorie')
      return
    }

    setIsLoading(true)
    try {
      await onSave({
        categoryId,
        amount: parsedAmount,
        detail: detail || undefined,
        pointed,
      })
      onClose()
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Modifier la transaction' : 'Ajouter une transaction'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Sélecteur catégorie */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: 'var(--text2)', fontFamily: 'var(--font-body)' }}
          >
            Catégorie
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
            }}
            required
          >
            <option value="">Sélectionner...</option>
            <optgroup label="Revenus">
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Dépenses">
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <Input
          label="Montant (€)"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          required
        />

        <Input
          label="Détail (optionnel)"
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ex: Salaire janvier"
        />

        {/* Checkbox pointé */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPointed(!pointed)}
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: pointed ? 'var(--accent)' : 'var(--surface2)',
              border: `1px solid ${pointed ? 'var(--accent)' : 'var(--border)'}`,
              color: pointed ? 'var(--bg)' : 'transparent',
            }}
          >
            {pointed && '✓'}
          </button>
          <span className="text-sm" style={{ color: 'var(--text2)' }}>
            Transaction pointée
          </span>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            {transaction ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}