'use client'

import { useState, type ReactElement } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticSuccess, hapticLight } from '@/lib/haptics'

// ── Types ──

export interface DiscussionEntry {
  id:               string
  content:          string
  description:      string | null
  isUrgent:         boolean
  authorId:         string
  createdAt:        string
  updatedAt:        string
  enrichNotifiedAt: string | null
}

interface DiscussionCardProps {
  entry:        DiscussionEntry
  onDone:       (id: string) => void
  onConvertTodo:(id: string) => void
  onConvertProject:(id: string) => void
  onDelete:     (id: string) => void
  onTap:        (entry: DiscussionEntry) => void
  isLast:       boolean
}

// ── Helpers ──

/** Formate l'âge de la discussion (aujourd'hui, X jours). */
function formatAge(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return '1 jour'
  return `${diff} jours`
}

// ── Composant ──

/**
 * Carte Discussion compacte.
 * Swipe droite → "on en a parlé" (DELETE) · Swipe gauche → Todo | Projet | Suppr.
 * Badge urgence visible si isUrgent, description tronquée si présente.
 */
export function DiscussionCard({
  entry,
  onDone,
  onConvertTodo,
  onConvertProject,
  onDelete,
  onTap,
  isLast,
}: DiscussionCardProps): ReactElement {
  const [done, setDone] = useState(false)

  function handleDone(): void {
    setDone(true)
    hapticSuccess()
    setTimeout(() => { onDone(entry.id) }, 300)
  }

  // ── Bande gauche : conversion rapide + suppression ──
  const leftBand = [
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>◻</span>,
      label:    'Todo',
      color:    'var(--cerveau-todo)',
      onAction: () => { hapticLight(); onConvertTodo(entry.id) },
    },
    {
      icon:     <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>.</span>,
      label:    'Projet',
      color:    'var(--cerveau-project)',
      onAction: () => { hapticLight(); onConvertProject(entry.id) },
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
          onClick={() => { onTap(entry) }}
          style={{
            display:    'flex',
            alignItems: 'flex-start',
            gap:        '10px',
            padding:    '11px 14px',
            background: entry.isUrgent
              ? 'color-mix(in srgb, var(--error) 4%, var(--surface))'
              : 'var(--surface)',
            cursor:     'pointer',
            borderLeft: entry.isUrgent ? '3px solid var(--error)' : '3px solid transparent',
          }}
        >
          {/* ── Icône type ── */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '13px',
              color:      'var(--cerveau-discussion)',
              flexShrink: 0,
              marginTop:  '1px',
            }}
          >
            ◈
          </span>

          {/* ── Contenu ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2">
              {entry.isUrgent && (
                <span
                  style={{
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '10px',
                    color:        'var(--error)',
                    fontWeight:   700,
                    padding:      '1px 5px',
                    borderRadius: '4px',
                    background:   'color-mix(in srgb, var(--error) 12%, transparent)',
                    flexShrink:   0,
                  }}
                >
                  !!
                </span>
              )}
              <span
                style={{
                  fontFamily:   'var(--font-body)',
                  fontSize:     '14px',
                  color:        'var(--text)',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}
              >
                {entry.content.length > 48 ? entry.content.slice(0, 48) + '…' : entry.content}
              </span>
            </div>

            {/* ── Description tronquée ── */}
            {entry.description && (
              <div
                style={{
                  fontFamily:   'var(--font-body)',
                  fontSize:     '12px',
                  color:        'var(--muted)',
                  marginTop:    '2px',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}
              >
                {entry.description.length > 60
                  ? entry.description.slice(0, 60) + '…'
                  : entry.description}
              </div>
            )}
          </div>

          {/* ── Méta droite ── */}
          <div
            style={{
              display:    'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap:        '2px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
              {formatAge(entry.createdAt)}
            </span>
          </div>
        </div>
      </SwipeActions>
    </div>
  )
}
