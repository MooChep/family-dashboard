'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Aisle = { id: string; name: string; order: number }

function SortableAisleRow({
  aisle,
  index,
  editingId,
  editName,
  onStartEdit,
  onEditNameChange,
  onRename,
  onCancelEdit,
  onDelete,
}: {
  aisle:           Aisle
  index:           number
  editingId:       string | null
  editName:        string
  onStartEdit:     (a: Aisle) => void
  onEditNameChange:(v: string) => void
  onRename:        (id: string) => void
  onCancelEdit:    () => void
  onDelete:        (a: Aisle) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: aisle.id })

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 px-4 py-2.5"
      style={{
        borderBottom:  '1px solid var(--border)',
        transform:     CSS.Transform.toString(transform),
        transition,
        opacity:       isDragging ? 0.5 : 1,
        background:    isDragging ? 'var(--surface2)' : 'transparent',
        zIndex:        isDragging ? 50 : undefined,
      }}
    >
      {/* Handle drag */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded"
        style={{ color: 'var(--border2)', touchAction: 'none' }}
      >
        <GripVertical size={15} />
      </button>

      {/* Numéro */}
      <span className="font-mono text-[10px] w-4 text-right shrink-0" style={{ color: 'var(--muted)' }}>
        {index + 1}
      </span>

      {/* Nom — éditable inline */}
      {editingId === aisle.id ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            autoFocus
            value={editName}
            onChange={e => onEditNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  onRename(aisle.id)
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1 px-2 py-1 rounded-lg font-body text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)' }}
          />
          <button onClick={() => onRename(aisle.id)}>
            <Check size={13} style={{ color: 'var(--success)' }} />
          </button>
          <button onClick={onCancelEdit}>
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
          onClick={() => onStartEdit(aisle)}
          className="p-1 rounded"
          style={{ color: 'var(--text2)' }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(aisle)}
          className="p-1 rounded"
          style={{ color: 'var(--muted)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/**
 * Configuration des rayons — drag-and-drop via @dnd-kit/sortable, renommage inline, ajout, suppression.
 */
export function AislesConfig() {
  const [aisles,    setAisles]    = useState<Aisle[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName,  setEditName]  = useState('')
  const [addName,   setAddName]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [error,     setError]     = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setAisles(prev => {
      const oldIndex = prev.findIndex(a => a.id === active.id)
      const newIndex = prev.findIndex(a => a.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)

      // Fire-and-forget — persist new order
      void fetch('/api/gamelle/aisles/reorder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderedIds: reordered.map(a => a.id) }),
      }).then(r => {
        if (!r.ok) {
          // Rollback si erreur
          setAisles(prev)
          setError('Erreur lors du réordonnancement')
        }
      })

      return reordered
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
          {aisles.length} rayon{aisles.length !== 1 ? 's' : ''} — glisser pour réordonner
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
            onKeyDown={e => {
              if (e.key === 'Enter')  void handleAdd()
              if (e.key === 'Escape') { setAdding(false); setAddName('') }
            }}
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

      {/* Liste drag-and-drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={aisles.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {aisles.map((aisle, index) => (
            <SortableAisleRow
              key={aisle.id}
              aisle={aisle}
              index={index}
              editingId={editingId}
              editName={editName}
              onStartEdit={a => { setEditingId(a.id); setEditName(a.name) }}
              onEditNameChange={setEditName}
              onRename={id => void handleRename(id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={a => void handleDelete(a)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
