'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Users } from 'lucide-react'
import type { CreateMarketItemPayload, LabeurMarketItemType, LabeurMarketResetFrequency } from '@/lib/labeur/types'

interface MarketItemFormProps {
  itemId?: string
  initialValues?: Partial<CreateMarketItemPayload>
}

// Presets de prix orientés spec
const PRICE_PRESETS = [10, 20, 25, 30, 50, 100, 200]

/**
 * Formulaire de création / édition d'un article du Marché.
 */
export function MarketItemForm({ itemId, initialValues }: MarketItemFormProps) {
  const router = useRouter()
  const isEdit = !!itemId

  const [title,          setTitle]          = useState(initialValues?.title         ?? '')
  const [description,    setDescription]    = useState(initialValues?.description   ?? '')
  const [ecuPrice,       setEcuPrice]       = useState(initialValues?.ecuPrice      ?? 20)
  const [type,           setType]           = useState<LabeurMarketItemType>(initialValues?.type ?? 'INDIVIDUAL')
  const [hasStock,       setHasStock]       = useState(initialValues?.stock != null)
  const [stock,          setStock]          = useState(initialValues?.stock         ?? 1)
  const [resetFrequency, setResetFrequency] = useState<LabeurMarketResetFrequency | ''>(
    initialValues?.resetFrequency ?? ''
  )
  const [isSealable,     setIsSealable]     = useState(initialValues?.isSealable    ?? true)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim())   { setError('Le titre est requis'); return }
    if (ecuPrice < 1)    { setError('Le prix doit être ≥ 1 écu'); return }
    if (hasStock && stock < 1) { setError('Le stock doit être ≥ 1'); return }

    setLoading(true)

    const payload: CreateMarketItemPayload = {
      title:         title.trim(),
      description:   description.trim() || undefined,
      ecuPrice,
      type,
      stock:         hasStock ? stock : undefined,
      resetFrequency: resetFrequency || undefined,
      isSealable,
    }

    try {
      const url    = isEdit ? `/api/labeur/market/${itemId}` : '/api/labeur/market'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erreur')
        return
      }

      router.push('/labeur/marche')
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">

      {/* Type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Type de récompense
        </label>
        <div className="flex gap-2">
          {(['INDIVIDUAL', 'COLLECTIVE'] as LabeurMarketItemType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: type === t ? 'var(--accent)' : 'var(--surface2)',
                color:           type === t ? 'var(--bg)'     : 'var(--text2)',
              }}
            >
              {t === 'INDIVIDUAL'
                ? <><User size={13} className="inline mr-1" />Individuelle</>
                : <><Users size={13} className="inline mr-1" />Collective</>
              }
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {type === 'COLLECTIVE'
            ? 'Les deux membres contribuent chacun 50 % du prix.'
            : 'Un seul membre dépense ses écu.'}
        </p>
      </div>

      {/* Titre */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Raclette du dimanche"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Description <span style={{ fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Précisions sur la récompense…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
        />
      </div>

      {/* Prix en écu */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Prix — {ecuPrice} écu
        </label>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setEcuPrice(v)}
              className="px-3 py-1.5 rounded-lg text-sm font-mono transition-all"
              style={{
                backgroundColor: ecuPrice === v ? 'var(--accent)' : 'var(--surface2)',
                color:           ecuPrice === v ? 'var(--bg)'     : 'var(--text2)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={ecuPrice}
          onChange={(e) => setEcuPrice(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-24 px-3 py-2 rounded-xl text-sm font-mono outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
        />
      </div>

      {/* Stock */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Stock limité</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              L'article disparaît du Marché une fois le stock épuisé
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHasStock((v) => !v)}
            className="w-11 h-6 rounded-full transition-all relative shrink-0"
            style={{ backgroundColor: hasStock ? 'var(--accent)' : 'var(--surface2)' }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full transition-all"
              style={{ backgroundColor: 'white', left: hasStock ? 'calc(100% - 20px)' : '4px' }}
            />
          </button>
        </div>

        {hasStock && (
          <div
            className="px-4 py-3 flex flex-col gap-3"
            style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <label className="text-sm" style={{ color: 'var(--text2)' }}>Quantité</label>
              <input
                type="number"
                min={1}
                value={stock}
                onChange={(e) => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 rounded-xl text-sm font-mono outline-none"
                style={{
                  backgroundColor: 'var(--surface2)',
                  border:          '1px solid var(--border)',
                  color:           'var(--text)',
                }}
              />
            </div>

            {/* Réinitialisation périodique */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: 'var(--muted)' }}>
                Réinitialisation automatique du stock
              </label>
              <div className="flex gap-2">
                {([
                  { value: '',         label: 'Aucune'          },
                  { value: 'WEEKLY',   label: 'Toutes les semaines' },
                  { value: 'MONTHLY',  label: 'Tous les mois'   },
                ] as { value: string; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResetFrequency(opt.value as LabeurMarketResetFrequency | '')}
                    className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: resetFrequency === opt.value ? 'var(--accent-dim)' : 'var(--surface2)',
                      color:           resetFrequency === opt.value ? 'var(--accent)'      : 'var(--text2)',
                      border:          resetFrequency === opt.value ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scellable */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Scellable par malédiction</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Si désactivé, l'article reste accessible même sous malédiction
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSealable((v) => !v)}
          className="w-11 h-6 rounded-full transition-all relative shrink-0"
          style={{ backgroundColor: isSealable ? 'var(--accent)' : 'var(--surface2)' }}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full transition-all"
            style={{ backgroundColor: 'white', left: isSealable ? 'calc(100% - 20px)' : '4px' }}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          {loading ? '…' : isEdit ? 'Enregistrer' : 'Ajouter au Marché'}
        </button>
      </div>
    </form>
  )
}
