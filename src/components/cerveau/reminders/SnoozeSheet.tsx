'use client'

import { useState, type ReactElement } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticLight } from '@/lib/haptics'
import { type ReminderEntry } from './ReminderCard'

// ── Types ──

type SnoozeDuration = 'PT15M' | 'PT1H' | 'PT3H' | 'TONIGHT'

interface SnoozeOption {
  duration: SnoozeDuration
  label:    string
  icon:     string
}

interface SnoozeSheetProps {
  entry:    ReminderEntry | null
  onClose:  () => void
  onSnoozed:(id: string) => void
  onDone:   (id: string) => void
}

// ── Constantes ──

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { duration: 'PT15M',  label: '15 minutes', icon: '⏱' },
  { duration: 'PT1H',   label: '1 heure',    icon: '⏰' },
  { duration: 'PT3H',   label: '3 heures',   icon: '🕐' },
  { duration: 'TONIGHT', label: 'Ce soir',   icon: '🌙' },
]

// ── Composant ──

/** Bottom sheet de snooze pour un Rappel : snooze ou marquer fait. */
export function SnoozeSheet({ entry, onClose, onSnoozed, onDone }: SnoozeSheetProps): ReactElement {
  const [loading, setLoading] = useState(false)

  if (!entry) return <></>

  async function handleSnooze(duration: SnoozeDuration): Promise<void> {
    if (!entry) return
    setLoading(true)
    hapticLight()
    try {
      const res = await fetch(`/api/cerveau/entries/${entry.id}/snooze`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ duration }),
      })
      if (res.ok) {
        onSnoozed(entry.id)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDone(): Promise<void> {
    if (!entry) return
    setLoading(true)
    hapticLight()
    try {
      const res = await fetch(`/api/cerveau/entries/${entry.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'DONE' }),
      })
      if (res.ok) {
        onDone(entry.id)
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
              color:         'var(--cerveau-reminder)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  '6px',
            }}
          >
            ⏰ Rappel
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

        {/* ── Options snooze ── */}
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '10px',
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom:  '10px',
          }}
        >
          Reporter
        </div>
        <div className="flex flex-col gap-2" style={{ marginBottom: '20px' }}>
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.duration}
              onClick={() => void handleSnooze(opt.duration)}
              disabled={loading}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                padding:      '12px 14px',
                borderRadius: '10px',
                border:       '1px solid var(--border)',
                background:   'var(--bg)',
                color:        'var(--text)',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                cursor:       loading ? 'not-allowed' : 'pointer',
                textAlign:    'left',
                opacity:      loading ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: '16px' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Marquer fait ── */}
        <button
          onClick={() => void handleDone()}
          disabled={loading}
          style={{
            width:        '100%',
            padding:      '12px',
            borderRadius: '10px',
            border:       'none',
            background:   loading ? 'var(--muted)' : 'var(--cerveau-reminder)',
            color:        'var(--text-on-accent)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '13px',
            fontWeight:   700,
            cursor:       loading ? 'not-allowed' : 'pointer',
            transition:   'background 200ms',
          }}
        >
          ✓ Marquer fait
        </button>

      </div>
    </BottomSheet>
  )
}
