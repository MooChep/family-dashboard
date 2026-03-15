'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactElement,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ListItem, type ListItemData } from '@/components/cerveau/lists/ListItem'
import { hapticLight } from '@/lib/haptics'

// ── Types ──

interface ListEntryData {
  id:         string
  content:    string
  assignedTo: string
  status:     string
}

// ── Composant ──

/**
 * Page /cerveau/listes/[id] — vue détail d'une Liste en pleine page.
 * Charge l'entrée et ses items, permet d'ajouter/cocher/supprimer des items.
 */
export default function ListDetailPage(): ReactElement {
  const params                          = useParams<{ id: string }>()
  const id                              = params.id
  const router                          = useRouter()
  const [entry,      setEntry]          = useState<ListEntryData | null>(null)
  const [items,      setItems]          = useState<ListItemData[]>([])
  const [loading,    setLoading]        = useState(true)
  const [addContent, setAddContent]     = useState('')
  const [addQty,     setAddQty]         = useState('')
  const [adding,     setAdding]         = useState(false)
  const inputRef                        = useRef<HTMLInputElement>(null)

  // ── Chargement ──

  const load = useCallback(() => {
    setLoading(true)
    void Promise.all([
      fetch(`/api/cerveau/entries/${id}`).then((r) => r.json() as Promise<ListEntryData>),
      fetch(`/api/cerveau/lists/${id}/items`).then((r) => r.json() as Promise<ListItemData[]>),
    ]).then(([entryData, itemsData]) => {
      setEntry(entryData)
      setItems(itemsData)
      setLoading(false)
    })
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Handlers items ──

  function handleAdd(): void {
    const trimmed = addContent.trim()
    if (!trimmed || adding) return
    setAdding(true)
    void fetch(`/api/cerveau/lists/${id}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: trimmed, quantity: addQty.trim() || undefined }),
    })
      .then((r) => r.json() as Promise<ListItemData>)
      .then((item) => {
        setItems((prev) => [item, ...prev])
        setAddContent('')
        setAddQty('')
        setAdding(false)
        inputRef.current?.focus()
      })
      .catch(() => { setAdding(false) })
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') handleAdd()
  }

  function handleToggle(itemId: string, checked: boolean): void {
    void fetch(`/api/cerveau/lists/${id}/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ checked }),
    })
      .then((r) => r.json() as Promise<ListItemData>)
      .then((updated) => {
        setItems((prev) => {
          const rest        = prev.filter((i) => i.id !== itemId)
          const withUpdated = [...rest, updated]
          return [
            ...withUpdated.filter((i) => !i.checked),
            ...withUpdated.filter((i) => i.checked),
          ]
        })
      })
  }

  function handleDelete(itemId: string): void {
    hapticLight()
    void fetch(`/api/cerveau/lists/${id}/items/${itemId}`, { method: 'DELETE' })
      .then(() => { setItems((prev) => prev.filter((i) => i.id !== itemId)) })
  }

  function handleEdit(itemId: string, content: string, quantity: string | null): void {
    void fetch(`/api/cerveau/lists/${id}/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, quantity }),
    })
      .then((r) => r.json() as Promise<ListItemData>)
      .then((updated) => {
        setItems((prev) => prev.map((i) => i.id === itemId ? updated : i))
      })
  }

  function handleClearChecked(): void {
    void fetch(`/api/cerveau/lists/${id}/clear-checked`, { method: 'POST' })
      .then(() => { setItems((prev) => prev.filter((i) => !i.checked)) })
  }

  function handleArchive(): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'ARCHIVED' }),
    }).then(() => { router.push('/cerveau/listes') })
  }

  // ── Render ──

  if (loading) {
    return (
      <div
        style={{
          padding:    '48px 16px',
          textAlign:  'center',
          fontFamily: 'var(--font-body)',
          fontSize:   '14px',
          color:      'var(--muted)',
        }}
      >
        Chargement…
      </div>
    )
  }

  if (!entry) {
    return (
      <div
        style={{
          padding:    '48px 16px',
          textAlign:  'center',
          fontFamily: 'var(--font-body)',
          fontSize:   '14px',
          color:      'var(--muted)',
        }}
      >
        Liste introuvable.
      </div>
    )
  }

  const checkedCount   = items.filter((i) => i.checked).length
  const uncheckedCount = items.length - checkedCount

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── En-tête ── */}
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '12px',
          padding:      '12px 16px',
          borderBottom: '1px solid var(--border)',
          position:     'sticky',
          top:          0,
          background:   'var(--surface)',
          zIndex:       10,
        }}
      >
        <button
          onClick={() => { router.back() }}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'var(--muted)',
            fontFamily:  'var(--font-mono)',
            fontSize:    '16px',
            padding:     '4px',
            flexShrink:  0,
          }}
        >
          ←
        </button>

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--cerveau-list)' }}>
          ☰
        </span>

        <span
          style={{
            flex:       1,
            fontFamily: 'var(--font-body)',
            fontSize:   '16px',
            fontWeight: 600,
            color:      'var(--text)',
          }}
        >
          {entry.content}
        </span>

        <span
          style={{
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            color:        uncheckedCount > 0 ? 'var(--cerveau-list)' : 'var(--muted)',
            background:   uncheckedCount > 0
              ? 'color-mix(in srgb, var(--cerveau-list) 12%, transparent)'
              : 'var(--surface2)',
            padding:      '2px 7px',
            borderRadius: '10px',
          }}
        >
          {uncheckedCount}
        </span>

        {checkedCount > 0 && (
          <button
            onClick={handleClearChecked}
            style={{
              padding:      '4px 10px',
              borderRadius: '20px',
              border:       '1px solid var(--border)',
              background:   'transparent',
              color:        'var(--muted)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '11px',
              cursor:       'pointer',
            }}
          >
            vider ({checkedCount})
          </button>
        )}

        <button
          onClick={handleArchive}
          style={{
            padding:      '4px 10px',
            borderRadius: '20px',
            border:       '1px solid var(--border)',
            background:   'transparent',
            color:        'var(--muted)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            cursor:       'pointer',
          }}
        >
          archiver
        </button>
      </div>

      {/* ── Liste d'items ── */}
      <div
        style={{
          background:   'var(--surface)',
          margin:       '16px',
          border:       '1px solid var(--border)',
          borderRadius: '12px',
          overflow:     'hidden',
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              padding:    '32px 20px',
              textAlign:  'center',
              fontFamily: 'var(--font-body)',
              fontSize:   '14px',
              color:      'var(--muted)',
            }}
          >
            Cette liste est vide. Ajoutez un item ci-dessous.
          </div>
        ) : (
          items.map((item, i) => (
            <ListItem
              key={item.id}
              item={item}
              isLast={i === items.length - 1}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {/* ── Champ d'ajout rapide ── */}
      <div
        style={{
          position:   'fixed',
          bottom:     'calc(env(safe-area-inset-bottom) + 64px)',
          left:       0,
          right:      0,
          borderTop:  '1px solid var(--border)',
          padding:    '10px 14px',
          background: 'var(--surface)',
          display:    'flex',
          gap:        '8px',
          alignItems: 'center',
          zIndex:     20,
        }}
      >
        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>›</span>
        <input
          ref={inputRef}
          value={addContent}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setAddContent(e.target.value) }}
          onKeyDown={handleAddKeyDown}
          placeholder="ajouter un item…"
          style={{
            flex:       1,
            border:     'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize:   '14px',
            color:      'var(--text)',
            outline:    'none',
          }}
        />
        <input
          value={addQty}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setAddQty(e.target.value) }}
          onKeyDown={handleAddKeyDown}
          placeholder="qté"
          style={{
            width:        '40px',
            border:       'none',
            borderBottom: '1px solid var(--border)',
            background:   'transparent',
            fontFamily:   'var(--font-mono)',
            fontSize:     '12px',
            color:        'var(--muted)',
            outline:      'none',
            textAlign:    'center',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!addContent.trim() || adding}
          style={{
            padding:      '6px 12px',
            borderRadius: '8px',
            border:       'none',
            background:   addContent.trim() && !adding ? 'var(--cerveau-list)' : 'var(--surface2)',
            color:        addContent.trim() && !adding ? 'var(--text-on-accent)' : 'var(--muted)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '12px',
            cursor:       addContent.trim() && !adding ? 'pointer' : 'not-allowed',
            transition:   'background 150ms',
            flexShrink:   0,
          }}
        >
          +
        </button>
      </div>

    </div>
  )
}
