'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'

// ── Types ──

interface EventReminder {
  id:    string
  delay: string
}

interface EventReminderConfigProps {
  /** Identifiant de l'entrée EVENT */
  eventId: string
}

// ── Catalogue des délais disponibles ──

const DELAY_OPTIONS: { delay: string; label: string }[] = [
  { delay: '-P14D',  label: '2 semaines avant' },
  { delay: '-P7D',   label: '1 semaine avant'  },
  { delay: '-P3D',   label: '3 jours avant'    },
  { delay: '-P1D',   label: '1 jour avant'     },
  { delay: '-PT2H',  label: '2h avant'         },
  { delay: '-PT30M', label: '30 min avant'     },
  { delay: 'PT0S',   label: "À l'heure exacte" },
]

// ── Composant ──

/**
 * Sélecteur de délais de rappel pour un Événement.
 * Charge les rappels existants, puis permet d'ajouter ou de supprimer
 * chaque délai via un toggle — persisté immédiatement.
 */
export function EventReminderConfig({ eventId }: EventReminderConfigProps): ReactElement {
  const [reminders, setReminders] = useState<EventReminder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)

  // ── Chargement des rappels existants ──

  const load = useCallback(() => {
    void fetch(`/api/cerveau/events/${eventId}/reminders`)
      .then((r) => r.json() as Promise<EventReminder[]>)
      .then((data) => {
        setReminders(data)
        setLoading(false)
      })
  }, [eventId])

  useEffect(() => { load() }, [load])

  // ── Toggle un délai ──

  function handleToggle(delay: string): void {
    const existing = reminders.find((r) => r.delay === delay)
    setSaving(delay)

    if (existing) {
      // Supprimer
      void fetch(`/api/cerveau/events/${eventId}/reminders/${existing.id}`, { method: 'DELETE' })
        .then(() => {
          setReminders((prev) => prev.filter((r) => r.id !== existing.id))
          setSaving(null)
        })
    } else {
      // Ajouter
      void fetch(`/api/cerveau/events/${eventId}/reminders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ delay }),
      })
        .then((r) => r.json() as Promise<EventReminder>)
        .then((created) => {
          setReminders((prev) => [...prev, created])
          setSaving(null)
        })
    }
  }

  // ── Render ──

  return (
    <div>
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
        Rappels
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
          Chargement…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {DELAY_OPTIONS.map(({ delay, label }) => {
            const active = reminders.some((r) => r.delay === delay)
            const busy   = saving === delay

            return (
              <button
                key={delay}
                onClick={() => { if (!busy) handleToggle(delay) }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '10px',
                  padding:      '9px 14px',
                  borderRadius: '8px',
                  border:       `1.5px solid ${active ? 'var(--cerveau-event)' : 'var(--border)'}`,
                  background:   active
                    ? 'color-mix(in srgb, var(--cerveau-event) 10%, transparent)'
                    : 'transparent',
                  cursor:       busy ? 'not-allowed' : 'pointer',
                  opacity:      busy ? 0.6 : 1,
                  transition:   'border 150ms, background 150ms',
                  textAlign:    'left',
                }}
              >
                {/* ── Indicateur visuel ── */}
                <span
                  style={{
                    width:        '14px',
                    height:       '14px',
                    borderRadius: '50%',
                    border:       `1.5px solid ${active ? 'var(--cerveau-event)' : 'var(--border)'}`,
                    background:   active ? 'var(--cerveau-event)' : 'transparent',
                    flexShrink:   0,
                    display:      'inline-block',
                    transition:   'background 150ms, border 150ms',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '13px',
                    color:      active ? 'var(--cerveau-event)' : 'var(--text)',
                  }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
