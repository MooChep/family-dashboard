'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import type { ApiResponse } from '@/lib/gamelle/types'
import type { IngredientWithAisle } from '@/app/api/gamelle/ingredients/route'
import type { BaseUnit, Aisle } from '@prisma/client'

export interface IngredientPickerProps {
  onSelect:     (ingredient: IngredientWithAisle) => void
  placeholder?: string
  autoFocus?:   boolean
}

const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'GRAM',       label: 'Grammes (g)' },
  { value: 'MILLILITER', label: 'Millilitres (ml)' },
  { value: 'UNIT',       label: 'Unités' },
]

/**
 * Autocomplete avec création inline.
 * Cherche dans le dictionnaire d'ingrédients et propose "+ Créer X" si inconnu.
 */
export function IngredientPicker({
  onSelect,
  placeholder = 'Rechercher ou ajouter un ingrédient…',
  autoFocus,
}: IngredientPickerProps) {
  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState<IngredientWithAisle[]>([])
  const [open,         setOpen]         = useState(false)
  const [creating,     setCreating]     = useState(false)
  const [aisles,       setAisles]       = useState<Aisle[]>([])
  const [aislesLoaded, setAislesLoaded] = useState(false)
  // Formulaire création
  const [newName,      setNewName]      = useState('')
  const [newUnit,      setNewUnit]      = useState<BaseUnit>('GRAM')
  const [newAisleId,   setNewAisleId]   = useState('')
  const [saving,       setSaving]       = useState(false)
  const [createError,  setCreateError]  = useState('')

  const containerRef = useRef<HTMLDivElement>(null)

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  async function search(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setOpen(true)
    try {
      const res  = await fetch(`/api/gamelle/ingredients?search=${encodeURIComponent(q)}`)
      const json = await res.json() as ApiResponse<IngredientWithAisle[]>
      if (json.success) setResults(json.data ?? [])
    } catch { /* ignore */ }
  }

  async function loadAisles() {
    if (aislesLoaded) return
    try {
      const res  = await fetch('/api/gamelle/aisles')
      const data = await res.json() as Aisle[]
      setAisles(Array.isArray(data) ? data : [])
    } finally {
      setAislesLoaded(true)
    }
  }

  function openCreateForm() {
    void loadAisles()
    setNewName(query.trim())
    setNewUnit('GRAM')
    setNewAisleId('')
    setCreateError('')
    setCreating(true)
    setOpen(false)
  }

  function cancelCreate() {
    setCreating(false)
    setCreateError('')
  }

  async function handleCreate() {
    if (!newName.trim() || !newAisleId) return
    setSaving(true)
    setCreateError('')
    try {
      const res  = await fetch('/api/gamelle/ingredients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName.trim(), baseUnit: newUnit, aisleId: newAisleId }),
      })
      const json = await res.json() as ApiResponse<IngredientWithAisle>
      if (json.success && json.data) {
        onSelect(json.data)
        setQuery('')
        setResults([])
        setCreating(false)
      } else {
        setCreateError(json.error ?? 'Erreur lors de la création.')
      }
    } catch {
      setCreateError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  function handleSelect(ing: IngredientWithAisle) {
    onSelect(ing)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg font-body text-sm outline-none'
  const inputSty: React.CSSProperties = {
    background: 'var(--surface2)',
    border:     '1px solid var(--border)',
    color:      'var(--text)',
  }

  // ── Mode création ──────────────────────────────────────────────────────────
  if (creating) {
    return (
      <div
        className="flex flex-col gap-2 rounded-xl p-3"
        style={{ background: 'var(--surface2)', border: '1px solid var(--accent)' }}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Créer un ingrédient
        </p>
        <input
          className={inputCls}
          style={inputSty}
          placeholder="Nom canonique"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          autoFocus
        />
        <select
          className={`${inputCls} font-mono text-xs`}
          style={inputSty}
          value={newUnit}
          onChange={e => setNewUnit(e.target.value as BaseUnit)}
        >
          {BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <select
          className={`${inputCls} font-mono text-xs`}
          style={inputSty}
          value={newAisleId}
          onChange={e => setNewAisleId(e.target.value)}
        >
          <option value="">— Rayon —</option>
          {aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {createError && (
          <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{createError}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={cancelCreate}
            className="py-2 px-3 rounded-lg font-mono text-xs"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || !newAisleId || saving}
            className="flex-1 py-2 rounded-lg font-mono text-xs disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    )
  }

  // ── Mode recherche ─────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }}
        />
        <input
          className="w-full pl-8 pr-3 py-2 rounded-xl font-body text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder={placeholder}
          value={query}
          onChange={e => void search(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          autoFocus={autoFocus}
        />
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
          style={{
            border:     '1px solid var(--border)',
            background: 'var(--surface2)',
            maxHeight:  '16rem',
            overflowY:  'auto',
          }}
        >
          {results.slice(0, 8).map(ref => (
            <button
              key={ref.id}
              onClick={() => handleSelect(ref)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <span className="font-body text-sm" style={{ color: 'var(--text)' }}>{ref.name}</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{ref.aisle.name}</span>
            </button>
          ))}
          {query.trim() && (
            <button
              onClick={openCreateForm}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              <Plus size={14} />
              <span className="font-mono text-sm">Créer &ldquo;{query.trim()}&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
