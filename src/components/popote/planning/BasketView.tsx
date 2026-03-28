'use client'

import { Trash2 } from 'lucide-react'
import type { PlanningSlotWithRecipe } from '@/lib/popote/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_POPOTE_UPLOAD_BASE_URL ?? '/uploads/popote'

interface BasketViewProps {
  slots:    PlanningSlotWithRecipe[]
  onRemove: (id: string) => void
  onSelect: (slot: PlanningSlotWithRecipe) => void
}

function isLate(slot: PlanningSlotWithRecipe): boolean {
  if (slot.type !== 'DATED' || !slot.scheduledDate) return false
  return new Date(slot.scheduledDate) < new Date()
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function RecipeThumb({ title, imageLocal }: { title: string; imageLocal: string | null }) {
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{ width: 44, height: 44, background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      {imageLocal ? (
        <img src={`${UPLOAD_BASE}/${imageLocal}`} alt={title} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-lg font-bold" style={{ color: 'var(--muted)' }}>
          {title.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

function SlotRow({ slot, onRemove, onSelect }: { slot: PlanningSlotWithRecipe; onRemove: (id: string) => void; onSelect: (s: PlanningSlotWithRecipe) => void }) {
  const remaining = slot.portions - slot.portionsConsumed
  const late      = isLate(slot)
  const floating  = slot.type === 'FLOATING'

  return (
    <div
      onClick={() => onSelect(slot)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
      style={{
        borderBottom:  '1px solid var(--border)',
        background:    floating ? 'var(--accent-dim)' : 'var(--bg)',
        borderLeft:    floating ? '3px solid var(--accent)' : 'none',
      }}
    >
      <RecipeThumb title={slot.recipe.title} imageLocal={slot.recipe.imageLocal} />

      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold truncate" style={{ color: floating ? 'var(--accent)' : 'var(--text)' }}>
          {slot.recipe.title}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
          {remaining} portion{remaining > 1 ? 's' : ''} rest.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Badge date / en retard / floating */}
        {floating ? null : late ? (
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--warning)' }}
          >
            En retard
          </span>
        ) : slot.scheduledDate ? (
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            {formatDate(slot.scheduledDate)}
            {slot.period && (
              <span className="ml-1">{slot.period === 'LUNCH' ? '· Midi' : '· Soir'}</span>
            )}
          </span>
        ) : null}

        <button
          onClick={() => onRemove(slot.id)}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/**
 * Vue panier : liste les slots actifs regroupés en "Sur le calendrier" et "À cuisiner".
 * Slots "En retard" marqués visuellement (scheduledDate passée, portions restantes > 0).
 */
export function BasketView({ slots, onRemove, onSelect }: BasketViewProps) {
  const dated    = slots.filter(s => s.type === 'DATED').sort((a, b) =>
    new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
  )
  const floating = slots.filter(s => s.type === 'FLOATING')

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
        <span className="text-4xl">🍽️</span>
        <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>Menu vide</p>
        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          Appuie sur + Ajouter pour planifier tes prochains repas.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {dated.length > 0 && (
        <>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 pt-4 pb-2"
            style={{ color: 'var(--muted)' }}
          >
            Sur le calendrier ({dated.length})
          </p>
          {dated.map(slot => (
            <SlotRow key={slot.id} slot={slot} onRemove={onRemove} onSelect={onSelect} />
          ))}
        </>
      )}

      {floating.length > 0 && (
        <>
          <p
            className="font-mono text-[10px] uppercase tracking-widest px-4 pt-4 pb-2"
            style={{ color: 'var(--muted)' }}
          >
            À cuisiner ({floating.length})
          </p>
          {floating.map(slot => (
            <SlotRow key={slot.id} slot={slot} onRemove={onRemove} onSelect={onSelect} />
          ))}
        </>
      )}
    </div>
  )
}
