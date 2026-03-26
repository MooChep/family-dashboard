'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  onSwipeLeft: () => void
  onSwipeRight?: () => void
  leftLabel: string
  rightLabel?: string
  leftColor: string
  rightColor?: string
  leftLabelColor?: string
  rightLabelColor?: string
  children: React.ReactNode
}

const TRIGGER_THRESHOLD = 120
const REVEAL_THRESHOLD = 60
const START_THRESHOLD = 20

export function SwipeableCard({
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  leftLabelColor  = 'text-white',
  rightLabelColor = 'text-white',
  children,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [triggered, setTriggered] = useState(false)
  const cardRef    = useRef<HTMLDivElement>(null)
  const startXRef  = useRef(0)
  const startYRef  = useRef(0)
  const lockedRef  = useRef<'h' | 'v' | null>(null)
  const didDragRef = useRef(false)  // true when horizontal move > 10px; suppresses click

  function handlePointerDown(e: React.PointerEvent) {
    // Disable swipe on desktop
    if (window.matchMedia('(min-width: 768px)').matches) return
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    lockedRef.current  = null
    didDragRef.current = false
    setIsDragging(true)
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current

    // Determine scroll direction lock
    if (!lockedRef.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > START_THRESHOLD) {
        lockedRef.current = 'h'
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > START_THRESHOLD) {
        lockedRef.current = 'v'
      }
    }

    if (lockedRef.current !== 'h') return

    // Track that a horizontal drag occurred (suppress resulting click)
    if (Math.abs(dx) > 10) didDragRef.current = true

    // No right swipe if no right action
    if (dx > 0 && !onSwipeRight) return

    e.preventDefault()
    setOffsetX(dx)

    // Haptic feedback at trigger threshold
    if (!triggered && Math.abs(dx) >= TRIGGER_THRESHOLD) {
      setTriggered(true)
      navigator.vibrate?.(10)
    } else if (triggered && Math.abs(dx) < TRIGGER_THRESHOLD) {
      setTriggered(false)
    }
  }

  function handlePointerUp() {
    if (!isDragging) return
    setIsDragging(false)
    lockedRef.current = null
    setTriggered(false)

    if (offsetX <= -TRIGGER_THRESHOLD) {
      onSwipeLeft()
    } else if (offsetX >= TRIGGER_THRESHOLD && onSwipeRight) {
      onSwipeRight()
    }

    setOffsetX(0)
  }

  const showLeft = offsetX < -REVEAL_THRESHOLD
  const showRight = offsetX > REVEAL_THRESHOLD

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left background (archive) */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-end pr-6 transition-opacity duration-150 rounded-xl',
          leftColor,
          showLeft ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className={cn('font-semibold text-sm tracking-wide', leftLabelColor)}>{leftLabel}</span>
      </div>

      {/* Right background (action) */}
      {rightColor && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-start pl-6 transition-opacity duration-150 rounded-xl',
            rightColor,
            showRight ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className={cn('font-semibold text-sm tracking-wide', rightLabelColor)}>{rightLabel}</span>
        </div>
      )}

      {/* Card content */}
      <div
        ref={cardRef}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
        onClick={e => {
          if (didDragRef.current) {
            e.stopPropagation()
            didDragRef.current = false
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  )
}
