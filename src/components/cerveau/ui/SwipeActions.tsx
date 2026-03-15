'use client'

import {
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type TouchEvent,
} from 'react'
import { hapticLight } from '@/lib/haptics'

// ── Types ──

export interface SwipeAction {
  icon:     ReactNode
  label:    string
  /** Variable CSS ou valeur de couleur directe */
  color:    string
  onAction: () => void
}

interface SwipeActionsProps {
  children:      ReactNode
  /** Action directe déclenchée au swipe droite (ex: DONE, archiver) */
  onSwipeRight?: () => void
  /** Bande d'actions révélée au swipe gauche (priorité, suppression…) */
  leftBand?:     SwipeAction[]
}

// ── Constantes ──

const SWIPE_THRESHOLD    = 60   // px minimum pour déclencher
const BAND_SLOT_MIN_W    = 56   // px minimum par bouton dans la bande
const BAND_REVEAL_OFFSET = 180  // px de translation quand la bande est révélée

/**
 * Wrapper qui ajoute des actions swipe à n'importe quelle carte.
 * - Swipe droite  → `onSwipeRight()` (action directe)
 * - Swipe gauche  → révèle `leftBand` (bande de boutons)
 */
export function SwipeActions({
  children,
  onSwipeRight,
  leftBand,
}: SwipeActionsProps): ReactElement {
  // ── State ──
  const [offset, setOffset]         = useState(0)
  const [isSwiping, setIsSwiping]   = useState(false)
  const [bandOpen, setBandOpen]     = useState(false)

  // ── Refs ──
  const startXRef  = useRef(0)
  const startYRef  = useRef(0)
  const lockedRef  = useRef<'h' | 'v' | null>(null)  // axe verrouillé

  // ── Helpers ──
  function reset(): void {
    setOffset(0)
    setIsSwiping(false)
    setBandOpen(false)
    lockedRef.current = null
  }

  // ── Touch handlers ──
  function handleTouchStart(e: TouchEvent<HTMLDivElement>): void {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    lockedRef.current = null
    setIsSwiping(true)
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>): void {
    if (!isSwiping) return

    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    // Verrouillage d'axe au premier déplacement significatif
    if (!lockedRef.current) {
      if (Math.abs(dx) > Math.abs(dy) + 5) {
        lockedRef.current = 'h'
      } else if (Math.abs(dy) > Math.abs(dx) + 5) {
        lockedRef.current = 'v'
      }
    }

    if (lockedRef.current !== 'h') return

    // Empêche le scroll pendant un swipe horizontal
    e.preventDefault()

    if (dx > 0 && onSwipeRight) {
      // Swipe droite — résistance progressive au-delà du seuil
      setOffset(Math.min(dx, SWIPE_THRESHOLD * 2))
    } else if (dx < 0 && leftBand?.length) {
      // Swipe gauche — suit le doigt jusqu'à la largeur de la bande
      setOffset(Math.max(dx, -BAND_REVEAL_OFFSET))
    }
  }

  function handleTouchEnd(): void {
    if (lockedRef.current !== 'h') {
      setIsSwiping(false)
      lockedRef.current = null
      return
    }

    if (offset >= SWIPE_THRESHOLD && onSwipeRight) {
      // ── Swipe droite validé — le callback gère son propre haptic ──
      reset()
      onSwipeRight()
    } else if (offset <= -SWIPE_THRESHOLD && leftBand?.length) {
      // ── Swipe gauche → ouvre la bande ──
      hapticLight()
      setOffset(-BAND_REVEAL_OFFSET)
      setBandOpen(true)
      setIsSwiping(false)
      lockedRef.current = null
    } else {
      // ── Pas assez de déplacement → retour ──
      reset()
    }
  }

  // ── Calcul de la largeur de la bande ──
  const bandWidth = leftBand
    ? Math.max(leftBand.length * BAND_SLOT_MIN_W, BAND_REVEAL_OFFSET)
    : 0

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ── Bande d'actions gauche (révélée au swipe gauche) ── */}
      {leftBand && leftBand.length > 0 && (
        <div
          className="flex items-stretch absolute inset-y-0 right-0"
          style={{
            width:      `${bandWidth}px`,
            background: 'var(--surface2)',
          }}
        >
          {leftBand.map((action, i) => (
            <button
              key={i}
              className="flex flex-col items-center justify-center flex-1 gap-1"
              style={{
                minWidth:   `${BAND_SLOT_MIN_W}px`,
                color:       action.color,
                border:      'none',
                background:  'transparent',
                cursor:      'pointer',
                padding:     '0 8px',
              }}
              onClick={() => {
                action.onAction()
                reset()
              }}
            >
              {action.icon}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Contenu de la carte ── */}
      <div
        style={{
          transform:  `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 200ms ease',
          position:   'relative',
          zIndex:     1,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={bandOpen ? reset : undefined}
      >
        {children}
      </div>
    </div>
  )
}
