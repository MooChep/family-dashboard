'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Calendar, CalendarX, CalendarDays, ChefHat, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSlotDate(d: Date): string {
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

/**
 * Page Menu — layout unifié :
 *  – Section "Le Calendrier" : scroll horizontal 11 jours (J-3 → J+7)
 *  – Section "À cuisiner" : cartes flottantes scrollables horizontalement
 */
// Horaires par défaut (configurable à terme dans les préférences)
const LUNCH_HOUR  = 12, LUNCH_MIN  = 30
const DINNER_HOUR = 21, DINNER_MIN = 0

/** Retourne le prochain slot daté (le plus proche dans le temps) */
function getNearestSlot(slots: PlanningSlotWithRecipe[]): PlanningSlotWithRecipe | null {
  const now = new Date()
  const candidates = slots
    .filter(s => s.type === 'DATED' && s.scheduledDate)
    .map(s => {
      const d = new Date(s.scheduledDate!)
      const [h, m] = s.period === 'LUNCH'
        ? [LUNCH_HOUR, LUNCH_MIN]
        : [DINNER_HOUR, DINNER_MIN]
      d.setHours(h, m, 0, 0)
      return { slot: s, mealTime: d }
    })
    .filter(({ mealTime }) => mealTime >= now)
    .sort((a, b) => a.mealTime.getTime() - b.mealTime.getTime())
  return candidates[0]?.slot ?? null
}

export default function MenuPage() {
  const router = useRouter()
  const [slots,          setSlots]          = useState<PlanningSlotWithRecipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showPicker,     setShowPicker]     = useState(false)
  const [addContext,     setAddContext]     = useState<AddContext>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCardData | null>(null)
  const [consumeSlot,    setConsumeSlot]    = useState<PlanningSlotWithRecipe | null>(null)
  const [activeDragId,   setActiveDragId]   = useState<string | null>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  async function handleUnassign(slotId: string) {
    try {
      const res  = await fetch(`/api/gamelle/planning/slots/${slotId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scheduledDate: null, period: null }),
      })
      const data = await res.json() as PlanningSlotWithRecipe
      setSlots(prev => prev.map(s => s.id === slotId ? data : s))
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return
    // over.id format: `${isoDate}|${period}`
    const [date, period] = (String(over.id)).split('|') as [string, Period]
    if (!date || !period) return
    // Ne placer que si le slot cible est vide
    const occupied = dated.find(s =>
      s.scheduledDate &&
      toISODate(new Date(s.scheduledDate)) === date &&
      s.period === period
    )
    if (occupied) return
    void handlePlace(String(active.id), date, period)
  }

  const dated       = slots.filter(s => s.type === 'DATED')
  const floating    = slots.filter(s => s.type === 'FLOATING')
  const nearestSlot = getNearestSlot(slots)

  function getSlot(day: Date, period: Period): PlanningSlotWithRecipe | undefined {
    return dated.find(s =>
      s.scheduledDate &&
      new Date(s.scheduledDate).toDateString() === day.toDateString() &&
      s.period === period
    )
  }

  const activeDragSlot = activeDragId ? floating.find(s => s.id === activeDragId) ?? null : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={{ threshold: { x: 0.05, y: 0 } }}
      onDragStart={e => setActiveDragId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
    <div className="flex flex-col min-h-screen pb-24" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Mon menu
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/gamelle/menu/calendrier"
            className="p-1.5 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <CalendarDays size={16} />
          </Link>
          <button
            onClick={() => handleOpenPicker()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {/* Bannière "Mode cuisine" — prochain repas */}
      {!loading && nearestSlot && (
        <button
          onClick={() => router.push(`/gamelle/cuisine/${nearestSlot.recipe.id}?portions=${nearestSlot.portions}`)}
          className="mx-4 mt-3 flex items-center justify-center gap-3 py-3 rounded-2xl w-full"
          style={{ background: 'var(--accent)', color: '#fff', maxWidth: 'calc(100% - 2rem)' }}
        >
          <ChefHat size={18} style={{ color: '#fff', flexShrink: 0 }} />
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs font-semibold" style={{ color: '#fff' }}>Mode cuisine</span>
            <span className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {nearestSlot.recipe.title} · {formatSlotDate(new Date(nearestSlot.scheduledDate!))} {nearestSlot.period === 'LUNCH' ? 'Midi' : 'Soir'}
            </span>
          </div>
        </button>
      )}

      {loading ? (
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : (
        <>
          {/* ── Section Calendrier ─────────────────────────────────────────────── */}
          <section className="mt-4 mb-2">
            <div className="flex items-center gap-2 px-4 mb-2">
              <Calendar size={14} style={{ color: 'var(--accent)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Calendrier
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
                      width:     isToday ? 172 : 148,
                      minHeight: isToday ? 180 : 148,
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
                        const dropId = `${toISODate(day)}|${period}`
                        return (
                          <DroppableSlot key={period} id={dropId} occupied={!!slot}>
                            <p
                              className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
                              style={{ color: 'var(--muted)' }}
                            >
                              {label}
                            </p>
                            {slot ? (
                              <div className="flex items-center gap-1 w-full">
                                <button
                                  onClick={() => setConsumeSlot(slot)}
                                  className="flex items-center gap-1.5 flex-1 text-left min-w-0"
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
                                <button
                                  onClick={() => void handleUnassign(slot.id)}
                                  className="shrink-0 p-0.5 rounded"
                                  style={{ color: 'var(--muted)' }}
                                >
                                  <CalendarX size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenPicker({ date: toISODate(day), period })}
                                className="font-body text-[10px]"
                                style={{ color: 'var(--border2)' }}
                              >
                                + Planifier
                              </button>
                            )}
                          </DroppableSlot>
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

      <DragOverlay dropAnimation={null}>
        {activeDragSlot && <FloatingCardOverlay slot={activeDragSlot} />}
      </DragOverlay>
    </div>
    </DndContext>
  )
}

/* ── FloatingCard (draggable) ─────────────────────────────────────────────── */

function FloatingCard({
  slot,
  onSelect,
  onRemove,
}: {
  slot:     PlanningSlotWithRecipe
  onSelect: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: slot.id })
  const remaining = slot.portions - slot.portionsConsumed

  return (
    <div
      ref={setNodeRef}
      className="shrink-0 rounded-2xl overflow-hidden flex flex-col"
      style={{
        width:      148,
        background: 'var(--surface)',
        border:     '1px dashed var(--accent)',
        transform:  CSS.Translate.toString(transform),
        opacity:    isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
    >
      {/* Handle drag + titre */}
      <div
        className="flex items-center gap-1 px-2 pt-2 pb-1 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--border2)', touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={13} className="shrink-0" />
        <p className="font-body text-xs font-semibold line-clamp-2 leading-snug flex-1" style={{ color: 'var(--text)' }}>
          {slot.recipe.title}
        </p>
      </div>

      {/* Image cliquable → consommer */}
      <button onClick={onSelect} className="px-2 pb-1 text-left">
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ width: '100%', height: 68, background: 'var(--surface2)' }}
        >
          {slot.recipe.imageLocal ? (
            <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold" style={{ color: 'var(--muted)' }}>
              {slot.recipe.title.charAt(0)}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
          {remaining} portion{remaining > 1 ? 's' : ''}
        </p>
      </button>

      {/* Supprimer */}
      <div className="flex justify-end px-2 pb-2">
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

/* ── FloatingCardOverlay — ghost pendant le drag ──────────────────────────── */

function FloatingCardOverlay({ slot }: { slot: PlanningSlotWithRecipe }) {
  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden flex flex-col"
      style={{
        width:      148,
        background: 'var(--surface)',
        border:     '2px solid var(--accent)',
        boxShadow:  '0 8px 24px rgba(0,0,0,0.2)',
        opacity:    0.95,
      }}
    >
      <div className="flex items-center gap-1 px-2 pt-2 pb-1" style={{ color: 'var(--border2)' }}>
        <GripVertical size={13} className="shrink-0" />
        <p className="font-body text-xs font-semibold line-clamp-2 leading-snug flex-1" style={{ color: 'var(--text)' }}>
          {slot.recipe.title}
        </p>
      </div>
      <div className="px-2 pb-2">
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ width: '100%', height: 68, background: 'var(--surface2)' }}
        >
          {slot.recipe.imageLocal ? (
            <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold" style={{ color: 'var(--muted)' }}>
              {slot.recipe.title.charAt(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── DroppableSlot — zone de dépôt dans le carousel ──────────────────────── */

function DroppableSlot({ id, occupied, children }: { id: string; occupied: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: occupied })
  return (
    <div
      ref={setNodeRef}
      className="rounded-lg transition-colors"
      style={{
        border:     isOver && !occupied ? '1.5px dashed var(--accent)' : '1.5px solid transparent',
        background: isOver && !occupied ? 'var(--accent-dim)' : 'transparent',
      }}
    >
      {children}
    </div>
  )
}
