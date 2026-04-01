'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react'

type Aisle = { id: string; name: string; order: number }

/**
 * Configuration des rayons — réordonnancement ↑/↓, renommage inline, ajout, suppression.
 */
export function AislesConfig() {
  const [aisles,   setAisles]   = useState<Aisle[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName,  setEditName]  = useState('')
  const [addName,   setAddName]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/aisles')
      const data = await res.json() as Aisle[]
      setAisles(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function move(index: number, direction: 'up' | 'down') {
    const next = [...aisles]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setAisles(next)
    await fetch('/api/gamelle/aisles/reorder', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderedIds: next.map(a => a.id) }),
    })
  }

  async function handleRename(id: string) {
    if (!editName.trim()) { setEditingId(null); return }
    setAisles(prev => prev.map(a => a.id === id ? { ...a, name: editName.trim() } : a))
    setEditingId(null)
    await fetch(`/api/gamelle/aisles/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: editName.trim() }),
    })
  }

  async function handleAdd() {
    if (!addName.trim()) return
    try {
      const res  = await fetch('/api/gamelle/aisles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: addName.trim() }),
      })
      const data = await res.json() as Aisle
      setAisles(prev => [...prev, data])
      setAddName('')
      setAdding(false)
    } catch { /* ignore */ }
  }

  async function handleDelete(aisle: Aisle) {
    const res = await fetch(`/api/gamelle/aisles/${aisle.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const body = await res.json() as { error?: string }
      setError(body.error ?? 'Suppression impossible')
      return
    }
    if (res.ok) setAisles(prev => prev.filter(a => a.id !== aisle.id))
  }

  if (loading) return <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>

  return (
    <div className="flex flex-col">

      {/* Barre outils */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {aisles.length} rayon{aisles.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--danger-dim, var(--surface2))' }}>
          <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
          <button onClick={() => setError('')}><X size={13} style={{ color: 'var(--muted)' }} /></button>
        </div>
      )}

      {/* Formulaire ajout */}
      {adding && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          <input
            autoFocus
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') { setAdding(false); setAddName('') } }}
            placeholder="Nom du rayon…"
            className="flex-1 px-3 py-1.5 rounded-xl font-body text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button onClick={() => void handleAdd()}>
            <Check size={15} style={{ color: 'var(--success)' }} />
          </button>
          <button onClick={() => { setAdding(false); setAddName('') }}>
            <X size={15} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      )}

      {/* Liste */}
      {aisles.map((aisle, index) => (
        <div
          key={aisle.id}
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Ordre */}
          <span className="font-mono text-[10px] w-5 text-right shrink-0" style={{ color: 'var(--muted)' }}>
            {index + 1}
          </span>

          {/* Nom — éditable inline */}
          {editingId === aisle.id ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleRename(aisle.id); if (e.key === 'Escape') setEditingId(null) }}
                className="flex-1 px-2 py-1 rounded-lg font-body text-sm outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)' }}
              />
              <button onClick={() => void handleRename(aisle.id)}>
                <Check size={13} style={{ color: 'var(--success)' }} />
              </button>
              <button onClick={() => setEditingId(null)}>
                <X size={13} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          ) : (
            <span className="flex-1 font-body text-sm" style={{ color: 'var(--text)' }}>
              {aisle.name}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => void move(index, 'up')}
              disabled={index === 0}
              className="p-1 rounded disabled:opacity-20"
              style={{ color: 'var(--text2)' }}
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={() => void move(index, 'down')}
              disabled={index === aisles.length - 1}
              className="p-1 rounded disabled:opacity-20"
              style={{ color: 'var(--text2)' }}
            >
              <ChevronDown size={15} />
            </button>
            <button
              onClick={() => { setEditingId(aisle.id); setEditName(aisle.name) }}
              className="p-1 rounded"
              style={{ color: 'var(--text2)' }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => void handleDelete(aisle)}
              className="p-1 rounded"
              style={{ color: 'var(--muted)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
