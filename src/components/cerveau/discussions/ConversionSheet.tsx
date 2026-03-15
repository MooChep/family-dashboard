'use client'

import { useState, type ReactElement } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticLight } from '@/lib/haptics'
import { type DiscussionEntry } from './DiscussionCard'

// ── Types ──

type ConvertTarget = 'TODO' | 'NOTE' | 'PROJECT'

interface ConversionOption {
  target: ConvertTarget
  icon:   string
  label:  string
  color:  string
  desc:   string
}

interface ConversionSheetProps {
  entry:       DiscussionEntry | null
  onClose:     () => void
  onConverted: (id: string, newId: string) => void
}

// ── Constantes ──

const CONVERSION_OPTIONS: ConversionOption[] = [
  {
    target: 'TODO',
    icon:   '◻',
    label:  'Todo',
    color:  'var(--cerveau-todo)',
    desc:   'Transformer en action à faire',
  },
  {
    target: 'NOTE',
    icon:   '◆',
    label:  'Note',
    color:  'var(--cerveau-note)',
    desc:   'Transformer en note informative',
  },
  {
    target: 'PROJECT',
    icon:   '▸',
    label:  'Projet',
    color:  'var(--cerveau-project)',
    desc:   'Démarrer un projet depuis ce sujet',
  },
]

// ── Composant ──

/**
 * Bottom sheet de conversion d'une Discussion vers Todo, Note ou Projet.
 * Appelle POST /api/cerveau/entries/[id]/convert et supprime la Discussion originale.
 */
export function ConversionSheet({ entry, onClose, onConverted }: ConversionSheetProps): ReactElement {
  const [loading, setLoading] = useState(false)

  if (!entry) return <></>

  async function handleConvert(target: ConvertTarget): Promise<void> {
    if (!entry) return
    setLoading(true)
    hapticLight()
    try {
      const res = await fetch(`/api/cerveau/entries/${entry.id}/convert`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ targetType: target }),
      })
      if (res.ok) {
        const newEntry = await res.json() as { id: string }
        onConverted(entry.id, newEntry.id)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={!!entry} onClose={onClose}>
      <div style={{ padding: '16px 20px 40px' }}>

        {/* ── En-tête ── */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '11px',
              color:         'var(--cerveau-discussion)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  '6px',
            }}
          >
            ◈ Convertir la discussion
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   '15px',
              color:      'var(--text)',
              lineHeight: '1.4',
            }}
          >
            {entry.content}
          </div>
        </div>

        {/* ── Options ── */}
        <div className="flex flex-col gap-2">
          {CONVERSION_OPTIONS.map((opt) => (
            <button
              key={opt.target}
              onClick={() => void handleConvert(opt.target)}
              disabled={loading}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '12px',
                padding:      '13px 16px',
                borderRadius: '10px',
                border:       `1.5px solid var(--border)`,
                background:   'var(--bg)',
                color:        'var(--text)',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                cursor:       loading ? 'not-allowed' : 'pointer',
                textAlign:    'left',
                opacity:      loading ? 0.6 : 1,
                transition:   'border 150ms',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '16px',
                  color:      opt.color,
                  width:      '20px',
                  flexShrink: 0,
                  textAlign:  'center',
                }}
              >
                {opt.icon}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: opt.color }}>{opt.label}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '11px',
                    color:      'var(--muted)',
                    marginTop:  '2px',
                  }}
                >
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>
    </BottomSheet>
  )
}
