import { MarketItemForm } from '@/components/labeur/market/MarketItemForm'

export const metadata = { title: 'Nouvel article · Marché Labeur' }

export default function NouvelArticlePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          Nouvel article
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Crée une récompense pour le foyer.
        </p>
      </div>
      <MarketItemForm />
    </div>
  )
}
