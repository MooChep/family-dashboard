import { InventoryView } from '@/components/popote/inventory/InventoryView'

export const metadata = { title: 'Stock — Popote' }

/**
 * Page stock / inventaire du module Popote.
 * Affiche les quantités en stock, le réservé et le rab.
 */
export default function StockPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Stock
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <InventoryView />
      </div>
    </div>
  )
}
