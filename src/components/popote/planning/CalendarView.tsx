'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PlanningSlotWithRecipe, Period } from '@/lib/popote/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_POPOTE_UPLOAD_BASE_URL ?? '/uploads/popote'

const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

interface CalendarViewProps {
  refreshKey: number
  onSelect:   (slot: PlanningSlotWithRecipe) => void
}

function getWeekStart(offset: number): Date {
  const d   = new Date()
  const day = d.getDay()
  // Ajuster pour que lundi = 0
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function SlotChip({
  slot,
  period,
  isLate,
  onSelect,
}: {
  slot:     PlanningSlotWithRecipe
  period:   Period
  isLate:   boolean
  onSelect: (s: PlanningSlotWithRecipe) => void
}) {
  const remaining = slot.portions - slot.portionsConsumed
  return (
    <button
      onClick={() => onSelect(slot)}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left"
      style={{
        background: isLate ? 'rgba(201,168,76,0.1)' : 'var(--accent-dim)',
        border:     `1px solid ${isLate ? 'var(--warning)' : 'var(--accent)'}`,
      }}
    >
      <div
        className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ width: 24, height: 24, background: 'var(--surface2)' }}
      >
        {slot.recipe.imageLocal ? (
          <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-xs font-bold" style={{ color: 'var(--muted)' }}>
            {slot.recipe.title.charAt(0)}
          </span>
        )}
      </div>
      <span className="flex-1 font-body text-xs truncate" style={{ color: isLate ? 'var(--warning)' : 'var(--accent)' }}>
        {isLate && '⚠ '}{slot.recipe.title}
      </span>
      <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>
        {remaining}p
      </span>
    </button>
  )
}

/**
 * Vue calendrier 7 jours — grille Midi/Soir avec navigation semaine.
 * Slots FLOATING affichés en bas quelque soit la semaine.
 */
export function CalendarView({ refreshKey, onSelect }: CalendarViewProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots,      setSlots]      = useState<PlanningSlotWithRecipe[]>([])
  const [loading,    setLoading]    = useState(true)

  const weekStart = getWeekStart(weekOffset)
  const weekDays  = getWeekDays(weekStart)
  const weekEnd   = weekDays[6]!

  useEffect(() => {
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, refreshKey])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: toISO(weekStart), to: toISO(weekEnd) })
      const res    = await fetch(`/api/popote/planning/slots?${params}`)
      const data   = await res.json() as PlanningSlotWithRecipe[]
      setSlots(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const dated    = slots.filter(s => s.type === 'DATED')
  const floating = slots.filter(s => s.type === 'FLOATING')

  // Slot pour un jour + période donnés
  function getSlot(day: Date, period: Period): PlanningSlotWithRecipe | undefined {
    return dated.find(s =>
      s.scheduledDate && isSameDay(new Date(s.scheduledDate), day) && s.period === period
    )
  }

  const today = new Date()

  // Label de la semaine : "7 – 13 avr." ou "7 avr. – 4 mai"
  const d0 = weekDays[0]!
  const d6 = weekDays[6]!
  const weekLabel = d0.getMonth() === d6.getMonth()
    ? `${d0.getDate()} – ${d6.getDate()} ${MONTHS_FR[d0.getMonth()]}`
    : `${d0.getDate()} ${MONTHS_FR[d0.getMonth()]} – ${d6.getDate()} ${MONTHS_FR[d6.getMonth()]}`

  return (
    <div className="flex flex-col">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={20} />
        </button>
        <span className="font-mono text-xs font-medium" style={{ color: 'var(--text)' }}>
          {weekLabel}
        </span>
        <button onClick={() => setWeekOffset(o => o + 1)} style={{ color: 'var(--muted)' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : (
        <div className="flex flex-col">
          {/* Jours */}
          {weekDays.map((day, i) => {
            const lunch  = getSlot(day, 'LUNCH')
            const dinner = getSlot(day, 'DINNER')
            const isToday = isSameDay(day, today)
            const hasSomething = lunch ?? dinner

            if (!hasSomething && weekOffset !== 0 && !isToday) return null

            return (
              <div
                key={i}
                className="px-4 py-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                {/* Label jour */}
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{
                  color:      isToday ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: isToday ? 600 : 400,
                }}>
                  {DAYS_FR[i]} {day.getDate()} {MONTHS_FR[day.getMonth()]}
                  {isToday && <span className="ml-1">· aujourd'hui</span>}
                </p>

                <div className="flex flex-col gap-1.5">
                  {(['LUNCH', 'DINNER'] as Period[]).map(period => {
                    const slot  = getSlot(day, period)
                    const label = period === 'LUNCH' ? 'Midi' : 'Soir'
                    const late  = slot ? (new Date(slot.scheduledDate!) < today && slot.portionsConsumed < slot.portions) : false

                    return (
                      <div key={period} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] w-8 shrink-0" style={{ color: 'var(--muted)' }}>
                          {label}
                        </span>
                        {slot ? (
                          <SlotChip slot={slot} period={period} isLate={late} onSelect={onSelect} />
                        ) : (
                          <span className="font-body text-xs" style={{ color: 'var(--border2)' }}>—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Slots FLOATING */}
          {floating.length > 0 && (
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                À cuisiner ({floating.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {floating.map(slot => {
                  const remaining = slot.portions - slot.portionsConsumed
                  return (
                    <button
                      key={slot.id}
                      onClick={() => onSelect(slot)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left"
                      style={{
                        background: 'var(--accent-dim)',
                        border:     '1px dashed var(--accent)',
                      }}
                    >
                      <span className="font-mono text-sm" style={{ color: 'var(--accent)' }}>〜</span>
                      <span className="flex-1 font-body text-sm truncate" style={{ color: 'var(--accent)' }}>
                        {slot.recipe.title}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {remaining}p
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {dated.length === 0 && floating.length === 0 && (
            <p className="font-mono text-xs p-4 text-center" style={{ color: 'var(--muted)' }}>
              Aucun repas cette semaine
            </p>
          )}
        </div>
      )}
    </div>
  )
}
