'use client'

import { useState, type ReactElement } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticSuccess, hapticLight } from '@/lib/haptics'

// ── Types ──

export interface EventEntry {
  id:         string
  content:    string
  assignedTo: string
  startDate:  string
  endDate:    string | null
  allDay:     boolean
  location:   string | null
  status:     string
  updatedAt:  string
}

interface EventCardProps {
  entry:     EventEntry
  onArchive: (id: string) => void
  onCancel:  (id: string) => void
  onDelete:  (id: string) => void
  onTap:     (entry: EventEntry) => void
  isLast:    boolean
}

// ── Helpers ──

/** Calcule le badge J-X depuis la startDate (comparaison par jour, sans heure). */
function computeJX(startDateStr: string): { label: string; diffDays: number } {
  const start    = new Date(startDateStr)
  const now      = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const nowDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - nowDay.getTime()) / 86400000)

  if (diffDays > 0)  return { label: `J-${diffDays}`,          diffDays }
  if (diffDays === 0) return { label: "Aujourd'hui",             diffDays }
  return                     { label: `J+${Math.abs(diffDays)}`, diffDays }
}

/** Formate la date de début en français (avec ou sans heure). */
function formatStartDate(dateStr: string, allDay: boolean): string {
  const d    = new Date(dateStr)
  const date = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (allDay) return date
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Formate l'heure de fin. */
function formatEndTime(endDateStr: string): string {
  return new Date(endDateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Composant ──

/**
 * Carte Événement compacte.
 * Badge J-X · lieu · durée si endDate.
 * Swipe droite → archive (si passé) · Swipe gauche → annuler · supprimer.
 */
export function EventCard({
  entry,
  onArchive,
  onCancel,
  onDelete,
  onTap,
  isLast,
}: EventCardProps): ReactElement {
  const [done, setDone]                = useState(false)
  const { label: jxLabel, diffDays } = computeJX(entry.startDate)
  const passed = diffDays < 0

  function handleArchive(): void {
    setDone(true)
    hapticSuccess()
    setTimeout(() => { onArchive(entry.id) }, 300)
  }

  const leftBand = [
    {
      icon:     <span style={{ fontSize: '14px' }}>✗</span>,
      label:    'annuler',
      color:    'var(--muted)',
      onAction: () => { hapticLight(); onCancel(entry.id) },
    },
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'suppr.',
      color:    'var(--error)',
      onAction: () => { onDelete(entry.id) },
    },
  ]

  return (
    <div
      style={{
        opacity:      done ? 0 : 1,
        transform:    done ? 'translateY(20px)' : 'none',
        transition:   'opacity 300ms ease-out, transform 300ms ease-out',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <SwipeActions onSwipeRight={passed ? handleArchive : undefined} leftBand={leftBand}>
        <div
          onClick={() => { onTap(entry) }}
          style={{
            display:    'flex',
            alignItems: 'flex-start',
            gap:        '10px',
            padding:    '11px 14px',
            background: 'var(--surface)',
            cursor:     'pointer',
            opacity:    passed ? 0.65 : 1,
          }}
        >
          {/* ── Badge J-X ── */}
          <div
            style={{
              fontFamily:   'var(--font-mono)',
              fontSize:     '10px',
              fontWeight:   700,
              color:        passed
                ? 'var(--muted)'
                : diffDays <= 7
                  ? 'var(--error)'
                  : 'var(--cerveau-event)',
              background:   passed
                ? 'color-mix(in srgb, var(--muted) 12%, transparent)'
                : diffDays <= 7
                  ? 'color-mix(in srgb, var(--error) 12%, transparent)'
                  : 'color-mix(in srgb, var(--cerveau-event) 12%, transparent)',
              padding:      '2px 6px',
              borderRadius: '4px',
              flexShrink:   0,
              marginTop:    '2px',
              whiteSpace:   'nowrap',
            }}
          >
            {jxLabel}
          </div>

          {/* ── Contenu ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                color:        'var(--text)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}
            >
              {entry.content.length > 45 ? entry.content.slice(0, 45) + '…' : entry.content}
            </div>

            {/* ── Date + lieu ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                {formatStartDate(entry.startDate, entry.allDay)}
                {entry.endDate && !entry.allDay && ` → ${formatEndTime(entry.endDate)}`}
              </span>
              {entry.location && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                  📍 {entry.location.length > 22 ? entry.location.slice(0, 22) + '…' : entry.location}
                </span>
              )}
            </div>
          </div>

          {/* ── Assigné (si non Partagé) ── */}
          {entry.assignedTo !== 'SHARED' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '10px',
                color:      'var(--muted)',
                flexShrink: 0,
                marginTop:  '2px',
              }}
            >
              {entry.assignedTo === 'ILAN' ? 'Ilan' : 'Camille'}
            </span>
          )}
        </div>
      </SwipeActions>
    </div>
  )
}
