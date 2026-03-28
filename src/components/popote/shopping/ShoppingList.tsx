'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SwipeItem } from './SwipeItem'
import { QuickActions } from './QuickActions'
import { formatQuantity } from '@/lib/popote/units'
import type { ShoppingItem } from './CheckPlacard'

type AisleGroup = {
  aisleId:   string
  aisleName: string
  order:     number
  items:     ShoppingItem[]
}

function groupByAisle(items: ShoppingItem[]): AisleGroup[] {
  const map = new Map<string, AisleGroup>()

  for (const item of items) {
    if (item.isManual || !item.reference) {
      const key = '__manual'
      if (!map.has(key)) map.set(key, { aisleId: key, aisleName: 'Divers', order: 9999, items: [] })
      map.get(key)!.items.push(item)
    } else {
      const { aisle } = item.reference
      if (!map.has(aisle.id)) map.set(aisle.id, { aisleId: aisle.id, aisleName: aisle.name, order: aisle.order, items: [] })
      map.get(aisle.id)!.items.push(item)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}

interface ShoppingListProps {
  items:          ShoppingItem[]
  onPurchase:     (id: string, quantity: number, unit: string) => Promise<void>
  onAddManual:    (label: string) => Promise<void>
}

/**
 * Vue liste de courses Smart Swipe.
 * – Swipe droite : acheté avec la quantité prévue
 * – Swipe gauche : ouvre Quick Actions (quantité personnalisée)
 * – Les articles achetés sont affichés en bas en style atténué
 * – Ajout d'un article manuel via le bouton +
 */
export function ShoppingList({ items, onPurchase, onAddManual }: ShoppingListProps) {
  const [quickActionsFor, setQuickActionsFor] = useState<string | null>(null)
  const [addingManual,    setAddingManual]    = useState(false)
  const [manualLabel,     setManualLabel]     = useState('')
  const [submittingManual, setSubmittingManual] = useState(false)

  const unpurchased = items.filter(i => !i.purchased)
  const purchased   = items.filter(i => i.purchased)

  const groups = groupByAisle(unpurchased)

  const qaItem = quickActionsFor ? items.find(i => i.id === quickActionsFor) : null

  async function handleManualSubmit() {
    const label = manualLabel.trim()
    if (!label) return
    setSubmittingManual(true)
    try {
      await onAddManual(label)
      setManualLabel('')
      setAddingManual(false)
    } finally {
      setSubmittingManual(false)
    }
  }

  return (
    <div className="flex flex-col pb-24">

      {/* Compteur */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {unpurchased.length} article{unpurchased.length !== 1 ? 's' : ''} restant{unpurchased.length !== 1 ? 's' : ''}
        </span>
        {purchased.length > 0 && (
          <span className="font-mono text-xs" style={{ color: 'var(--success)' }}>
            {purchased.length} acheté{purchased.length > 1 ? 's' : ''} ✓
          </span>
        )}
      </div>

      {/* Aide swipe */}
      {unpurchased.length > 0 && (
        <p className="font-mono text-[10px] px-4 pb-2 text-center" style={{ color: 'var(--muted)' }}>
          → acheté · ← quantité perso
        </p>
      )}

      {/* Groupes par rayon */}
      {groups.map(group => (
        <div key={group.aisleId}>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-1.5"
            style={{
              color:        'var(--muted)',
              background:   'var(--surface2)',
              borderTop:    '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {group.aisleName}
          </p>

          {group.items.map(item => (
            <SwipeItem
              key={item.id}
              purchased={item.purchased}
              onSwipeRight={() => void onPurchase(item.id, item.quantity ?? 0, item.displayUnit ?? '')}
              onSwipeLeft={() => setQuickActionsFor(item.id)}
            >
              <ItemRow item={item} />
            </SwipeItem>
          ))}
        </div>
      ))}

      {unpurchased.length === 0 && purchased.length === 0 && (
        <p className="font-mono text-xs px-4 py-8 text-center" style={{ color: 'var(--muted)' }}>
          Liste vide
        </p>
      )}

      {/* Articles achetés (atténués, en bas) */}
      {purchased.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-1.5"
            style={{
              color:        'var(--muted)',
              background:   'var(--surface2)',
              borderTop:    '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Achetés
          </p>
          {purchased.map(item => (
            <SwipeItem
              key={item.id}
              purchased={item.purchased}
              onSwipeRight={() => Promise.resolve()}
              onSwipeLeft={() => undefined}
            >
              <ItemRow item={item} />
            </SwipeItem>
          ))}
        </div>
      )}

      {/* Ajout manuel */}
      <div className="px-4 pt-4">
        {addingManual ? (
          <div
            className="flex items-center gap-2 rounded-xl px-3"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <input
              autoFocus
              type="text"
              value={manualLabel}
              onChange={e => setManualLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleManualSubmit()
                if (e.key === 'Escape') { setAddingManual(false); setManualLabel('') }
              }}
              placeholder="Article à ajouter…"
              className="flex-1 py-2.5 font-body text-sm bg-transparent outline-none"
              style={{ color: 'var(--text)' }}
            />
            <button
              onClick={() => void handleManualSubmit()}
              disabled={!manualLabel.trim() || submittingManual}
              className="font-mono text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Ajouter
            </button>
            <button onClick={() => { setAddingManual(false); setManualLabel('') }}>
              <X size={16} style={{ color: 'var(--muted)' }} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingManual(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-body text-sm"
            style={{
              color:      'var(--text2)',
              background: 'var(--surface2)',
              border:     '1px solid var(--border)',
            }}
          >
            <Plus size={14} />
            Ajouter un article
          </button>
        )}
      </div>

      {/* Quick Actions overlay */}
      {qaItem && (
        <QuickActions
          label={qaItem.label}
          plannedQty={qaItem.quantity}
          displayUnit={qaItem.displayUnit}
          quickBuy={(qaItem.reference as { quickBuyQuantities?: { label: string; value: number; unit: string }[] | null } | null)?.quickBuyQuantities ?? null}
          baseUnit={(qaItem.reference as { baseUnit?: string } | null)?.baseUnit ?? 'UNIT'}
          onConfirm={(qty, unit) => {
            setQuickActionsFor(null)
            void onPurchase(qaItem.id, qty, unit)
          }}
          onClose={() => setQuickActionsFor(null)}
        />
      )}
    </div>
  )
}

function ItemRow({ item }: { item: ShoppingItem }) {
  const qty = item.quantity !== null
    ? formatQuantity(item.quantity, item.displayUnit ?? '')
    : null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
        style={{
          border:     `1.5px solid ${item.purchased ? 'var(--success)' : 'var(--border2)'}`,
          background:  item.purchased ? 'var(--success)' : 'transparent',
        }}
      >
        {item.purchased && (
          <span className="text-white text-xs font-bold leading-none">✓</span>
        )}
      </div>

      <span
        className="flex-1 font-body text-sm"
        style={{
          color:          item.purchased ? 'var(--muted)' : 'var(--text)',
          textDecoration: item.purchased ? 'line-through' : 'none',
        }}
      >
        {item.label}
      </span>

      {qty && (
        <span className="font-mono text-xs shrink-0" style={{ color: 'var(--text2)' }}>
          {qty}
        </span>
      )}
    </div>
  )
}
