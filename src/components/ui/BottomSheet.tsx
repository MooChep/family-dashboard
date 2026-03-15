'use client'

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type TouchEvent,
} from 'react'

interface BottomSheetProps {
  isOpen:        boolean
  onClose:       () => void
  children:      ReactNode
  /** true → ne pas scroll-to-top si un champ est actif (keyboard reste ouvert) */
  keepKeyboard?: boolean
}

/**
 * Sheet générique qui monte depuis le bas de l'écran.
 * Ouverture : translateY(100% → 0) 300ms ease-out
 * Fermeture  : translateY(0 → 100%) 250ms ease-in, puis unmount
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
}: BottomSheetProps): ReactElement | null {
  // ── Gestion du cycle mount / animation ──
  const [isMounted, setIsMounted]   = useState(false)
  const [isVisible, setIsVisible]   = useState(false)

  // ── Drag-to-close ──
  const dragStartYRef = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  function handleDragStart(e: TouchEvent<HTMLDivElement>): void {
    dragStartYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function handleDragMove(e: TouchEvent<HTMLDivElement>): void {
    const dy = e.touches[0].clientY - dragStartYRef.current
    if (dy > 0) setDragOffset(dy)
  }

  function handleDragEnd(): void {
    if (dragOffset > 60) {
      onClose()
    }
    setDragOffset(0)
    setIsDragging(false)
  }

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      // Délai minimal pour que le navigateur paint le translateY(100%) initial
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true))
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => setIsMounted(false), 260)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ── Escape ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ── Overflow body ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isMounted) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{
        backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)',
        transition: 'background-color 300ms ease',
      }}
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full"
        style={{
          background:    'var(--surface)',
          borderTop:     '1px solid var(--border)',
          borderRadius:  '16px 16px 0 0',
          maxHeight:     '90dvh',
          overflowY:     'auto',
          transform:     isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transition:    isDragging ? 'none' : isVisible
            ? 'transform 300ms ease-out'
            : 'transform 250ms ease-in',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle — zone de drag-to-close */}
        <div
          className="flex justify-center pt-3 pb-1"
          style={{ cursor: 'grab', touchAction: 'none' }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div
            style={{
              width:        '40px',
              height:       '4px',
              borderRadius: '2px',
              background:   'var(--border)',
            }}
          />
        </div>

        {children}
      </div>
    </div>
  )
}
