'use client'

import { useState, type ReactElement } from 'react'
import { type EntryPriority } from '@prisma/client'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticSuccess } from '@/lib/haptics'

// ── Types ──

export interface TodoEntry {
  id:         string
  content:    string
  assignedTo: string
  isUrgent:   boolean
  priority:   EntryPriority | null
  dueDate:    string | null
  updatedAt:  string
}

interface TodoCardProps {
  entry:     TodoEntry
  onDone:    (id: string) => void
  onPriority:(id: string, priority: EntryPriority | null) => void
  onDelete:  (id: string) => void
  onTap:     (entry: TodoEntry) => void
  isLast:    boolean
}

// ── Helpers ──

/** Retourne le label et la couleur CSS d'une priorité. */
function priorityMeta(priority: EntryPriority | null): { label: string; color: string } {
  switch (priority) {
    case 'HIGH':   return { label: '!!!', color: 'var(--cerveau-todo)' }
    case 'MEDIUM': return { label: '!!',  color: 'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)' }
    case 'LOW':    return { label: '!',   color: 'var(--muted)' }
    default:       return { label: '',    color: 'var(--muted)' }
  }
}

/** Formate la date d'échéance pour affichage compact. */
function formatDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0)  return 'retard'
  if (days === 0) return 'auj.'
  if (days === 1) return 'dem.'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Retourne true si la date est dépassée. */
function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ── Composant ──

/** Carte Todo compacte avec swipe actions (droite → DONE, gauche → bande priorité). */
export function TodoCard({ entry, onDone, onPriority, onDelete, onTap, isLast }: TodoCardProps): ReactElement {
  const [done, setDone]     = useState(false)
  const { label: prioLabel, color: prioColor } = priorityMeta(entry.priority)
  const due      = formatDue(entry.dueDate)
  const overdue  = isOverdue(entry.dueDate)

  function handleDone(): void {
    setDone(true)
    hapticSuccess()
    setTimeout(() => { onDone(entry.id) }, 300)
  }

  // ── Bande gauche : priorités + suppression ──
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
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)' }}>!!</span>,
      label:    'moy.',
      color:    'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)',
      onAction: () => { onPriority(entry.id, 'MEDIUM') },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--cerveau-todo)' }}>!!!</span>,
      label:    'haute',
      color:    'var(--cerveau-todo)',
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
        opacity:    done ? 0 : 1,
        transform:  done ? 'translateY(20px)' : 'none',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <SwipeActions onSwipeRight={handleDone} leftBand={leftBand}>
        <div
          onClick={() => { onTap(entry) }}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '10px',
            padding:     '11px 14px',
            background:  'var(--surface)',
            cursor:      'pointer',
            borderLeft:  '3px solid var(--cerveau-todo)',
          }}
        >
          {/* ── Case à cocher ── */}
          <button
            style={{
              width:        '18px',
              height:       '18px',
              borderRadius: '4px',
              border:       '1.5px solid var(--border)',
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
            {entry.isUrgent && (
              <span style={{ color: 'var(--error)', marginRight: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                !!{' '}
              </span>
            )}
            {entry.content.length > 55 ? entry.content.slice(0, 55) + '…' : entry.content}
          </span>

          {/* ── Méta droite ── */}
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {due && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '10px',
                  color:      overdue ? 'var(--error)' : 'var(--muted)',
                  fontWeight: overdue ? 700 : 400,
                }}
              >
                {due}
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
