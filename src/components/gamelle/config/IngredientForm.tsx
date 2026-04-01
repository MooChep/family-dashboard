'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { BaseUnit } from '@prisma/client'
import type { IngredientWithAisle } from '@/app/api/gamelle/ingredients/route'

type Aisle = { id: string; name: string; order: number }

type QuickBuyEntry = { label: string; value: number; unit: string }

interface IngredientFormProps {
  aisles:     Aisle[]
  initial?:   IngredientWithAisle
  onSave:     (data: IngredientFormData) => Promise<void>
  onClose:    () => void
}

export type IngredientFormData = {
  name:               string
  baseUnit:           BaseUnit
  aisleId:            string
  defaultQuantity:    number | null
  quickBuyQuantities: QuickBuyEntry[] | null
}

const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'GRAM',       label: 'Grammes (g)'  },
  { value: 'MILLILITER', label: 'Millilitres (ml)' },
  { value: 'UNIT',       label: 'Unités' },
]

/**
 * Formulaire création / édition d'un ingrédient référence.
 * Inclut la saisie structurée des quickBuyQuantities.
 */
export function IngredientForm({ aisles, initial, onSave, onClose }: IngredientFormProps) {
  const [name,         setName]         = useState(initial?.name ?? '')
  const [baseUnit,     setBaseUnit]     = useState<BaseUnit>(initial?.baseUnit ?? 'GRAM')
  const [aisleId,      setAisleId]      = useState(initial?.aisleId ?? (aisles[0]?.id ?? ''))
  const [defQty,       setDefQty]       = useState(String(initial?.defaultQuantity ?? ''))
  const [quickBuy,     setQuickBuy]     = useState<QuickBuyEntry[]>(
    Array.isArray(initial?.quickBuyQuantities) ? (initial.quickBuyQuantities as QuickBuyEntry[]) : [],
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // Bouton rapide — édition inline
  function updateQbEntry(index: number, field: keyof QuickBuyEntry, value: string | number) {
    setQuickBuy(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }
  function addQbEntry() {
    const unit = baseUnit === 'GRAM' ? 'g' : baseUnit === 'MILLILITER' ? 'ml' : ''
    setQuickBuy(prev => [...prev, { label: '', value: 0, unit }])
  }
  function removeQbEntry(index: number) {
    setQuickBuy(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!name.trim() || !aisleId) { setError('Nom et rayon requis'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        name:               name.trim(),
        baseUnit,
        aisleId,
        defaultQuantity:    defQty ? parseFloat(defQty.replace(',', '.')) : null,
        quickBuyQuantities: quickBuy.length > 0 ? quickBuy : null,
      })
    } catch (e: unknown) {
      setError((e as Error).message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const unitLabel = baseUnit === 'GRAM' ? 'g' : baseUnit === 'MILLILITER' ? 'ml' : ''

  return (
    <div
      className="flex flex-col gap-4 px-4 py-4 rounded-2xl mx-4 my-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
          {initial ? 'Modifier' : 'Nouvel ingrédient'}
        </p>
        <button onClick={onClose}><X size={16} style={{ color: 'var(--muted)' }} /></button>
      </div>

      {/* Nom */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Nom</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          className="px-3 py-2 rounded-xl font-body text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      {/* Unité de base */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Unité de base</label>
        <select
          value={baseUnit}
          onChange={e => setBaseUnit(e.target.value as BaseUnit)}
          className="px-3 py-2 rounded-xl font-body text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </div>

      {/* Rayon */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Rayon</label>
        <select
          value={aisleId}
          onChange={e => setAisleId(e.target.value)}
          className="px-3 py-2 rounded-xl font-body text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Quantité par défaut (optionnel) */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Quantité par défaut{unitLabel ? ` (${unitLabel})` : ''} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— optionnel</span>
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={defQty}
          onChange={e => setDefQty(e.target.value)}
          className="px-3 py-2 rounded-xl font-mono text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      {/* Boutons rapides (quickBuyQuantities) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Boutons rapides (courses)
          </label>
          <button
            onClick={addQbEntry}
            className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            <Plus size={10} /> Ajouter
          </button>
        </div>

        {quickBuy.length === 0 && (
          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            Aucun bouton — valeurs génériques utilisées ({baseUnit === 'GRAM' ? '+100g +250g +500g' : baseUnit === 'MILLILITER' ? '+250ml +500ml +1L' : '+1 +2 +4'})
          </p>
        )}

        {quickBuy.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              placeholder="label"
              value={entry.label}
              onChange={e => updateQbEntry(i, 'label', e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg font-mono text-xs outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <input
              type="number"
              placeholder="valeur"
              value={entry.value || ''}
              onChange={e => updateQbEntry(i, 'value', parseFloat(e.target.value) || 0)}
              className="w-20 px-2 py-1.5 rounded-lg font-mono text-xs outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <input
              placeholder="unité"
              value={entry.unit}
              onChange={e => updateQbEntry(i, 'unit', e.target.value)}
              className="w-14 px-2 py-1.5 rounded-lg font-mono text-xs outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button onClick={() => removeQbEntry(i)}>
              <Trash2 size={13} style={{ color: 'var(--muted)' }} />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onClose} className="px-3 py-1.5 font-mono text-xs rounded-xl" style={{ color: 'var(--muted)' }}>
          Annuler
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={saving}
          className="px-4 py-1.5 font-mono text-xs font-medium rounded-xl disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {saving ? '…' : initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  )
}
