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
    tags: string[]
    pointed: boolean
  }) => Promise<void>
  transaction?: TransactionWithCategory | null
  categories: Category[]
  existingTags?: string[]
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
  const [catInput, setCatInput]     = useState('')
  const [showCatSugg, setShowCatSugg] = useState(false)
  const [catHighlight, setCatHighlight] = useState(0)

  const [amount, setAmount]   = useState('')
  const [tags, setTags]       = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSugg, setShowTagSugg] = useState(false)
  const [pointed, setPointed] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const catInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.categoryId)
      setCatInput(transaction.category.name)
      setAmount(String(transaction.amount))
      setTags(
        typeof transaction.tags === 'string'
          ? (JSON.parse(transaction.tags) as string[])
          : [],
      )
      setPointed(transaction.pointed)
    } else {
      setCategoryId(''); setCatInput(''); setAmount(''); setTags([]); setPointed(true)
    }
    setTagInput(''); setError(null); setShowCatSugg(false); setShowTagSugg(false)
  }, [transaction, isOpen])

  // ── Catégories ───────────────────────────────────────────────────────────────
  const catSuggestions = catInput.trim().length > 0
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(catInput.toLowerCase()),
      )
    : categories

  function selectCategory(cat: Category): void {
    setCategoryId(cat.id)
    setCatInput(cat.name)
    setShowCatSugg(false)
    setCatHighlight(0)
  }

  function handleCatKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (!showCatSugg) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setShowCatSugg(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCatHighlight((h) => Math.min(h + 1, catSuggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCatHighlight((h) => Math.max(h - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (catSuggestions[catHighlight]) selectCategory(catSuggestions[catHighlight]) }
    if (e.key === 'Escape') { setShowCatSugg(false) }
    if (e.key === 'Tab') {
      if (catSuggestions[catHighlight]) { e.preventDefault(); selectCategory(catSuggestions[catHighlight]) }
    }
  }

  // ── Tags ──────────────────────────────────────────────────────────────────────
  const tagSuggestions = tagInput.trim().length > 0
    ? existingTags.filter(
        (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t),
      )
    : []

  function addTag(value: string): void {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed])
    setTagInput(''); setShowTagSugg(false)
  }

  function removeTag(tag: string): void {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagSuggestions.length > 0 && showTagSugg ? tagSuggestions[0] : tagInput)
    }
    if (e.key === 'Escape') setShowTagSugg(false)
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) setTags((prev) => prev.slice(0, -1))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function doSave(): Promise<boolean> {
    setError(null)
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Montant invalide'); return false }
    if (!categoryId) { setError('Sélectionne une catégorie'); return false }
    const finalTags = tagInput.trim() ? [...tags, tagInput.trim()] : tags
    setIsLoading(true)
    try {
      await onSave({ categoryId, amount: parsedAmount, tags: finalTags, pointed })
      return true
    } catch { setError('Erreur lors de la sauvegarde'); return false }
    finally { setIsLoading(false) }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const ok = await doSave()
    if (ok) onClose()
  }

  async function handleSubmitAndNew(e: React.MouseEvent): Promise<void> {
    e.preventDefault()
    const ok = await doSave()
    if (ok) {
      setAmount(''); setTags([]); setTagInput(''); setPointed(true); setError(null)
      setTimeout(() => catInputRef.current?.focus(), 0)
    
    }
  }

  const groupedSuggestions = [
    { label: 'Revenus',           items: catSuggestions.filter((c) => c.type === 'INCOME') },
    { label: 'Charges fixes',     items: catSuggestions.filter((c) => c.type === 'EXPENSE' && c.isFixed) },
    { label: 'Dépenses variables',items: catSuggestions.filter((c) => c.type === 'EXPENSE' && !c.isFixed) },
  ].filter((g) => g.items.length > 0)

  // Index global pour le highlight
  const flatSuggestions = catSuggestions

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Modifier la transaction' : 'Ajouter une transaction'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Catégorie — input texte avec dropdown clavier */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Catégorie</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={catInputRef}
              type="text"
              value={catInput}
              onChange={(e) => {
                setCatInput(e.target.value)
                setCategoryId('')        // reset si on retape
                setShowCatSugg(true)
                setCatHighlight(0)
              }}
              onFocus={() => { setShowCatSugg(true); setCatHighlight(0) }}
              onBlur={() => setTimeout(() => setShowCatSugg(false), 150)}
              onKeyDown={handleCatKeyDown}
              placeholder="Tapez ou ↓ pour parcourir..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--surface2)',
                border: `1px solid ${showCatSugg && catSuggestions.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              autoFocus
              autoComplete="off"
            />

            {/* Indicateur catégorie sélectionnée */}
            {categoryId && !showCatSugg && (
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
              >
                ✓
              </div>
            )}

            {showCatSugg && catSuggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                style={{
                  top: 'calc(100% + 4px)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {groupedSuggestions.map((group) => (
                  <div key={group.label}>
                    <div
                      className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--muted)', backgroundColor: 'var(--surface2)', fontFamily: 'var(--font-mono)' }}
                    >
                      {group.label}
                    </div>
                    {group.items.map((cat) => {
                      const globalIdx = flatSuggestions.indexOf(cat)
                      const isHighlighted = globalIdx === catHighlight
                      const matchIdx = cat.name.toLowerCase().indexOf(catInput.toLowerCase())
                      const before = catInput.trim() && matchIdx >= 0 ? cat.name.slice(0, matchIdx) : cat.name
                      const match  = catInput.trim() && matchIdx >= 0 ? cat.name.slice(matchIdx, matchIdx + catInput.length) : ''
                      const after  = catInput.trim() && matchIdx >= 0 ? cat.name.slice(matchIdx + catInput.length) : ''

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onMouseDown={() => selectCategory(cat)}
                          onMouseEnter={() => setCatHighlight(globalIdx)}
                          className="w-full text-left px-3 py-2 text-sm transition-colors"
                          style={{
                            backgroundColor: isHighlighted ? 'var(--accent-dim)' : 'transparent',
                            color: isHighlighted ? 'var(--accent)' : 'var(--text)',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          {catInput.trim() && matchIdx >= 0 ? (
                            <>{before}<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{match}</span>{after}</>
                          ) : cat.name}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            ↑↓ pour naviguer · Entrée pour sélectionner · Tab pour valider
          </p>
        </div>

        {/* Montant */}
        <Input
          label="Montant (€)"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          required
        />

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
            Tags <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <div
              className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-10"
              style={{
                backgroundColor: 'var(--surface2)',
                border: `1px solid ${showTagSugg && tagSuggestions.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'border-color 0.15s',
              }}
            >
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{ color: 'var(--accent)', lineHeight: 1 }}>×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagSugg(true) }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => setShowTagSugg(true)}
                onBlur={() => { setTimeout(() => { setShowTagSugg(false); if (tagInput.trim()) addTag(tagInput) }, 150) }}
                placeholder={tags.length === 0 ? 'McDo, Lidl... (Entrée pour valider)' : ''}
                className="flex-1 outline-none text-sm bg-transparent min-w-20"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
              />
            </div>

            {showTagSugg && tagSuggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                style={{
                  top: 'calc(100% + 4px)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                {tagSuggestions.slice(0, 6).map((s) => {
                  const idx    = s.toLowerCase().indexOf(tagInput.toLowerCase())
                  const before = s.slice(0, idx)
                  const match  = s.slice(idx, idx + tagInput.length)
                  const after  = s.slice(idx + tagInput.length)
                  return (
                    <button key={s} type="button" onMouseDown={() => addTag(s)} className="w-full text-left px-3 py-2 text-sm" style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface2)' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                      {before}<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{match}</span>{after}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Entrée ou virgule pour valider · Retour arrière pour supprimer le dernier</p>
        </div>

        {/* Pointé */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPointed(!pointed)} className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: pointed ? 'var(--accent)' : 'var(--surface2)', border: `1px solid ${pointed ? 'var(--accent)' : 'var(--border)'}`, color: pointed ? 'var(--bg)' : 'transparent' }}>
            {pointed && '✓'}
          </button>
          <span className="text-sm" style={{ color: 'var(--text2)' }}>Transaction pointée</span>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          {!transaction && (
            <Button type="button" variant="secondary" size="md" isLoading={isLoading} onClick={handleSubmitAndNew}>
              Ajouter + nouveau
            </Button>
          )}
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            {transaction ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}