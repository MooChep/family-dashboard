'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { formatQuantity } from '@/lib/gamelle/units'
import type { IngredientWithAisle } from '@/app/api/gamelle/ingredients/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryItem = {
  id:          string
  referenceId: string
  quantity:    number
  reserved:    number
  rab:         number
  updatedAt:   string
  reference:   {
    name:     string
    baseUnit: 'GRAM' | 'MILLILITER' | 'UNIT'
    aisle:    { id: string; name: string; order: number }
  }
}

function unitForBase(base: string): string {
  if (base === 'GRAM')       return 'g'
  if (base === 'MILLILITER') return 'ml'
  return ''
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Vue inventaire — stock physique, réservé, rab.
 * Tap sur une ligne → édition inline de la quantité.
 * Rab négatif affiché en var(--danger).
 */
export function InventoryView() {
  const [items,    setItems]    = useState<InventoryItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [adding,   setAdding]   = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/inventory')
      const data = await res.json() as InventoryItem[]
      setItems(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit(item: InventoryItem) {
    const q = parseFloat(editValue.replace(',', '.'))
    if (isNaN(q) || q < 0) { setEditingId(null); return }

    // Optimiste
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, quantity: q, rab: q - i.reserved }
      : i,
    ))
    setEditingId(null)

    try {
      await fetch(`/api/gamelle/inventory/${item.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quantity: q }),
      })
    } catch {
      await load()  // rollback
    }
  }

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch(`/api/gamelle/inventory/${id}`, { method: 'DELETE' })
    } catch {
      await load()  // rollback
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id)
    setEditValue(String(item.quantity))
  }

  if (loading) {
    return <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
  }

  return (
    <div className="flex flex-col pb-4">

      {/* Header stats */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {items.length} ingrédient{items.length !== 1 ? 's' : ''} en stock
        </span>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {adding && (
        <AddForm
          onAdd={async (referenceId, quantity) => {
            try {
              const res  = await fetch('/api/gamelle/inventory', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ referenceId, quantity }),
              })
              const item = await res.json() as InventoryItem
              setItems(prev => {
                const exists = prev.find(i => i.referenceId === referenceId)
                if (exists) return prev.map(i => i.referenceId === referenceId ? { ...item, reserved: i.reserved, rab: item.quantity - i.reserved } : i)
                return [...prev, { ...item, reserved: 0, rab: item.quantity }]
              })
            } catch { /* ignore */ }
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {/* Liste vide */}
      {items.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-3 py-12 px-8 text-center">
          <span className="text-3xl">📦</span>
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Stock vide
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
            Ajoute les ingrédients dont tu connais la quantité.
          </p>
        </div>
      )}

      {/* En-tête de colonne */}
      {items.length > 0 && (
        <div
          className="grid px-4 py-1.5"
          style={{
            gridTemplateColumns: '1fr 72px 72px 72px 28px',
            gap: 4,
            background:   'var(--surface2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {['Ingrédient', 'Stock', 'Réservé', 'Rab', ''].map(h => (
            <span key={h} className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Lignes */}
      {items.map(item => {
        const unit    = unitForBase(item.reference.baseUnit)
        const isEditing = editingId === item.id
        const rabNeg  = item.rab < 0

        return (
          <div
            key={item.id}
            className="grid items-center px-4 py-2.5"
            style={{
              gridTemplateColumns: '1fr 72px 72px 72px 28px',
              gap:                 4,
              borderBottom:        '1px solid var(--border)',
              background:          isEditing ? 'var(--surface2)' : 'transparent',
              cursor:              isEditing ? 'default' : 'pointer',
            }}
            onClick={() => { if (!isEditing) startEdit(item) }}
          >
            {/* Nom */}
            <span className="font-body text-sm truncate" style={{ color: 'var(--text)' }}>
              {item.reference.name}
            </span>

            {/* Stock — éditable */}
            {isEditing ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  void handleSaveEdit(item)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-12 font-mono text-xs rounded px-1 py-0.5 outline-none"
                  style={{
                    background:  'var(--surface)',
                    border:      '1px solid var(--accent)',
                    color:       'var(--text)',
                  }}
                />
                <button onClick={() => void handleSaveEdit(item)}>
                  <Check size={13} style={{ color: 'var(--success)' }} />
                </button>
                <button onClick={() => setEditingId(null)}>
                  <X size={13} style={{ color: 'var(--muted)' }} />
                </button>
              </div>
            ) : (
              <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                {formatQuantity(item.quantity, unit)}
              </span>
            )}

            {/* Réservé */}
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {item.reserved > 0 ? formatQuantity(item.reserved, unit) : '—'}
            </span>

            {/* Rab */}
            <span
              className="font-mono text-xs font-medium"
              style={{ color: rabNeg ? 'var(--danger)' : 'var(--success)' }}
            >
              {rabNeg ? '−' : '+'}{formatQuantity(Math.abs(item.rab), unit)}
            </span>

            {/* Supprimer */}
            <button
              onClick={e => { e.stopPropagation(); void handleDelete(item.id) }}
              className="flex items-center justify-center"
              style={{ color: 'var(--muted)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Formulaire d'ajout ───────────────────────────────────────────────────────

function AddForm({
  onAdd,
  onClose,
}: {
  onAdd:    (referenceId: string, quantity: number) => Promise<void>
  onClose:  () => void
}) {
  const [search,    setSearch]    = useState('')
  const [results,   setResults]   = useState<IngredientWithAisle[]>([])
  const [selected,  setSelected]  = useState<IngredientWithAisle | null>(null)
  const [quantity,  setQuantity]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(q: string) {
    setSearch(q)
    setSelected(null)
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/gamelle/ingredients?search=${encodeURIComponent(q)}`)
        const data = await res.json() as { data?: IngredientWithAisle[] }
        setResults(data.data ?? [])
      } catch { /* ignore */ }
    }, 300)
  }

  async function handleSubmit() {
    if (!selected || !quantity) return
    const q = parseFloat(quantity.replace(',', '.'))
    if (isNaN(q) || q <= 0) return
    setSaving(true)
    try {
      await onAdd(selected.id, q)
    } finally {
      setSaving(false)
    }
  }

  const unit = selected
    ? (selected.baseUnit === 'GRAM' ? 'g' : selected.baseUnit === 'MILLILITER' ? 'ml' : '')
    : ''

  return (
    <div
      className="flex flex-col gap-3 px-4 py-3 mx-4 my-2 rounded-2xl"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <p className="font-display text-sm font-semibold" style={{ color: 'var(--text)' }}>
        Ajouter au stock
      </p>

      {/* Recherche ingrédient */}
      {!selected ? (
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher un ingrédient…"
            className="w-full px-3 py-2 rounded-xl font-body text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border:     '1px solid var(--border)',
              color:      'var(--text)',
            }}
          />
          {results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 rounded-xl overflow-hidden mt-1 z-10"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}
            >
              {results.slice(0, 8).map(ref => (
                <button
                  key={ref.id}
                  onClick={() => { setSelected(ref); setResults([]) }}
                  className="w-full text-left px-3 py-2.5 font-body text-sm"
                  style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {ref.name}
                  <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {ref.aisle.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--accent)' }}
        >
          <span className="font-body text-sm" style={{ color: 'var(--text)' }}>{selected.name}</span>
          <button onClick={() => setSelected(null)}>
            <X size={14} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      )}

      {/* Quantité */}
      {selected && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
            placeholder={`Quantité${unit ? ` (${unit})` : ''}`}
            className="flex-1 px-3 py-2 rounded-xl font-mono text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border:     '1px solid var(--border)',
              color:      'var(--text)',
            }}
          />
          {unit && (
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{unit}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ color: 'var(--muted)' }}
        >
          Annuler
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={!selected || !quantity || saving}
          className="px-4 py-1.5 rounded-xl font-mono text-xs font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {saving ? '…' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}
