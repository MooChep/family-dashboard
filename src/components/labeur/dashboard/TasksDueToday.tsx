'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Clock, Users, AlertTriangle, Swords } from 'lucide-react'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'
import { useSession } from 'next-auth/react'
import { SwipeBackground } from '@/components/labeur/tasks/SwipeBackground'

interface TasksDueTodayProps {
  tasks:      LabeurTaskWithRelations[]
  onComplete: (taskId: string) => Promise<void>
}

const SWIPE_THRESHOLD = 0.4

/**
 * Liste des tâches du jour (échues aujourd'hui ou en retard).
 * Triées par contribution à l'inflation décroissante.
 * Supporte le swipe vers la droite (touch) pour valider sans bouton.
 */
export function TasksDueToday({ tasks, onComplete }: TasksDueTodayProps) {
  const { data: session } = useSession()
  const [completing,  setCompleting]  = useState<string | null>(null)
  const [locallyDone, setLocallyDone] = useState<Set<string>>(new Set())

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-6 flex flex-col items-center gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Swords size={24} style={{ color: 'var(--muted)' }} />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucune tâche en attente — le fief est en ordre !
        </span>
      </div>
    )
  }

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    try {
      await onComplete(taskId)
      setLocallyDone((prev) => new Set([...prev, taskId]))
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => {
        const inflationState = task.inflationStates[0]
        const daysOverdue    = inflationState?.daysOverdue ?? 0
        const isOverdue      = daysOverdue > 0
        const overdueColor   = daysOverdue >= 3 ? 'var(--danger)' : daysOverdue >= 1 ? '#f59e0b' : 'var(--muted)'

        const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
        const alreadyDone   = locallyDone.has(task.id) || task.completions.some(
          (c) => c.userId === session?.user?.id && new Date(c.completedAt) > new Date(instanceStart)
        )

        return (
          <SwipeableTaskRow
            key={task.id}
            task={task}
            alreadyDone={alreadyDone}
            isOverdue={isOverdue}
            overdueColor={overdueColor}
            daysOverdue={daysOverdue}
            inflationState={inflationState}
            completing={completing}
            onComplete={handleComplete}
          />
        )
      })}
    </div>
  )
}

// ── Sous-composant pour isoler l'état swipe par carte ─────────────────────────

interface RowProps {
  task:          LabeurTaskWithRelations
  alreadyDone:   boolean
  isOverdue:     boolean
  overdueColor:  string
  daysOverdue:   number
  inflationState: LabeurTaskWithRelations['inflationStates'][0] | undefined
  completing:    string | null
  onComplete:    (taskId: string) => Promise<void>
}

function SwipeableTaskRow({
  task, alreadyDone, isOverdue, overdueColor, daysOverdue,
  inflationState, completing, onComplete,
}: RowProps) {
  const cardRef      = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<number | null>(null)
  const [swipeX,    setSwipeX]    = useState(0)
  const [swiping,   setSwiping]   = useState(false)
  const [swipeDone, setSwipeDone] = useState(false)

  const isDone    = alreadyDone || swipeDone
  const canSwipe  = !isDone && completing !== task.id

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canSwipe || e.pointerType === 'mouse') return
    pointerStart.current = e.clientX
    setSwiping(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return
    setSwipeX(Math.max(0, e.clientX - pointerStart.current))
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
      setSwipeDone(true)
      await onComplete(task.id)
    }
  }

  function onPointerCancel() {
    pointerStart.current = null
    setSwiping(false)
    setSwipeX(0)
  }

  const cardWidth     = cardRef.current?.offsetWidth ?? 300
  const swipeProgress = Math.min(swipeX / (cardWidth * SWIPE_THRESHOLD), 1)

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ border: `1px solid ${isOverdue ? overdueColor + '40' : 'var(--border)'}` }}
    >
      {swiping && <SwipeBackground progress={swipeProgress} />}

      <div
        ref={cardRef}
        className="relative p-4 flex items-center gap-3"
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
        {/* Indicateur de retard */}
        <div className="shrink-0">
          {isOverdue
            ? <AlertTriangle size={16} style={{ color: overdueColor }} />
            : <Clock         size={16} style={{ color: 'var(--muted)' }} />
          }
        </div>

        {/* Infos tâche */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/labeur/taches/${task.id}`}
              className="text-sm font-medium truncate hover:underline"
              style={{ color: 'var(--text)' }}
            >
              {task.title}
            </Link>
            {task.isShared && (
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Users size={9} />
                Partagée
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              {task.ecuValue} écu
            </span>
            {isOverdue && (
              <span className="text-xs" style={{ color: overdueColor }}>
                {daysOverdue}j de retard
                {inflationState && <> · +{Math.round(inflationState.inflationPercent)} % inflation</>}
              </span>
            )}
            {task.status === 'PARTIALLY_DONE' && (
              <span className="text-xs" style={{ color: '#f59e0b' }}>
                En attente du second membre
              </span>
            )}
          </div>
        </div>

        {/* Bouton complétion */}
        {!isDone ? (
          <button
            onClick={() => onComplete(task.id)}
            disabled={completing === task.id}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
            {completing === task.id ? '…' : 'J\'ai fait ça'}
          </button>
        ) : (
          <span
            className="shrink-0 text-xs px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
          >
            ✓ Fait
          </span>
        )}
      </div>
    </div>
  )
}
