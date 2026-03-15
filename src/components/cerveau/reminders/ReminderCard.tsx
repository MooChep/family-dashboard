'use client'

import { useState, type ReactElement } from 'react'
import { type EntryPriority } from '@prisma/client'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticSuccess } from '@/lib/haptics'

// ── Types ──

export interface ReminderEntry {
  id:             string
  content:        string
  assignedTo:     string
  status:         string
  priority:       EntryPriority | null
  dueDate:        string
  recurrenceRule: string | null
  snoozedUntil:   string | null
  updatedAt:      string
}

interface ReminderCardProps {
  entry:     ReminderEntry
  onDone:    (id: string) => void
  onPriority:(id: string, priority: EntryPriority | null) => void
  onDelete:  (id: string) => void
  onSnooze:  (entry: ReminderEntry) => void
  isLast:    boolean
}

// ── Helpers ──

/** Formate l'heure du rappel (HH:MM). */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Formate le jour du rappel (auj./dem./date). */
function formatDay(dateStr: string): string {
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = Math.floor((d.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'auj.'
  if (diff === 1) return 'dem.'
  if (diff < 0)  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Retourne label et couleur CSS d'une priorité. */
function priorityMeta(priority: EntryPriority | null): { label: string; color: string } {
  switch (priority) {
    case 'HIGH':   return { label: '!!!', color: 'var(--cerveau-reminder)' }
    case 'MEDIUM': return { label: '!!',  color: 'color-mix(in srgb, var(--cerveau-reminder) 70%, transparent)' }
    case 'LOW':    return { label: '!',   color: 'var(--muted)' }
    default:       return { label: '',    color: 'var(--muted)' }
  }
}

// ── Composant ──

/**
 * Carte Rappel compacte.
 * Swipe droite → DONE · Swipe gauche → bande priorité + suppression
 * Badge EN RETARD si dueDate dépassée, sinon badge heure.
 */
export function ReminderCard({ entry, onDone, onPriority, onDelete, onSnooze, isLast }: ReminderCardProps): ReactElement {
  const [done, setDone]     = useState(false)
  const { label: prioLabel, color: prioColor } = priorityMeta(entry.priority)
  const overdue = entry.status === 'OPEN' && new Date(entry.dueDate) < new Date()

  function handleDone(): void {
    setDone(true)
    hapticSuccess()
    setTimeout(() => { onDone(entry.id) }, 300)
  }

  // ── Bande gauche : priorités + suppression (identique Todo) ──
  const leftBand = [
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>○</span>,
      label:    'aucune',
      color:    'var(--muted)',
      onAction: () => { onPriority(entry.id, null) },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>!</span>,
      label:    'basse',
      color:    'var(--muted)',
      onAction: () => { onPriority(entry.id, 'LOW') },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'color-mix(in srgb, var(--cerveau-reminder) 70%, transparent)' }}>!!</span>,
      label:    'moy.',
      color:    'color-mix(in srgb, var(--cerveau-reminder) 70%, transparent)',
      onAction: () => { onPriority(entry.id, 'MEDIUM') },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--cerveau-reminder)' }}>!!!</span>,
      label:    'haute',
      color:    'var(--cerveau-reminder)',
      onAction: () => { onPriority(entry.id, 'HIGH') },
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
      <SwipeActions onSwipeRight={handleDone} leftBand={leftBand}>
        <div
          onClick={() => { onSnooze(entry) }}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            padding:    '11px 14px',
            background: overdue
              ? 'color-mix(in srgb, var(--error) 5%, var(--surface))'
              : 'var(--surface)',
            cursor:     'pointer',
          }}
        >
          {/* ── Case à cocher ── */}
          <button
            style={{
              width:        '18px',
              height:       '18px',
              borderRadius: '4px',
              border:       `1.5px solid ${overdue ? 'var(--error)' : 'var(--border)'}`,
              background:   'transparent',
              cursor:       'pointer',
              flexShrink:   0,
              padding:      0,
            }}
            onClick={(e) => { e.stopPropagation(); handleDone() }}
          />

          {/* ── Badge priorité ── */}
          {prioLabel && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '11px',
                color:      prioColor,
                flexShrink: 0,
                minWidth:   '18px',
              }}
            >
              {prioLabel}
            </span>
          )}

          {/* ── Contenu ── */}
          <span
            style={{
              flex:         1,
              fontFamily:   'var(--font-body)',
              fontSize:     '14px',
              color:        'var(--text)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {entry.content.length > 50 ? entry.content.slice(0, 50) + '…' : entry.content}
          </span>

          {/* ── Méta droite ── */}
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {overdue ? (
              <span
                style={{
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '10px',
                  color:        'var(--error)',
                  fontWeight:   700,
                  padding:      '2px 5px',
                  borderRadius: '4px',
                  background:   'color-mix(in srgb, var(--error) 12%, transparent)',
                }}
              >
                EN RETARD
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cerveau-reminder)' }}>
                ⏰ {formatTime(entry.dueDate)}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
              {formatDay(entry.dueDate)}
            </span>
            {entry.recurrenceRule && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cerveau-recur)' }}>
                ↻
              </span>
            )}
            {entry.assignedTo !== 'SHARED' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                {entry.assignedTo === 'ILAN' ? 'Ilan' : 'Camille'}
              </span>
            )}
          </div>
        </div>
      </SwipeActions>
    </div>
  )
}
