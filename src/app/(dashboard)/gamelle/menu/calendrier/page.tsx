'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RecipeDetail } from '@/components/gamelle/recipes/RecipeDetail'
import type { PlanningSlotWithRecipe, Period, RecipeWithIngredients } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

const DAYS_FR   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]!
}

/** Lundi de la semaine contenant la date donnée */
function getMonday(d: Date): Date {
  const day = d.getDay() // 0=dim
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function addWeeks(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(d.getDate() + n * 7)
  return result
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const m1 = MONTHS_FR[monday.getMonth()]!
  const m2 = MONTHS_FR[sunday.getMonth()]!
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${m1}`
  }
  return `${monday.getDate()} ${m1} – ${sunday.getDate()} ${m2}`
}

type SlotMap = Map<string, PlanningSlotWithRecipe> // key = `${isoDate}_${period}`

function slotKey(isoDate: string, period: Period) {
  return `${isoDate}_${period}`
}

/**
 * Page calendrier — vue semaine par semaine sur ±4 semaines autour d'aujourd'hui.
 * Navigation semaine précédente / suivante.
 */
export default function CalendrierPage() {
  const router = useRouter()
  const today  = new Date()
  today.setHours(0, 0, 0, 0)

  const [monday,         setMonday]         = useState(() => getMonday(today))
  const [slots,          setSlots]          = useState<SlotMap>(new Map())
  const [loading,        setLoading]        = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null)

  async function openRecipe(recipeId: string) {
    try {
      const res  = await fetch(`/api/gamelle/recipes/${recipeId}`)
      const json = await res.json() as { success: boolean; data?: RecipeWithIngredients }
      if (json.success && json.data) setSelectedRecipe(json.data)
    } catch { /* ignore */ }
  }

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  useEffect(() => {
    void load(monday)
  }, [monday])

  async function load(from: Date) {
    setLoading(true)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)
    try {
      const params = new URLSearchParams({ from: toISODate(from), to: toISODate(to) })
      const res    = await fetch(`/api/gamelle/planning/slots?${params}`)
      const data   = await res.json() as PlanningSlotWithRecipe[]
      const map    = new Map<string, PlanningSlotWithRecipe>()
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.scheduledDate && s.period) {
            map.set(slotKey(toISODate(new Date(s.scheduledDate)), s.period as Period), s)
          }
        }
      }
      setSlots(map)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  function prevWeek() { setMonday(w => addWeeks(w, -1)) }
  function nextWeek() { setMonday(w => addWeeks(w, +1)) }

  const isCurrentWeek = getMonday(today).toDateString() === monday.toDateString()

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => router.back()} className="p-1" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Calendrier
        </h1>
      </div>

      {/* Navigation semaine */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}
      >
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <p className="font-mono text-xs font-semibold" style={{ color: isCurrentWeek ? 'var(--accent)' : 'var(--text)' }}>
            {isCurrentWeek ? 'Cette semaine' : formatWeekLabel(monday)}
          </p>
          {!isCurrentWeek && (
            <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
              {formatWeekLabel(monday)}
            </p>
          )}
        </div>

        <button
          onClick={nextWeek}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Retour à aujourd'hui */}
      {!isCurrentWeek && (
        <div className="px-4 pt-2">
          <button
            onClick={() => setMonday(getMonday(today))}
            className="font-mono text-[10px] px-3 py-1 rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            ↩ Semaine actuelle
          </button>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-xs px-4 py-6" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : (
        <div className="flex flex-col gap-0">
          {days.map(day => {
            const iso     = toISODate(day)
            const isToday = day.toDateString() === today.toDateString()
            const lunch   = slots.get(slotKey(iso, 'LUNCH'))
            const dinner  = slots.get(slotKey(iso, 'DINNER'))
            const dayIdx  = (day.getDay() + 6) % 7 // lun=0

            return (
              <div
                key={iso}
                style={{
                  borderBottom:  '1px solid var(--border)',
                  background:    isToday ? 'var(--accent-dim)' : 'var(--surface)',
                }}
              >
                {/* Header jour */}
                <div
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    background:   isToday ? 'var(--accent)' : 'var(--surface2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="font-mono text-xs font-semibold uppercase tracking-widest"
                    style={{ color: isToday ? '#fff' : 'var(--text2)', minWidth: 28 }}
                  >
                    {DAYS_FR[dayIdx]}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}
                  >
                    {day.getDate()} {MONTHS_FR[day.getMonth()]?.toLowerCase()}
                  </span>
                </div>

                {/* Slots Midi + Soir */}
                <div className="flex divide-x" style={{ borderColor: 'var(--border)' }}>
                  {(['LUNCH', 'DINNER'] as Period[]).map(period => {
                    const slot  = period === 'LUNCH' ? lunch : dinner
                    const label = period === 'LUNCH' ? 'Midi' : 'Soir'
                    return (
                      <div key={period} className="flex-1 px-3 py-3 min-h-[64px] flex flex-col gap-1.5">
                        <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                          {label}
                        </p>
                        {slot ? (
                          <button
                            onClick={() => void openRecipe(slot.recipe.id)}
                            className="flex items-center gap-2 text-left w-full"
                          >
                            <div
                              className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                              style={{ width: 24, height: 24, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                            >
                              {slot.recipe.imageLocal ? (
                                <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-display text-[9px] font-bold" style={{ color: 'var(--muted)' }}>
                                  {slot.recipe.title.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="font-body text-xs leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                              {slot.recipe.title}
                            </span>
                          </button>
                        ) : (
                          <span className="font-body text-xs" style={{ color: 'var(--border2)' }}>— Libre</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Fiche recette */}
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          isInMenu={true}
          onClose={() => setSelectedRecipe(null)}
          onAddToMenu={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  )
}
