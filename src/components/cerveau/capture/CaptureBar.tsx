'use client'

import { useRef, useState, useEffect, type ReactElement, type CSSProperties } from 'react'
import { Paperclip, Tag, Calendar } from 'lucide-react'
import { type EntryType } from '@prisma/client'
import { parseInlineShortcuts } from '@/lib/cerveau/parser'
import { classifyEntryAction } from '@/lib/cerveau/actions'
import { TypeBadge } from '@/components/cerveau/ui/TypeBadge'

// ── Props ──

export interface CaptureBarProps {
  /** Appelé quand l'utilisateur valide (Entrée ou ENVOYER). Reçoit le texte brut et le type détecté. */
  onSubmit:           (text: string, predictedType: EntryType | null) => void
  onAttachmentClick?: () => void
  onTagClick?:        () => void
  onDateClick?:       () => void
  /** Si fourni, applique les corrections NLP apprises de cet utilisateur. */
  userId?:            string
}

// ── Shortcut highlight ──

/**
 * Règles de coloration des raccourcis inline, dans l'ordre de priorité.
 * Chaque tuple : [pattern avec 1 groupe capturant, variable CSS couleur]
 */
const HIGHLIGHT_RULES: Array<[RegExp, string]> = [
  [/(\*\S+)/g,                                            'var(--cerveau-template)'],
  [/(\+liste:\S+)/gi,                                     'var(--success)'         ],
  [/(\.(?:[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]\S*))/g,                     'var(--cerveau-project)' ],
  [/(@\w+)/g,                                             'var(--cerveau-assign)'  ],
  [/(#[\wÀ-ÿ]+)/g,                                        'var(--cerveau-tag)'     ],
  [/(!{1,3})(?!\w)/g,                                     'var(--warning)'         ],
  [/(\/[^\s/]\S*)/g,                                      'var(--cerveau-date)'    ],
  [/(~\S+)/g,                                             'var(--cerveau-recur)'   ],
  [/(\^\S+)/g,                                            'var(--muted)'           ],
]

const PLACEHOLDER = 'Capture une pensée…'

/**
 * Construit le HTML colorisé pour l'overlay transparent positionné sur la textarea.
 * Les raccourcis inline sont enveloppés dans des spans colorés.
 * Quand le texte est vide, affiche le placeholder dans la couleur muted.
 */
function buildHighlightedHtml(raw: string): string {
  if (!raw) {
    return `<span style="color:var(--muted)">${PLACEHOLDER}</span>\u00a0`
  }

  // Échappement HTML minimal
  let html = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Application des règles — $1 = groupe capturant de chaque pattern
  for (const [pattern, color] of HIGHLIGHT_RULES) {
    html = html.replace(pattern, `<span style="color:${color}">$1</span>`)
  }

  // Espace insécable final pour éviter le collapse de la dernière ligne dans le div
  return html + '\u00a0'
}

// ── Styles partagés overlay / textarea ──
// Les deux éléments doivent avoir exactement les mêmes dimensions et typo
// pour que le texte de l'overlay soit aligné pixel-perfect avec le curseur.

const SHARED_INPUT: CSSProperties = {
  fontFamily:   'var(--font-body)',
  fontSize:     '15px',
  lineHeight:   '1.5',
  padding:      '0',
  margin:       '0',
  border:       'none',
  outline:      'none',
  width:        '100%',
  whiteSpace:   'pre-wrap',
  wordBreak:    'break-word',
  overflowWrap: 'break-word',
}

// ── Composant principal ──

/**
 * Barre de capture — point d'entrée unique du module Cerveau.
 *
 * - Auto-focus au montage
 * - Coloration temps réel des raccourcis inline via overlay transparent
 * - Badge type détecté dès 3 caractères (inline shortcuts d'abord, NLP ensuite)
 * - Validation par Entrée (sans Shift) ou bouton ENVOYER
 */
export function CaptureBar({
  onSubmit,
  onAttachmentClick,
  onTagClick,
  onDateClick,
  userId,
}: CaptureBarProps): ReactElement {
  const [text, setText]               = useState('')
  const [detectedType, setDetectedType] = useState<EntryType | null>(null)
  const [isSendHovered, setIsSendHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Auto-focus au montage ──
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // ── Auto-resize (hauteur suit le contenu) ──
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  // ── Détection du type ──
  useEffect(() => {
    if (text.length < 3) {
      setDetectedType(null)
      return
    }

    // Couche 1 — raccourcis inline (synchrone, priorité absolue)
    const parsed = parseInlineShortcuts(text)
    if (parsed.detectedType) {
      setDetectedType(parsed.detectedType)
      return
    }

    // Couche 2 — NLP via server action (debounce 300ms)
    const timer = setTimeout(() => {
      void classifyEntryAction(text, userId).then(({ topType }) => {
        setDetectedType(topType)
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [text, userId])

  // ── Soumission ──
  function handleSubmit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed, detectedType)
    setText('')
    setDetectedType(null)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '12px 14px',
      }}
    >
      {/* ── Row 1 : saisie ── */}
      <div className="flex items-start gap-2">
        {/* Préfixe chevron */}
        <span
          style={{
            color:      'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize:   '15px',
            lineHeight: '1.5',
            flexShrink: 0,
            userSelect: 'none',
            paddingTop: '1px',
          }}
        >
          ›
        </span>

        {/* Conteneur overlay + textarea */}
        <div style={{ position: 'relative', flex: 1, minHeight: '22px' }}>
          {/* Overlay colorisé — pointer-events: none pour laisser passer les clics à la textarea */}
          <div
            aria-hidden
            style={{
              ...SHARED_INPUT,
              position:      'absolute',
              inset:         0,
              color:         'var(--text)',
              pointerEvents: 'none',
              minHeight:     '22px',
            }}
            dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(text) }}
          />

          {/* Textarea transparente — capture les événements, curseur visible */}
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              ...SHARED_INPUT,
              display:    'block',
              position:   'relative',
              color:      'transparent',
              caretColor: 'var(--text)',
              background: 'transparent',
              resize:     'none',
              overflow:   'hidden',
              minHeight:  '22px',
            }}
          />
        </div>
      </div>

      {/* ── Row 2 : badge type détecté (visible dès 3 caractères) ── */}
      {detectedType !== null && (
        <div
          className="flex justify-end mt-1"
          style={{ animation: 'badgeFadeIn 150ms ease both' }}
        >
          <TypeBadge type={detectedType} />
        </div>
      )}

      {/* ── Row 3 : boutons d'action ── */}
      <div
        className="flex items-center justify-between mt-2 pt-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex gap-1">
          <ActionIconButton
            icon={<Paperclip size={16} />}
            label="Pièce jointe"
            onClick={onAttachmentClick}
          />
          <ActionIconButton
            icon={<Tag size={16} />}
            label="Tags"
            onClick={onTagClick}
          />
          <ActionIconButton
            icon={<Calendar size={16} />}
            label="Date"
            onClick={onDateClick}
          />
        </div>

        <button
          onClick={handleSubmit}
          onMouseEnter={() => setIsSendHovered(true)}
          onMouseLeave={() => setIsSendHovered(false)}
          style={{
            background:    isSendHovered
              ? 'var(--accent)'
              : 'color-mix(in srgb, var(--accent) 80%, transparent)',
            color:         'var(--bg)',
            border:        'none',
            borderRadius:  '8px',
            padding:       '6px 14px',
            fontFamily:    'var(--font-mono)',
            fontSize:      '12px',
            fontWeight:    700,
            letterSpacing: '0.05em',
            cursor:        text.trim() ? 'pointer' : 'default',
            opacity:       text.trim() ? 1 : 0.4,
            transition:    'background 150ms ease, opacity 150ms ease',
          }}
        >
          ENVOYER
        </button>
      </div>
    </div>
  )
}

// ── Bouton d'action icône ──

interface ActionIconButtonProps {
  icon:     ReactElement
  label:    string
  onClick?: () => void
}

function ActionIconButton({ icon, label, onClick }: ActionIconButtonProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      aria-label={label}
      onClick={() => onClick?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background:   isHovered ? 'var(--surface2)' : 'transparent',
        border:       'none',
        borderRadius: '6px',
        padding:      '6px',
        cursor:       'pointer',
        color:        isHovered ? 'var(--text)' : 'var(--muted)',
        display:      'flex',
        alignItems:   'center',
        transition:   'background 150ms ease, color 150ms ease',
      }}
    >
      {icon}
    </button>
  )
}
