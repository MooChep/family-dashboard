'use client'

import { useRef, useState } from 'react'

const THRESHOLD = 72

interface SwipeItemProps {
  onSwipeRight: () => void
  onSwipeLeft:  () => void
  purchased:    boolean
  children:     React.ReactNode
}

/**
 * Conteneur swipeable pour un article de courses.
 * Swipe droite → acheté tel quel
 * Swipe gauche → quantité personnalisée (Quick Actions)
 */
export function SwipeItem({ onSwipeRight, onSwipeLeft, purchased, children }: SwipeItemProps) {
  const startX  = useRef(0)
  const [delta,   setDelta]   = useState(0)
  const [moving,  setMoving]  = useState(false)
  const [settled, setSettled] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    if (purchased) return
    startX.current = e.touches[0].clientX
    setMoving(true)
    setSettled(false)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (purchased || !moving) return
    const d = e.touches[0].clientX - startX.current
    setDelta(d)
  }

  function handleTouchEnd() {
    if (purchased) return
    setMoving(false)
    setSettled(true)
    if (delta > THRESHOLD) {
      onSwipeRight()
    } else if (delta < -THRESHOLD) {
      onSwipeLeft()
    }
    setDelta(0)
  }

  const revealColor = delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--accent)' : 'transparent'

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Couleur de fond révélée par le swipe */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: revealColor,
          transition: settled ? 'background 0.2s' : 'none',
        }}
      />
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform:  `translateX(${delta}px)`,
          transition: moving ? 'none' : 'transform 0.2s ease-out',
          position:   'relative',
          opacity:    purchased ? 0.4 : 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}
