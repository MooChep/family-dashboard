'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Clock, RefreshCw, CalendarClock } from 'lucide-react'
import { SharedTaskBadge } from './SharedTaskBadge'
import { CompletionButton } from './CompletionButton'
import { SwipeBackground } from './SwipeBackground'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

interface TaskCardProps {
  task:          LabeurTaskWithRelations
  currentUserId: string
  /** Appelé après complétion réussie — refresh seulement, pas d'appel API */
  onComplete:    (taskId: string) => void
}

// Couleur de bordure selon le retard
function overdueColor(daysOverdue: number): string {
  if (daysOverdue >= 3) return 'var(--danger)'
  if (daysOverdue >= 1) return '#f59e0b'
  return 'var(--border)'
}

// Label fréquence lisible
function frequencyLabel(task: LabeurTaskWithRelations): string {
  if (!task.recurrence) return ''
  const f = task.recurrence.frequency
  if (f === 'DAILY')   return 'Quotidienne'
  if (f === 'WEEKLY')  return 'Hebdomadaire'
  if (f === 'MONTHLY') return 'Mensuelle'
  return `Tous les ${task.recurrence.intervalDays ?? '?'} jours`
}

const SWIPE_THRESHOLD = 0.4   // 40 % de la largeur de la carte

/**
 * Carte d'une tâche Labeur.
 * - Bordure ambre si 1–2j retard, rouge si 3j+
 * - Badge partagée + état validation
 * - Fréquence pour les récurrentes, date limite pour les ponctuelles
 * - Bouton « J'ai fait ça » (désactivé si déjà validé)
 * - Swipe vers la droite (touch uniquement) pour valider sans bouton
 */
export function TaskCard({ task, currentUserId, onComplete }: TaskCardProps) {
  const inflationState = task.inflationStates[0]
  const daysOverdue    = inflationState?.daysOverdue ?? 0

  const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
  const alreadyDone   = task.completions.some(
    (c) => c.userId === currentUserId && new Date(c.completedAt) > new Date(instanceStart)
  )
  const isFullyComplete = task.status === 'COMPLETED' && task.type === 'ONESHOT'
  const borderCol       = overdueColor(daysOverdue)

  // ── Swipe state ───────────────────────────────────────────────────────────
  const cardRef      = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<number | null>(null)
  const [swipeX,    setSwipeX]    = useState(0)
  const [swiping,   setSwiping]   = useState(false)
  const [swipeDone, setSwipeDone] = useState(false)

  const canSwipe = !alreadyDone && !isFullyComplete && !swipeDone

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Swipe uniquement sur les appareils touch
    if (!canSwipe || e.pointerType === 'mouse') return
    pointerStart.current = e.clientX
    setSwiping(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return
    const dx = Math.max(0, e.clientX - pointerStart.current)
    setSwipeX(dx)
  }

  async function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return
    const cardWidth = cardRef.current?.offsetWidth ?? 300
    const dx        = Math.max(0, e.clientX - pointerStart.current)

    pointerStart.current = null
    setSwiping(false)
    setSwipeX(0)

    if (dx >= cardWidth * SWIPE_THRESHOLD) {
      if ('vibrate' in navigator) navigator.vibrate(40)
      const res = await fetch(`/api/labeur/tasks/${task.id}/complete`, { method: 'POST' })
      if (res.ok) {
        setSwipeDone(true)
        onComplete(task.id)
      }
      // En cas d'erreur, pas de feedback visible — le bouton reste disponible
    }
  }

  function onPointerCancel() {
    pointerStart.current = null
    setSwiping(false)
    setSwipeX(0)
  }

  const cardWidth      = cardRef.current?.offsetWidth ?? 300
  const swipeProgress  = Math.min(swipeX / (cardWidth * SWIPE_THRESHOLD), 1)

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ border: `1px solid ${borderCol}` }}
    >
      {/* Fond vert visible pendant le swipe */}
      {swiping && <SwipeBackground progress={swipeProgress} />}

      {/* Contenu de la carte, translateX pendant le swipe */}
      <div
        ref={cardRef}
        className="relative p-4 flex gap-3"
        style={{
          backgroundColor: swipeDone ? 'rgba(34,197,94,0.08)' : 'var(--surface)',
          transform:        `translateX(${swipeX}px)`,
          transition:       swiping ? 'none' : 'transform 0.25s ease, background-color 0.3s',
          touchAction:      'pan-y',
          userSelect:       'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Icône type */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--surface2)' }}
        >
          {task.type === 'RECURRING'
            ? <RefreshCw    size={16} style={{ color: 'var(--accent)' }} />
            : <CalendarClock size={16} style={{ color: 'var(--muted)' }} />
          }
        </div>

        {/* Corps */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/labeur/taches/${task.id}`}
              className="text-sm font-semibold hover:underline leading-tight"
              style={{ color: 'var(--text)' }}
            >
              {task.title}
            </Link>
            <span
              className="text-sm font-mono font-bold shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              {task.ecuValue} écu
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {task.type === 'RECURRING' && task.recurrence && (
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <RefreshCw size={8} />
                {frequencyLabel(task)}
              </span>
            )}
            {task.type === 'ONESHOT' && task.dueDate && (
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Clock size={8} />
                {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.isShared && (
              <SharedTaskBadge task={task} currentUserId={currentUserId} />
            )}
            {daysOverdue > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: borderCol }}>
                {daysOverdue}j de retard
                {inflationState && <> · +{Math.round(inflationState.inflationPercent)} %</>}
              </span>
            )}
          </div>
        </div>

        {/* Bouton complétion (ou état fait) */}
        <div className="shrink-0 self-center">
          {!isFullyComplete && (
            <CompletionButton
              taskId={task.id}
              disabled={alreadyDone || swipeDone}
              onSuccess={onComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
