'use client'

import { useState, type ReactElement } from 'react'
import { TransactionForm } from '@/components/epargne/TransactionForm'
import { type Category } from '@prisma/client'

interface FABProps {
  categories: Category[]
  currentMonth: string
  onSaved: () => void
}

/**
 * Floating Action Button — bouton "+" fixe en bas à droite sur mobile.
 * Ouvre le TransactionForm existant en modal centré.
 * À placer dans EpargneLayout (ou le layout racine du dashboard).
 */
export function FAB({ categories, currentMonth, onSaved }: FABProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  async function handleSave(f: {
    categoryId: string
    amount: number
    tags: string[]
    pointed: boolean
  }): Promise<void> {
    const res = await fetch('/api/epargne/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, month: currentMonth }),
    })
    if (!res.ok) throw new Error('Erreur sauvegarde')
    setIsOpen(false)
    onSaved()
  }

  return (
    <>
      {/* Bouton flottant — visible uniquement sur mobile (md:hidden) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-40 md:hidden flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          bottom: '80px', // au-dessus de la BottomNav (h ~64px + marge)
          right: '20px',
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          fontSize: 24,
          fontWeight: 300,
          boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 40%, transparent)',
          border: 'none',
        }}
        aria-label="Ajouter une transaction"
      >
        +
      </button>

      {/* Réutilise le TransactionForm existant */}
      <TransactionForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
        transaction={null}
        categories={categories}
        existingTags={[]}
      />
    </>
  )
}