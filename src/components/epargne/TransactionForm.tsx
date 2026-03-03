'use client'

import {
  useState,
  useEffect,
  useRef,
  type ReactElement,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
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
    tags: string[]
    pointed: boolean
  }) => Promise<void>
  transaction?: TransactionWithCategory | null
  categories: Category[]
  existingTags?: string[] // tous les tags déjà utilisés dans les transactions
}

export function TransactionForm({
  isOpen,
  onClose,
  onSave,
  transaction,
  categories,
  existingTags = [],
}: TransactionFormProps): ReactElement {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount]         = useState('')
  const [detail, setDetail]         = useState('')
  const [tags, setTags]             = useState<string[]>([])
  const [tagInput, setTagInput]     = useState('')
  const [pointed, setPointed]       = useState(false)
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.categoryId)
      setAmount(String(transaction.amount))
      setDetail(transaction.detail ?? '')
      setTags(
        typeof transaction.tags === 'string'
          ? (JSON.parse(transaction.tags) as string[])
          : [],
      )
      setPointed(transaction.pointed)
    } else {
      setCategoryId('')
      setAmount('')
      setDetail('')
      setTags([])
      setPointed(false)
    }
    setTagInput('')
    setError(null)
    setShowSuggestions(false)
  }, [transaction, isOpen])

  // Suggestions filtrées : tags existants qui matchent la saisie et ne sont pas déjà ajoutés
  const suggestions = tagInput.trim().length > 0
    ? existingTags.filter(
        (t) =>
          t.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(t),
      )
    : []

  function addTag(value: string): void {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string): void {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (suggestions.length > 0 && showSuggestions) {
        addTag(suggestions[0])
      } else {
        addTag(tagInput)
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

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

    const finalTags = tagInput.trim() ? [...tags, tagInput.trim()] : tags

    setIsLoading(true)
    try {
      await onSave({ categoryId, amount: parsedAmount, detail: detail || undefined, tags: finalTags, pointed })
      onClose()
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  const incomeCategories  = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Modifier la transaction' : 'Ajouter une transaction'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Catégorie */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
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

        {/* Tags avec autocomplétion */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
            Tags{' '}
            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span>
          </label>

          <div style={{ position: 'relative' }}>
            {/* Zone chips + input */}
            <div
              className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-10"
              style={{
                backgroundColor: 'var(--surface2)',
                border: `1px solid ${showSuggestions && suggestions.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'border-color 0.15s',
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                  style={{
                    backgroundColor: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    style={{ color: 'var(--accent)', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value)
                  setShowSuggestions(true)
                }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Délai pour laisser le click sur une suggestion se déclencher
                  setTimeout(() => {
                    setShowSuggestions(false)
                    if (tagInput.trim()) addTag(tagInput)
                  }, 150)
                }}
                placeholder={tags.length === 0 ? 'McDo, Lidl... (Entrée pour valider)' : ''}
                className="flex-1 outline-none text-sm bg-transparent min-w-20"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Dropdown suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                style={{
                  top: 'calc(100% + 4px)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                {suggestions.slice(0, 6).map((s) => {
                  const idx = s.toLowerCase().indexOf(tagInput.toLowerCase())
                  const before = s.slice(0, idx)
                  const match  = s.slice(idx, idx + tagInput.length)
                  const after  = s.slice(idx + tagInput.length)
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => addTag(s)} // mousedown avant blur
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{
                        color: 'var(--text)',
                        fontFamily: 'var(--font-body)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      {before}
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{match}</span>
                      {after}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Entrée ou virgule pour valider · Retour arrière pour supprimer le dernier
          </p>
        </div>

        {/* Pointé */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPointed(!pointed)}
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
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
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
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