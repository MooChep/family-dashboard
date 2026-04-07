'use client'

import { formatQuantity } from '@/lib/gamelle/units'

export type ShoppingItem = {
  id:              string
  referenceId:     string | null
  label:           string
  quantity:        number | null
  displayUnit:     string | null
  plannedQuantity: number | null
  skipped:         boolean
  purchased:       boolean
  isManual:        boolean
  reference:       {
    aisle: { id: string; name: string; order: number }
  } | null
}

interface CheckPlacardProps {
  items:      ShoppingItem[]
  onToggleSkip: (id: string) => Promise<void>
  onDone:     () => void
}

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
      if (!map.has(key)) {
        map.set(key, { aisleId: key, aisleName: 'Divers', order: 9999, items: [] })
      }
      map.get(key)!.items.push(item)
    } else {
      const { aisle } = item.reference
      if (!map.has(aisle.id)) {
        map.set(aisle.id, { aisleId: aisle.id, aisleName: aisle.name, order: aisle.order, items: [] })
      }
      map.get(aisle.id)!.items.push(item)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}

function formatItemQty(item: ShoppingItem): string {
  if (item.quantity === null) return ''
  return formatQuantity(item.quantity, item.displayUnit ?? '')
}

/**
 * Étape "Check placard" — liste les articles à acheter après déduction stock.
 * Tap sur un item = cocher/décocher (article déjà dans le placard).
 * Les items cochés sont déplacés sous le bouton "Générer".
 * Le bouton remonte au fur et à mesure qu'on coche des articles.
 */
export function CheckPlacard({ items, onToggleSkip, onDone }: CheckPlacardProps) {
  const notSkipped = items.filter(i => !i.skipped)
  const skipped    = items.filter(i => i.skipped)
  const groups     = groupByAisle(notSkipped)
  const total      = items.length

  return (
    <div className="flex flex-col gap-0 pb-24">
      {/* Message stock auto */}
      <p className="font-mono text-xs px-4 pt-3 pb-2" style={{ color: 'var(--success)' }}>
        ✓ Stock déduit automatiquement
      </p>

      {/* Instruction */}
      <p className="font-body text-sm px-4 pb-3" style={{ color: 'var(--text2)' }}>
        Cochez ce que vous avez déjà. Ces articles seront retirés de la liste.
      </p>

      {/* Groupes par rayon — items non cochés uniquement */}
      {groups.map(group => (
        <div key={group.aisleId}>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-1.5"
            style={{ color: 'var(--muted)', background: 'var(--surface2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
          >
            {group.aisleName}
          </p>
          {group.items.map(item => (
            <button
              key={item.id}
              onClick={() => void onToggleSkip(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {/* Checkbox */}
              <div
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                style={{
                  border:     '1.5px solid var(--border2)',
                  background: 'transparent',
                }}
              />

              <span className="flex-1 font-body text-sm" style={{ color: 'var(--text)' }}>
                {item.label}
              </span>

              <span className="font-mono text-xs shrink-0" style={{ color: 'var(--text2)' }}>
                {formatItemQty(item)}
              </span>
            </button>
          ))}
        </div>
      ))}

      {total === 0 && (
        <p className="font-mono text-xs px-4 py-8 text-center" style={{ color: 'var(--muted)' }}>
          Aucun article à acheter — le stock couvre tout !
        </p>
      )}

      {/* Bouton — juste après les items non cochés */}
      <div className="px-4 pt-4 pb-2">
        {skipped.length > 0 && (
          <p className="font-mono text-[10px] text-center mb-3" style={{ color: 'var(--muted)' }}>
            {skipped.length} article{skipped.length > 1 ? 's' : ''} coché{skipped.length > 1 ? 's' : ''} — exclu{skipped.length > 1 ? 's' : ''} de la liste
          </p>
        )}
        <button
          onClick={onDone}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Générer la liste finale →
        </button>
      </div>

      {/* Items cochés — en bas, atténués */}
      {skipped.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-1.5"
            style={{ color: 'var(--muted)', background: 'var(--surface2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
          >
            Déjà dans le placard
          </p>
          {skipped.map(item => (
            <button
              key={item.id}
              onClick={() => void onToggleSkip(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {/* Checkbox cochée */}
              <div
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                style={{
                  border:     '1.5px solid var(--success)',
                  background: 'var(--success)',
                }}
              >
                <span className="text-xs font-bold leading-none" style={{ color: '#fff' }}>✓</span>
              </div>

              <span
                className="flex-1 font-body text-sm"
                style={{ color: 'var(--muted)', textDecoration: 'line-through' }}
              >
                {item.label}
              </span>

              <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                {formatItemQty(item)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
