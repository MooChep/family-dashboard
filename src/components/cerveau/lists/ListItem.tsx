'use client'

import { useState, useRef, useEffect, type ReactElement, type ChangeEvent, type KeyboardEvent } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticLight } from '@/lib/haptics'

// ── Types ──

export interface ListItemData {
  id:          string
  content:     string
  quantity:    string | null
  checked:     boolean
  addedById:   string
  checkedById: string | null
  addedAt:     string
  checkedAt:   string | null
}

interface ListItemProps {
  item:     ListItemData
  onToggle: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  onEdit:   (id: string, content: string, quantity: string | null) => void
  isLast:   boolean
}

// ── Composant ──

/**
 * Item individuel d'une Liste.
 * Tap → coche/décoche · Swipe gauche → supprime · Tap long → édition inline
 */
export function ListItem({ item, onToggle, onDelete, onEdit, isLast }: ListItemProps): ReactElement {
  const [editing,  setEditing]  = useState(false)
  const [content,  setContent]  = useState(item.content)
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const longPressRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Animation "glisse en bas" au cochage ──
  const [sliding, setSliding] = useState(false)
  const prevCheckedRef        = useRef(item.checked)

  useEffect(() => {
    if (!prevCheckedRef.current && item.checked) {
      setSliding(true)
      const t = setTimeout(() => setSliding(false), 200)
      return () => clearTimeout(t)
    }
    prevCheckedRef.current = item.checked
  }, [item.checked])

  // ── Tap long pour édition ──

  function handleTouchStart(): void {
    longPressRef.current = setTimeout(() => {
      hapticLight()
      setEditing(true)
    }, 500)
  }

  function handleTouchEnd(): void {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  // ── Sauvegarde édition ──

  function handleSave(): void {
    const trimmed = content.trim()
    if (trimmed && trimmed !== item.content || quantity.trim() !== (item.quantity ?? '')) {
      onEdit(item.id, trimmed || item.content, quantity.trim() || null)
    }
    setEditing(false)
  }

  function handleContentChange(e: ChangeEvent<HTMLInputElement>): void {
    setContent(e.target.value)
  }

  function handleQuantityChange(e: ChangeEvent<HTMLInputElement>): void {
    setQuantity(e.target.value)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setContent(item.content)
      setQuantity(item.quantity ?? '')
      setEditing(false)
    }
  }

  const leftBand = [
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'suppr.',
      color:    'var(--error)',
      onAction: () => { onDelete(item.id) },
    },
  ]

  // ── Mode édition inline ──

  if (editing) {
    return (
      <div
        style={{
          padding:      '8px 14px',
          borderBottom: isLast ? 'none' : '1px solid var(--border)',
          background:   'var(--surface)',
        }}
      >
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            value={content}
            onChange={handleContentChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{
              flex:       1,
              border:     'none',
              borderBottom: '1px solid var(--cerveau-list)',
              background: 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize:   '14px',
              color:      'var(--text)',
              outline:    'none',
              padding:    '4px 0',
            }}
          />
          <input
            value={quantity}
            onChange={handleQuantityChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder="qté"
            style={{
              width:        '48px',
              border:       'none',
              borderBottom: '1px solid var(--border)',
              background:   'transparent',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              color:        'var(--muted)',
              outline:      'none',
              textAlign:    'center',
              padding:      '4px 0',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transform:    sliding ? 'translateY(4px)' : 'none',
        opacity:      sliding ? 0.7 : 1,
        transition:   'transform 200ms ease, opacity 200ms ease',
      }}
    >
      <SwipeActions leftBand={leftBand}>
        <div
          onClick={() => { hapticLight(); onToggle(item.id, !item.checked) }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            padding:    '11px 14px',
            background: 'var(--surface)',
            cursor:     'pointer',
          }}
        >
          {/* ── Indicateur coché/non coché ── */}
          <span
            style={{
              width:           '17px',
              height:          '17px',
              borderRadius:    '50%',
              border:          `1.5px solid ${item.checked ? 'var(--cerveau-list)' : 'var(--border)'}`,
              background:      item.checked ? 'var(--cerveau-list)' : 'transparent',
              flexShrink:      0,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              transition:      'background 150ms, border 150ms',
            }}
          >
            {item.checked && (
              <span style={{ color: 'var(--text-on-accent)', fontSize: '10px', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>✓</span>
            )}
          </span>

          {/* ── Contenu ── */}
          <span
            style={{
              flex:           1,
              fontFamily:     'var(--font-body)',
              fontSize:       '14px',
              color:          item.checked ? 'var(--muted)' : 'var(--text)',
              textDecoration: item.checked ? 'line-through' : 'none',
              overflow:       'hidden',
              textOverflow:   'ellipsis',
              whiteSpace:     'nowrap',
              transition:     'color 150ms',
            }}
          >
            {item.content}
          </span>

          {/* ── Quantité ── */}
          {item.quantity && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '11px',
                color:      'var(--muted)',
                flexShrink: 0,
              }}
            >
              {item.quantity}
            </span>
          )}
        </div>
      </SwipeActions>
    </div>
  )
}
