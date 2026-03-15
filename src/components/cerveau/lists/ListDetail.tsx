'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ListItem, type ListItemData } from './ListItem'
import { hapticLight } from '@/lib/haptics'
import { type ListEntry } from './ListCard'

// ── Types ──

interface ListDetailProps {
  entry:     ListEntry | null
  onClose:   () => void
  onArchive: (id: string) => void
}

// ── Composant ──

/**
 * Vue détail d'une Liste : items avec swipe/tap, champ d'ajout rapide, vider les cochés.
 */
export function ListDetail({ entry, onClose, onArchive }: ListDetailProps): ReactElement {
  const [items,      setItems]      = useState<ListItemData[]>([])
  const [loading,    setLoading]    = useState(false)
  const [addContent, setAddContent] = useState('')
  const [addQty,     setAddQty]     = useState('')
  const [adding,     setAdding]     = useState(false)
  const inputRef                    = useRef<HTMLInputElement>(null)

  // ── Chargement des items ──

  const loadItems = useCallback((id: string) => {
    setLoading(true)
    void fetch(`/api/cerveau/lists/${id}/items`)
      .then((r) => r.json() as Promise<ListItemData[]>)
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (entry) {
      setAddContent('')
      setAddQty('')
      loadItems(entry.id)
    }
  }, [entry, loadItems])

  if (!entry) return <></>

  // ── Comptage pour l'affichage ──
  const checkedCount   = items.filter((i) => i.checked).length
  const uncheckedCount = items.length - checkedCount

  // ── Ajout d'un item ──

  function handleAdd(): void {
    const trimmed = addContent.trim()
    if (!trimmed || adding) return
    setAdding(true)
    void fetch(`/api/cerveau/lists/${entry!.id}/items`, {
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

  // ── Toggle cochage ──

  function handleToggle(id: string, checked: boolean): void {
    void fetch(`/api/cerveau/lists/${entry!.id}/items/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ checked }),
    })
      .then((r) => r.json() as Promise<ListItemData>)
      .then((updated) => {
        setItems((prev) => {
          const rest = prev.filter((i) => i.id !== id)
          // réordonne : non cochés en haut, cochés en bas
          const withUpdated = [...rest, updated]
          return [
            ...withUpdated.filter((i) => !i.checked),
            ...withUpdated.filter((i) => i.checked),
          ]
        })
      })
  }

  // ── Suppression d'un item ──

  function handleDelete(id: string): void {
    hapticLight()
    void fetch(`/api/cerveau/lists/${entry!.id}/items/${id}`, { method: 'DELETE' })
      .then(() => { setItems((prev) => prev.filter((i) => i.id !== id)) })
  }

  // ── Édition inline d'un item ──

  function handleEdit(id: string, content: string, quantity: string | null): void {
    void fetch(`/api/cerveau/lists/${entry!.id}/items/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, quantity }),
    })
      .then((r) => r.json() as Promise<ListItemData>)
      .then((updated) => {
        setItems((prev) => prev.map((i) => i.id === id ? updated : i))
      })
  }

  // ── Vider les cochés ──

  function handleClearChecked(): void {
    void fetch(`/api/cerveau/lists/${entry!.id}/clear-checked`, { method: 'POST' })
      .then(() => {
        setItems((prev) => prev.filter((i) => !i.checked))
      })
  }

  return (
    <BottomSheet isOpen={!!entry} onClose={onClose}>
      <div style={{ padding: '16px 0 0' }}>

        {/* ── En-tête ── */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 20px 12px', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--cerveau-list)' }}>
              ☰
            </span>
            <span
              style={{
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
          </div>

          {/* ── Actions en-tête ── */}
          <div className="flex gap-2">
            {checkedCount > 0 && (
              <button
                onClick={handleClearChecked}
                style={{
                  padding:      '5px 10px',
                  borderRadius: '20px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'var(--muted)',
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '11px',
                  cursor:       'pointer',
                }}
              >
                vider les cochés ({checkedCount})
              </button>
            )}
            <button
              onClick={() => { onArchive(entry.id); onClose() }}
              style={{
                padding:      '5px 10px',
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
        </div>

        {/* ── Liste d'items ── */}
        <div style={{ maxHeight: '55dvh', overflowY: 'auto' }}>
          {loading ? (
            <div
              style={{
                padding:    '24px',
                textAlign:  'center',
                fontFamily: 'var(--font-body)',
                fontSize:   '14px',
                color:      'var(--muted)',
              }}
            >
              Chargement…
            </div>
          ) : items.length === 0 ? (
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
            borderTop:  '1px solid var(--border)',
            padding:    '10px 14px 28px',
            background: 'var(--surface)',
            display:    'flex',
            gap:        '8px',
            alignItems: 'center',
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
              width:      '40px',
              border:     'none',
              borderBottom: '1px solid var(--border)',
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize:   '12px',
              color:      'var(--muted)',
              outline:    'none',
              textAlign:  'center',
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
    </BottomSheet>
  )
}
