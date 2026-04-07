'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Pencil, Trash2, GitMerge } from 'lucide-react'
import { IngredientForm } from './IngredientForm'
import type { IngredientFormData } from './IngredientForm'
import type { IngredientWithAisle } from '@/app/api/gamelle/ingredients/route'
import { ConfirmDialog } from '@/components/gamelle/shared/ConfirmDialog'

type Aisle = { id: string; name: string; order: number }

type BlockedDelete = {
  id:      string
  recipes: { id: string; title: string }[]
}

type MergeState = {
  sourceId:   string
  sourceName: string
  query:      string
  results:    IngredientWithAisle[]
  targetId:   string | null
  targetName: string | null
}

/**
 * Dictionnaire ingrédients — liste searchable avec CRUD complet.
 * Suppression bloquée si utilisé dans des recettes → propose la fusion.
 */
export function DictionaryView() {
  const [items,    setItems]    = useState<IngredientWithAisle[]>([])
  const [aisles,   setAisles]   = useState<Aisle[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editing,       setEditing]       = useState<IngredientWithAisle | null>(null)
  const [adding,        setAdding]        = useState(false)
  const [blocked,       setBlocked]       = useState<BlockedDelete | null>(null)
  const [pendingDelete, setPendingDelete] = useState<IngredientWithAisle | null>(null)
  const [merge,    setMerge]    = useState<MergeState | null>(null)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const mergeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [iRes, aRes] = await Promise.all([
        fetch('/api/gamelle/ingredients'),
        fetch('/api/gamelle/aisles'),
      ])
      const iData = await iRes.json() as { data?: IngredientWithAisle[] }
      const aData = await aRes.json() as Aisle[]
      setItems(iData.data ?? [])
      setAisles(aData)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: IngredientFormData) {
    if (editing) {
      const res  = await fetch(`/api/gamelle/ingredients/${editing.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const body = await res.json() as { success: boolean; data?: IngredientWithAisle; error?: string }
      if (!body.success) throw new Error(body.error ?? 'Erreur')
      setItems(prev => prev.map(i => i.id === editing.id ? (body.data ?? i) : i))
      setEditing(null)
    } else {
      const res  = await fetch('/api/gamelle/ingredients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const body = await res.json() as { success: boolean; data?: IngredientWithAisle; error?: string }
      if (!body.success) throw new Error(body.error ?? 'Erreur')
      if (body.data) setItems(prev => [...prev, body.data!])
      setAdding(false)
    }
  }

  async function handleDelete(item: IngredientWithAisle) {
    const res  = await fetch(`/api/gamelle/ingredients/${item.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const body = await res.json() as { blocked: boolean; recipes: { id: string; title: string }[] }
      if (body.blocked) { setBlocked({ id: item.id, recipes: body.recipes }); return }
    }
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  function openMerge(item: IngredientWithAisle) {
    setBlocked(null)
    setMerge({ sourceId: item.id, sourceName: item.name, query: '', results: [], targetId: null, targetName: null })
    setConfirmMerge(false)
  }

  function handleMergeSearch(q: string) {
    if (!merge) return
    setMerge(m => m ? { ...m, query: q, targetId: null, targetName: null } : null)
    if (mergeDebounce.current) clearTimeout(mergeDebounce.current)
    if (!q.trim()) { setMerge(m => m ? { ...m, results: [] } : null); return }
    mergeDebounce.current = setTimeout(async () => {
      const res  = await fetch(`/api/gamelle/ingredients?search=${encodeURIComponent(q)}`)
      const body = await res.json() as { data?: IngredientWithAisle[] }
      setMerge(m => m ? { ...m, results: (body.data ?? []).filter(r => r.id !== m.sourceId) } : null)
    }, 300)
  }

  async function handleMergeConfirm() {
    if (!merge?.targetId) return
    await fetch(`/api/gamelle/ingredients/${merge.sourceId}/merge`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetId: merge.targetId }),
    })
    setMerge(null)
    setConfirmMerge(false)
    await loadAll()
  }

  const filtered = items.filter(i =>
    !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>

  return (
    <div className="flex flex-col gap-0">

      {/* Barre outils */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <Search size={13} style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 font-body text-sm bg-transparent outline-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {adding && (
        <IngredientForm
          aisles={aisles}
          onSave={handleSave}
          onClose={() => setAdding(false)}
        />
      )}

      {/* Formulaire édition */}
      {editing && (
        <IngredientForm
          aisles={aisles}
          initial={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Message suppression bloquée */}
      {blocked && (
        <BlockedPanel
          blocked={blocked}
          items={items}
          onMerge={() => openMerge(items.find(i => i.id === blocked.id)!)}
          onClose={() => setBlocked(null)}
        />
      )}

      {/* Panneau fusion */}
      {merge && !confirmMerge && (
        <MergePanel
          merge={merge}
          onSearch={handleMergeSearch}
          onSelect={(id, name) => setMerge(m => m ? { ...m, targetId: id, targetName: name } : null)}
          onNext={() => setConfirmMerge(true)}
          onClose={() => setMerge(null)}
        />
      )}

      {/* Confirmation fusion */}
      {merge && confirmMerge && (
        <ConfirmMergePanel
          merge={merge}
          onConfirm={() => void handleMergeConfirm()}
          onBack={() => setConfirmMerge(false)}
        />
      )}

      {/* Compteur */}
      <div className="px-4 py-1.5">
        <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
          {filtered.length} ingrédient{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste */}
      {filtered.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
            <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
              {item.aisle.name} · {item.baseUnit === 'GRAM' ? 'g' : item.baseUnit === 'MILLILITER' ? 'ml' : 'unité'}
            </p>
          </div>
          <button onClick={() => setEditing(item)} className="p-1.5 rounded-lg" style={{ color: 'var(--text2)' }}>
            <Pencil size={13} />
          </button>
          <button onClick={() => setPendingDelete(item)} className="p-1.5 rounded-lg" style={{ color: 'var(--muted)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="font-mono text-xs px-4 py-8 text-center" style={{ color: 'var(--muted)' }}>
          {search ? 'Aucun résultat' : 'Dictionnaire vide'}
        </p>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Supprimer « ${pendingDelete.name} » ?`}
          detail="Cette action est irréversible."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { void handleDelete(pendingDelete); setPendingDelete(null) }}
        />
      )}
    </div>
  )
}

// ─── Sous-panneaux ────────────────────────────────────────────────────────────

function BlockedPanel({ blocked, items, onMerge, onClose }: {
  blocked:  BlockedDelete
  items:    IngredientWithAisle[]
  onMerge:  () => void
  onClose:  () => void
}) {
  const name = items.find(i => i.id === blocked.id)?.name ?? blocked.id
  return (
    <div className="mx-4 my-2 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <p className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>
        Impossible de supprimer « {name} »
      </p>
      <p className="font-mono text-xs mb-2" style={{ color: 'var(--muted)' }}>
        Utilisé dans {blocked.recipes.length} recette{blocked.recipes.length > 1 ? 's' : ''} :
      </p>
      <ul className="mb-3 pl-3">
        {blocked.recipes.map(r => (
          <li key={r.id} className="font-body text-sm" style={{ color: 'var(--text2)' }}>· {r.title}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          onClick={onMerge}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <GitMerge size={12} /> Fusionner avec…
        </button>
        <button onClick={onClose} className="px-3 py-1.5 font-mono text-xs rounded-xl" style={{ color: 'var(--muted)' }}>
          Fermer
        </button>
      </div>
    </div>
  )
}

function MergePanel({ merge, onSearch, onSelect, onNext, onClose }: {
  merge:    MergeState
  onSearch: (q: string) => void
  onSelect: (id: string, name: string) => void
  onNext:   () => void
  onClose:  () => void
}) {
  return (
    <div className="mx-4 my-2 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <p className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
        Fusionner « {merge.sourceName} » dans…
      </p>
      <div className="relative mb-3">
        <input
          autoFocus
          value={merge.query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Chercher l'ingrédient cible…"
          className="w-full px-3 py-2 rounded-xl font-body text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        {merge.results.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 rounded-xl overflow-hidden mt-1 z-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}
          >
            {merge.results.slice(0, 6).map(r => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id, r.name)}
                className="w-full text-left px-3 py-2.5 font-body text-sm"
                style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', background: merge.targetId === r.id ? 'var(--accent-dim)' : 'transparent' }}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {merge.targetName && (
        <p className="font-mono text-xs mb-3" style={{ color: 'var(--accent)' }}>
          Cible : {merge.targetName}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onNext}
          disabled={!merge.targetId}
          className="px-4 py-1.5 font-mono text-xs font-medium rounded-xl disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Continuer →
        </button>
        <button onClick={onClose} className="px-3 py-1.5 font-mono text-xs rounded-xl" style={{ color: 'var(--muted)' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

function ConfirmMergePanel({ merge, onConfirm, onBack }: {
  merge:     MergeState
  onConfirm: () => void
  onBack:    () => void
}) {
  return (
    <div className="mx-4 my-2 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <p className="font-display text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Confirmer la fusion
      </p>
      <p className="font-body text-sm mb-1" style={{ color: 'var(--text2)' }}>
        Fusionner <strong>{merge.sourceName}</strong> dans <strong>{merge.targetName}</strong>.
      </p>
      <p className="font-mono text-xs mb-3" style={{ color: 'var(--danger)' }}>
        ⚠️ Toutes les recettes utilisant « {merge.sourceName} » seront redirigées. Cette action est irréversible.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 font-mono text-xs font-medium rounded-xl"
          style={{ background: 'var(--danger)', color: '#fff' }}
        >
          Fusionner définitivement
        </button>
        <button onClick={onBack} className="px-3 py-1.5 font-mono text-xs rounded-xl" style={{ color: 'var(--muted)' }}>
          Retour
        </button>
      </div>
    </div>
  )
}
