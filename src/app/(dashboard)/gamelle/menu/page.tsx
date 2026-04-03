'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Calendar } from 'lucide-react'
import { AddToMenuSheet } from '@/components/gamelle/planning/AddToMenuSheet'
import { ConsumeSheet } from '@/components/gamelle/planning/ConsumeSheet'
import { RecipeSearchGrid } from '@/components/gamelle/recipes/RecipeSearchGrid'
import type {
  PlanningSlotWithRecipe,
  RecipeCardData,
  ApiResponse,
  PaginatedResponse,
  RecipeWithIngredients,
  RecipeCategory,
  Period,
} from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

type AddContext = { date: string; period: Period } | null

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function formatSlotDate(d: Date): string {
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

/**
 * Page Menu — layout unifié :
 *  – Section "Le Cri" : scroll horizontal 11 jours (J-3 → J+7)
 *  – Section "À cuisiner" : cartes flottantes scrollables horizontalement
 */
export default function MenuPage() {
  const [slots,          setSlots]          = useState<PlanningSlotWithRecipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showPicker,     setShowPicker]     = useState(false)
  const [addContext,     setAddContext]     = useState<AddContext>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCardData | null>(null)
  const [consumeSlot,    setConsumeSlot]    = useState<PlanningSlotWithRecipe | null>(null)
  const [placeSlot,      setPlaceSlot]      = useState<PlanningSlotWithRecipe | null>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let i = -3; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d)
  }

  useEffect(() => { void loadSlots() }, [])

  // Scroll to today after load
  useEffect(() => {
    if (!loading && todayRef.current) {
      todayRef.current.scrollIntoView({ inline: 'start', behavior: 'smooth', block: 'nearest' })
    }
  }, [loading])

  async function loadSlots() {
    setLoading(true)
    try {
      const fromDate = days[0]!
      const toDate   = days[days.length - 1]!
      const params   = new URLSearchParams({ from: toISODate(fromDate), to: toISODate(toDate) })
      const res      = await fetch(`/api/gamelle/planning/slots?${params}`)
      const data     = await res.json() as PlanningSlotWithRecipe[]
      setSlots(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function fetchRecipes(query: string, category?: RecipeCategory): Promise<RecipeCardData[]> {
    const params = new URLSearchParams({ page: '1', limit: '30' })
    if (query)    params.set('search', query)
    if (category) params.set('category', category)
    try {
      const res  = await fetch(`/api/gamelle/recipes?${params}`)
      const json = await res.json() as ApiResponse<PaginatedResponse<RecipeWithIngredients>>
      if (!json.success || !json.data) return []
      return json.data.data.map(r => ({
        id:              r.id,
        title:           r.title,
        imageUrl:        null,
        imageLocal:      r.imageLocal,
        preparationTime: r.preparationTime,
        cookingTime:     r.cookingTime,
        category:        r.category,
        description:     r.description,
      }))
    } catch { return [] }
  }

  function handleOpenPicker(context: AddContext = null) {
    setAddContext(context)
    setShowPicker(true)
  }

  function handleSelectRecipe(recipe: RecipeCardData) {
    setShowPicker(false)
    setSelectedRecipe(recipe)
  }

  function handleSlotAdded(slot: PlanningSlotWithRecipe) {
    setSlots(prev => [...prev, slot])
    setSelectedRecipe(null)
    setAddContext(null)
  }

  async function handleRemove(id: string) {
    try {
      await fetch(`/api/gamelle/planning/slots/${id}`, { method: 'DELETE' })
      setSlots(prev => prev.filter(s => s.id !== id))
      setConsumeSlot(prev => (prev?.id === id ? null : prev))
    } catch { /* ignore */ }
  }

  function handleConsumed(updated: PlanningSlotWithRecipe) {
    const isNowEmpty = updated.portionsConsumed >= updated.portions
    setSlots(prev =>
      isNowEmpty
        ? prev.filter(s => s.id !== updated.id)
        : prev.map(s => s.id === updated.id ? updated : s)
    )
    setConsumeSlot(null)
  }

  async function handlePlace(slotId: string, date: string, period: Period) {
    try {
      const res  = await fetch(`/api/gamelle/planning/slots/${slotId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scheduledDate: date, period }),
      })
      const data = await res.json() as PlanningSlotWithRecipe
      setSlots(prev => prev.map(s => s.id === slotId ? data : s))
      setPlaceSlot(null)
    } catch { /* ignore */ }
  }

  const dated    = slots.filter(s => s.type === 'DATED')
  const floating = slots.filter(s => s.type === 'FLOATING')

  function getSlot(day: Date, period: Period): PlanningSlotWithRecipe | undefined {
    return dated.find(s =>
      s.scheduledDate &&
      new Date(s.scheduledDate).toDateString() === day.toDateString() &&
      s.period === period
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-4" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Mon menu
        </h1>
        <button
          onClick={() => handleOpenPicker()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : (
        <>
          {/* ── Section Le Cri ─────────────────────────────────────────────── */}
          <section className="mt-4 mb-2">
            <div className="flex items-center gap-2 px-4 mb-2">
              <Calendar size={14} style={{ color: 'var(--accent)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Le Cri
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
              {days.map((day, i) => {
                const isToday = day.toDateString() === now.toDateString()
                const lunch   = getSlot(day, 'LUNCH')
                const dinner  = getSlot(day, 'DINNER')

                return (
                  <div
                    key={i}
                    ref={isToday ? todayRef : undefined}
                    className="shrink-0 rounded-2xl overflow-hidden snap-start flex flex-col"
                    style={{
                      width:      148,
                      background: isToday ? 'var(--accent-dim)' : 'var(--surface)',
                      border:     `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {/* Header jour */}
                    <div
                      className="px-3 py-2 shrink-0"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background:   isToday ? 'var(--accent)' : 'var(--surface2)',
                      }}
                    >
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest font-semibold"
                        style={{ color: isToday ? '#fff' : 'var(--text2)' }}
                      >
                        {formatSlotDate(day)}
                      </p>
                    </div>

                    {/* Slots Midi / Soir */}
                    <div className="flex flex-col gap-1.5 p-2 flex-1">
                      {(['LUNCH', 'DINNER'] as Period[]).map(period => {
                        const slot  = period === 'LUNCH' ? lunch : dinner
                        const label = period === 'LUNCH' ? 'Midi' : 'Soir'
                        return (
                          <div key={period}>
                            <p
                              className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
                              style={{ color: 'var(--muted)' }}
                            >
                              {label}
                            </p>
                            {slot ? (
                              <button
                                onClick={() => setConsumeSlot(slot)}
                                className="flex items-center gap-1.5 w-full text-left"
                              >
                                <div
                                  className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                                  style={{ width: 20, height: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                                >
                                  {slot.recipe.imageLocal ? (
                                    <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-display text-[8px] font-bold" style={{ color: 'var(--muted)' }}>
                                      {slot.recipe.title.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-body text-[10px] leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                                  {slot.recipe.title}
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPicker({ date: toISODate(day), period })}
                                className="font-body text-[10px]"
                                style={{ color: 'var(--border2)' }}
                              >
                                + Planifier
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Section À cuisiner (slots volants) ─────────────────────────── */}
          {floating.length > 0 && (
            <section className="mt-2">
              <div className="flex items-center justify-between px-4 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  À cuisiner ({floating.length})
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2">
                {floating.map(slot => (
                  <FloatingCard
                    key={slot.id}
                    slot={slot}
                    onSelect={() => setConsumeSlot(slot)}
                    onRemove={() => void handleRemove(slot.id)}
                    onPlace={() => setPlaceSlot(slot)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {dated.length === 0 && floating.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
              <span className="text-4xl">🍽️</span>
              <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>Menu vide</p>
              <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
                Appuie sur + Ajouter pour planifier tes prochains repas.
              </p>
            </div>
          )}
        </>
      )}

      {/* Picker recettes — overlay plein écran */}
      {showPicker && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg)' }}>
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <button onClick={() => { setShowPicker(false); setAddContext(null) }} style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
            <h2 className="flex-1 font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
              Choisir une recette
            </h2>
            {addContext && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
                {formatSlotDate(new Date(addContext.date))} · {addContext.period === 'LUNCH' ? 'Midi' : 'Soir'}
              </span>
            )}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <RecipeSearchGrid
              title=""
              mode="search"
              onFetch={fetchRecipes}
              onSelect={handleSelectRecipe}
            />
          </div>
        </div>
      )}

      {/* AddToMenuSheet avec contexte pré-rempli */}
      {selectedRecipe && (
        <AddToMenuSheet
          recipe={selectedRecipe}
          initialDate={addContext?.date}
          initialPeriod={addContext?.period}
          onConfirm={handleSlotAdded}
          onClose={() => { setSelectedRecipe(null); setAddContext(null) }}
        />
      )}

      {/* ConsumeSheet */}
      {consumeSlot && (
        <ConsumeSheet
          slot={consumeSlot}
          onDone={handleConsumed}
          onClose={() => setConsumeSlot(null)}
        />
      )}

      {/* PlaceSheet — placer un slot volant sur le cri */}
      {placeSlot && (
        <PlaceSheet
          slot={placeSlot}
          onConfirm={(date, period) => void handlePlace(placeSlot.id, date, period)}
          onClose={() => setPlaceSlot(null)}
        />
      )}
    </div>
  )
}

/* ── FloatingCard ──────────────────────────────────────────────────────────── */

function FloatingCard({
  slot,
  onSelect,
  onRemove,
  onPlace,
}: {
  slot:     PlanningSlotWithRecipe
  onSelect: () => void
  onRemove: () => void
  onPlace:  () => void
}) {
  const remaining = slot.portions - slot.portionsConsumed

  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden flex flex-col"
      style={{
        width:      148,
        background: 'var(--surface)',
        border:     '1px dashed var(--accent)',
      }}
    >
      {/* Image / initiale */}
      <button onClick={onSelect} className="flex-1 p-3 text-left">
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center mb-2"
          style={{ width: '100%', height: 72, background: 'var(--surface2)' }}
        >
          {slot.recipe.imageLocal ? (
            <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold" style={{ color: 'var(--muted)' }}>
              {slot.recipe.title.charAt(0)}
            </span>
          )}
        </div>
        <p className="font-body text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--text)' }}>
          {slot.recipe.title}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
          {remaining} portion{remaining > 1 ? 's' : ''}
        </p>
      </button>

      {/* Actions */}
      <div
        className="flex items-center justify-between px-2 pb-2 gap-1"
      >
        <button
          onClick={onPlace}
          className="flex-1 py-1 rounded-lg font-mono text-[10px] text-center"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          Planifier
        </button>
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* ── PlaceSheet ────────────────────────────────────────────────────────────── */

function PlaceSheet({
  slot,
  onConfirm,
  onClose,
}: {
  slot:      PlanningSlotWithRecipe
  onConfirm: (date: string, period: Period) => void
  onClose:   () => void
}) {
  const [date,    setDate]    = useState('')
  const [period,  setPeriod]  = useState<Period>('DINNER')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!date) return
    setLoading(true)
    try { onConfirm(date, period) } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="flex flex-col gap-4 px-4 pt-5 pb-8 rounded-t-2xl"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Planifier sur le cri
          </p>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          {slot.recipe.title}
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl font-mono text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div className="flex gap-3">
          {(['LUNCH', 'DINNER'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2.5 rounded-xl font-mono text-sm transition-colors"
              style={{
                background: period === p ? 'var(--accent)' : 'var(--surface2)',
                color:      period === p ? '#fff' : 'var(--text2)',
                border:     `1px solid ${period === p ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {p === 'LUNCH' ? 'Midi' : 'Soir'}
            </button>
          ))}
        </div>

        <button
          onClick={() => void handleConfirm()}
          disabled={!date || loading}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? 'Enregistrement…' : 'Planifier →'}
        </button>
      </div>
    </div>
  )
}
