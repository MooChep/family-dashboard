'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export type CarouselDaySlot = {
  id:          string
  recipeTitle: string
  recipeImage: string | null
}

export type CarouselDay = {
  isoDate: string
  isToday: boolean
  lunch:   CarouselDaySlot | null
  dinner:  CarouselDaySlot | null
}

export type CarouselFloating = {
  id:          string
  recipeTitle: string
}

interface MenuCarouselProps {
  days:     CarouselDay[]
  floating: CarouselFloating[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

/**
 * Carousel "Le Menu" — client component pour le scrollIntoView du jour courant.
 * Carte du jour : min-width 280px + bordure accent. Autres : 200px.
 */
export function MenuCarousel({ days, floating }: MenuCarouselProps) {
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
      {days.map(day => {
        const isToday = day.isToday

        return (
          <div
            key={day.isoDate}
            ref={isToday ? todayRef : undefined}
            className="shrink-0 rounded-2xl overflow-hidden snap-start flex flex-col"
            style={{
              minWidth:   isToday ? 172 : 148,
              minHeight:  isToday ? 180 : 148,
              background: isToday ? 'var(--accent-dim)' : 'var(--surface)',
              border:     `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {/* Header jour */}
            <div
              className="px-3 py-2"
              style={{ borderBottom: '1px solid var(--border)', background: isToday ? 'var(--accent)' : 'var(--surface2)' }}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: isToday ? '#fff' : 'var(--text2)' }}>
                {formatDate(day.isoDate)}
              </p>
            </div>

            {/* Slots */}
            <div className="flex flex-col gap-1.5 p-2 flex-1">
              {(['lunch', 'dinner'] as const).map(period => {
                const slot  = day[period]
                const label = period === 'lunch' ? 'Midi' : 'Soir'
                return (
                  <div key={period}>
                    <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted)' }}>
                      {label}
                    </p>
                    {slot ? (
                      <Link href="/gamelle/menu">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ width: 20, height: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                          >
                            {slot.recipeImage ? (
                              <img src={`${UPLOAD_BASE}/${slot.recipeImage}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-display text-[8px] font-bold" style={{ color: 'var(--muted)' }}>
                                {slot.recipeTitle.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-body text-[10px] leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                            {slot.recipeTitle}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <span className="font-body text-[10px]" style={{ color: 'var(--border2)' }}>— Libre</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Slots volants */}
      {floating.length > 0 && (
        <div
          className="shrink-0 rounded-2xl overflow-hidden snap-start flex flex-col"
          style={{ minWidth: 148, background: 'var(--surface)', border: '1px dashed var(--accent)' }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-dim)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--accent)' }}>
              À cuisiner
            </p>
          </div>
          <div className="flex flex-col gap-1 p-2">
            {floating.slice(0, 3).map(slot => (
              <Link key={slot.id} href="/gamelle/menu">
                <p className="font-body text-[10px] line-clamp-1" style={{ color: 'var(--accent)' }}>
                  〜 {slot.recipeTitle}
                </p>
              </Link>
            ))}
            {floating.length > 3 && (
              <p className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>
                +{floating.length - 3} de plus
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
