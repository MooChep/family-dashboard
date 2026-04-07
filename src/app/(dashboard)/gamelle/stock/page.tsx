import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { InventoryView } from '@/components/gamelle/inventory/InventoryView'

export const metadata = { title: 'Stock — Gamelle' }

/**
 * Page stock / inventaire du module Gamelle.
 * Affiche les quantités en stock, le réservé et le rab.
 */
export default function StockPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Stock
        </h1>
        <Link
          href="/gamelle/stock/bonus"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          <Sparkles size={12} /> Recettes réalisables
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <InventoryView />
      </div>
    </div>
  )
}
