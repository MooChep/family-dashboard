'use client'

import { useState, type ReactElement } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { ProjectProgress } from './ProjectProgress'
import { hapticSuccess } from '@/lib/haptics'

// ── Types ──

export interface ProjectEntry {
  id:         string
  content:    string
  assignedTo: string
  dueDate:    string | null
  status:     string
  updatedAt:  string
  /** Nombre d'entrées completables terminées (status DONE ou CANCELLED, type !== NOTE). */
  doneCount:  number
  /** Nombre total d'entrées completables (type !== NOTE). */
  totalCount: number
}

interface ProjectCardProps {
  entry:    ProjectEntry
  onDone:   (id: string) => void
  onPause:  (id: string) => void
  onDelete: (id: string) => void
  onTap:    (entry: ProjectEntry) => void
  isLast:   boolean
}

// ── Helpers ──

/** Formate la date de fin du projet de manière compacte. */
function formatDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Retourne true si la date est dépassée. */
function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ── Composant ──

/**
 * Carte Projet compacte avec barre de progression.
 * Swipe droite → DONE, gauche → bande ⏸ pause · ✓ terminer · 🗑 supprimer.
 */
export function ProjectCard({ entry, onDone, onPause, onDelete, onTap, isLast }: ProjectCardProps): ReactElement {
  const [leaving, setLeaving] = useState(false)

  function handleDone(): void {
    setLeaving(true)
    hapticSuccess()
    setTimeout(() => { onDone(entry.id) }, 300)
  }

  // ── Bande gauche ──
  const leftBand = [
    {
      icon:     <span style={{ fontSize: '16px' }}>⏸</span>,
      label:    'pause',
      color:    'var(--muted)',
      onAction: () => { onPause(entry.id) },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--cerveau-project)' }}>✓</span>,
      label:    'terminer',
      color:    'var(--cerveau-project)',
      onAction: handleDone,
    },
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'supprimer',
      color:    'var(--error)',
      onAction: () => { onDelete(entry.id) },
    },
  ]

  const due    = formatDue(entry.dueDate)
  const past   = isPast(entry.dueDate)
  const paused = entry.status === 'PAUSED'

  return (
    <div
      style={{
        opacity:      leaving ? 0 : 1,
        transform:    leaving ? 'translateY(20px)' : 'none',
        transition:   'opacity 300ms ease-out, transform 300ms ease-out',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <SwipeActions onSwipeRight={handleDone} leftBand={leftBand}>
        <div
          onClick={() => { onTap(entry) }}
          style={{
            padding:    '12px 14px',
            background: 'var(--surface)',
            cursor:     'pointer',
            opacity:    paused ? 0.6 : 1,
          }}
        >
          {/* ── Ligne principale ── */}
          <div className="flex items-center gap-2" style={{ marginBottom: '7px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '14px',
                color:      paused ? 'var(--muted)' : 'var(--cerveau-project)',
                flexShrink: 0,
              }}
            >
              ◈
            </span>

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
              {entry.content}
            </span>

            {/* ── Badge pause ── */}
            {paused && (
              <span
                style={{
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '10px',
                  color:        'var(--muted)',
                  background:   'var(--surface2)',
                  padding:      '1px 6px',
                  borderRadius: '8px',
                  flexShrink:   0,
                }}
              >
                pause
              </span>
            )}

            {/* ── Date de fin ── */}
            {due && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '10px',
                  color:      past ? 'var(--error)' : 'var(--muted)',
                  fontWeight: past ? 700 : 400,
                  flexShrink: 0,
                }}
              >
                {due}
              </span>
            )}
          </div>

          {/* ── Barre de progression ── */}
          <ProjectProgress done={entry.doneCount} total={entry.totalCount} />
        </div>
      </SwipeActions>
    </div>
  )
}
