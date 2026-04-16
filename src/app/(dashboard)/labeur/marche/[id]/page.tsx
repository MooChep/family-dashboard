'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, ShoppingBag, Users, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { WaxSeal } from '@/components/labeur/market/WaxSeal'
import { PurchaseButton } from '@/components/labeur/market/PurchaseButton'
import { CollectiveProgress } from '@/components/labeur/market/CollectiveProgress'
import { MarketItemForm } from '@/components/labeur/market/MarketItemForm'
import { formatRelative } from '@/lib/formatDate'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

type Params = { id: string }

/**
 * Page détail d'un article du Marché.
 * Affiche : description, prix (gonflé), sceau si malédiction,
 * progression collective, historique des achats, bouton d'achat.
 */
export default function ArticleDetailPage({ params }: { params: Params }) {
  const { id }            = params
  const router            = useRouter()
  const { data: session } = useSession()

  const [item,       setItem]       = useState<LabeurMarketItemWithPurchases | null>(null)
  const [curseSeuil, setCurseSeuil] = useState(50)
  const [inflation,  setInflation]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [editing,    setEditing]    = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function fetchItem() {
    const [itemRes, settingsRes] = await Promise.all([
      fetch(`/api/labeur/market/${id}`),
      fetch('/api/labeur/settings'),
    ])
    if (itemRes.ok)     setItem((await itemRes.json()).data)
    if (settingsRes.ok) {
      const s = (await settingsRes.json()).data
      setCurseSeuil(s?.curseSeuil ?? 50)
      setInflation(s?.__inflation ?? 0) // non fourni par settings, on lit l'item
    }
    setLoading(false)
  }

  useEffect(() => { fetchItem() }, [id])

  // L'inflation réelle vient du displayPrice de l'item
  useEffect(() => {
    if (item) {
      const pct = item.ecuPrice > 0
        ? ((item.displayPrice - item.ecuPrice) / item.ecuPrice) * 100
        : 0
      setInflation(pct)
    }
  }, [item])

  async function handleDelete() {
    if (!confirm('Désactiver cet article ? Il sera masqué du Marché.')) return
    setDeleting(true)
    const res = await fetch(`/api/labeur/market/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/labeur/marche')
    } else {
      alert('Erreur lors de la désactivation')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p style={{ color: 'var(--danger)' }}>Article introuvable.</p>
        <Link href="/labeur/marche" className="text-sm mt-4 block" style={{ color: 'var(--accent)' }}>
          ← Retour au Marché
        </Link>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(false)} style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Modifier l'article</h1>
        </div>
        <MarketItemForm
          itemId={item.id}
          initialValues={{
            title:         item.title,
            description:   item.description ?? undefined,
            ecuPrice:      item.ecuPrice,
            type:          item.type,
            stock:         item.stock ?? undefined,
            resetFrequency: item.resetFrequency ?? undefined,
            isSealable:    item.isSealable,
          }}
        />
      </div>
    )
  }

  const priceInflated = item.displayPrice > item.ecuPrice
  const completePurchases = item.purchases.filter((p) => p.isComplete)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

      {/* ── Navigation ── */}
      <div className="flex items-center gap-3">
        <Link href="/labeur/marche" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold flex-1 truncate" style={{ color: 'var(--text)' }}>
          {item.title}
        </h1>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
        >
          Modifier
        </button>
      </div>

      {/* ── Carte principale ── */}
      <div
        className="relative rounded-xl p-5 flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--surface)',
          border: item.isSealed ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--border)',
        }}
      >
        {item.isSealed && (
          <WaxSeal inflationPercent={inflation} curseSeuil={curseSeuil} />
        )}

        {/* Icône + type */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--surface2)' }}
          >
            {item.type === 'COLLECTIVE'
              ? <Users      size={22} style={{ color: 'var(--accent)' }} />
              : <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
            }
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {item.type === 'COLLECTIVE' ? 'Récompense collective' : 'Récompense individuelle'}
            </p>
            {item.stock !== null && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {item.stock} restant{item.stock > 1 ? 's' : ''}
                {item.resetFrequency && (
                  <> · reset <RefreshCw size={9} className="inline" />
                  {item.resetFrequency === 'MONTHLY' ? ' mensuel' : ' hebdo'}</>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Prix */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
            {item.displayPrice}
          </span>
          <span style={{ color: 'var(--muted)' }}>écu</span>
          {priceInflated && (
            <>
              <span className="text-lg line-through font-mono" style={{ color: 'var(--muted)' }}>
                {item.ecuPrice}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
              >
                +{Math.round(inflation)} % inflation
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm" style={{ color: 'var(--text2)' }}>{item.description}</p>
        )}

        {/* Progression collective */}
        {item.type === 'COLLECTIVE' && (
          <CollectiveProgress item={item} currentUserId={session?.user?.id ?? ''} />
        )}

        {/* Bouton achat */}
        {item.isActive && (
          <PurchaseButton
            item={item}
            currentUserId={session?.user?.id ?? ''}
            onSuccess={fetchItem}
          />
        )}
        {!item.isActive && (
          <div
            className="py-3 rounded-xl text-sm text-center"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
          >
            Article désactivé
          </div>
        )}
      </div>

      {/* ── Historique des achats finalisés ── */}
      {completePurchases.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Historique
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {completePurchases.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < completePurchases.length - 1 ? '1px solid var(--border)' : undefined }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {p.user.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
                  {p.user.name}
                  <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>
                    {p.type === 'COLLECTIVE_CONTRIBUTION' ? '(contribution)' : ''}
                  </span>
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {formatRelative(new Date(p.purchasedAt))}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--danger)' }}>
                  -{p.ecuSpent} écu
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Action désactivation ── */}
      {item.isActive && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--border)' }}
        >
          <Trash2 size={15} />
          {deleting ? 'Désactivation…' : 'Retirer du Marché'}
        </button>
      )}

    </div>
  )
}
