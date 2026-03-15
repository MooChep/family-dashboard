'use client'

import { useState, type ReactElement } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticLight } from '@/lib/haptics'
import { type EventEntry } from './EventCard'
import { EventReminderConfig } from './EventReminderConfig'

// ── Types ──

interface EventDetailProps {
  entry:     EventEntry | null
  onClose:   () => void
  onSaved:   (updated: EventEntry) => void
  onRemoved: (id: string) => void
}

interface PatchBody {
  content?:    string
  startDate?:  string
  endDate?:    string | null
  allDay?:     boolean
  location?:   string | null
  assignedTo?: string
  status?:     string
}

// ── Helpers ──

/** Convertit un Date ISO string en valeur pour input[type=datetime-local]. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convertit un Date ISO string en valeur pour input[type=date]. */
function toDateOnly(iso: string): string {
  return toDatetimeLocal(iso).slice(0, 10)
}

// ── Composant ──

/**
 * Panneau détail d'un Événement.
 * Édition inline : titre, date/heure début, fin, lieu, assignation, journée entière.
 * Configuration des rappels multiples via EventReminderConfig.
 * Actions : annuler l'événement.
 */
export function EventDetail({
  entry,
  onClose,
  onSaved,
  onRemoved,
}: EventDetailProps): ReactElement {
  const [content,    setContent]    = useState(entry?.content    ?? '')
  const [startDate,  setStartDate]  = useState(entry ? (entry.allDay ? toDateOnly(entry.startDate) : toDatetimeLocal(entry.startDate)) : '')
  const [endDate,    setEndDate]    = useState(entry?.endDate ? (entry.allDay ? toDateOnly(entry.endDate) : toDatetimeLocal(entry.endDate)) : '')
  const [location,   setLocation]   = useState(entry?.location   ?? '')
  const [assignedTo, setAssignedTo] = useState(entry?.assignedTo ?? 'SHARED')
  const [allDay,     setAllDay]     = useState(entry?.allDay     ?? false)
  const [cancelling, setCancelling] = useState(false)

  if (!entry) return <></>

  // ── Persistance partielle ──

  async function patch(body: PatchBody): Promise<void> {
    const res = await fetch(`/api/cerveau/entries/${entry!.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as EventEntry
      onSaved(updated)
    }
  }

  // ── Handlers champs ──

  function handleContentBlur(): void {
    const trimmed = content.trim()
    if (trimmed && trimmed !== entry!.content) {
      void patch({ content: trimmed })
    }
  }

  function handleStartDateChange(val: string): void {
    setStartDate(val)
    if (val) {
      void patch({ startDate: allDay ? `${val}T00:00:00` : new Date(val).toISOString() })
    }
  }

  function handleEndDateChange(val: string): void {
    setEndDate(val)
    void patch({ endDate: val ? (allDay ? `${val}T23:59:00` : new Date(val).toISOString()) : null })
  }

  function handleLocationBlur(): void {
    const trimmed = location.trim() || null
    if (trimmed !== (entry!.location ?? null)) {
      void patch({ location: trimmed })
    }
  }

  function handleAllDayToggle(): void {
    hapticLight()
    const next = !allDay
    setAllDay(next)
    void patch({ allDay: next })
  }

  function handleAssignedToChange(val: string): void {
    hapticLight()
    setAssignedTo(val)
    void patch({ assignedTo: val })
  }

  // ── Annulation de l'événement ──

  async function handleCancel(): Promise<void> {
    setCancelling(true)
    try {
      await patch({ status: 'CANCELLED' })
      onRemoved(entry!.id)
      onClose()
    } finally {
      setCancelling(false)
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
              color:         'var(--cerveau-event)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  '8px',
            }}
          >
            ◉ Événement
          </div>
          <input
            value={content}
            onChange={(e) => { setContent(e.target.value) }}
            onBlur={handleContentBlur}
            style={{
              width:        '100%',
              background:   'transparent',
              border:       'none',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '6px',
              fontFamily:   'var(--font-body)',
              fontSize:     '16px',
              fontWeight:   600,
              color:        'var(--text)',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
        </div>

        {/* ── Journée entière ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={handleAllDayToggle}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '8px',
              padding:      '6px 12px',
              borderRadius: '20px',
              border:       `1.5px solid ${allDay ? 'var(--cerveau-event)' : 'var(--border)'}`,
              background:   allDay
                ? 'color-mix(in srgb, var(--cerveau-event) 12%, transparent)'
                : 'transparent',
              color:        allDay ? 'var(--cerveau-event)' : 'var(--muted)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              cursor:       'pointer',
              transition:   'all 150ms',
            }}
          >
            {allDay ? '✓' : '○'} Journée entière
          </button>
        </div>

        {/* ── Dates ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '10px',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display:       'block',
                marginBottom:  '6px',
              }}
            >
              Début
            </label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={startDate}
              onChange={(e) => { handleStartDateChange(e.target.value) }}
              style={{
                width:        '100%',
                background:   'var(--bg)',
                border:       '1px solid var(--border)',
                borderRadius: '8px',
                padding:      '8px 12px',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                color:        'var(--text)',
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '10px',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display:       'block',
                marginBottom:  '6px',
              }}
            >
              Fin (optionnel)
            </label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={endDate}
              onChange={(e) => { handleEndDateChange(e.target.value) }}
              style={{
                width:        '100%',
                background:   'var(--bg)',
                border:       '1px solid var(--border)',
                borderRadius: '8px',
                padding:      '8px 12px',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                color:        'var(--text)',
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />
          </div>
        </div>

        {/* ── Lieu ── */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '10px',
              color:         'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display:       'block',
              marginBottom:  '6px',
            }}
          >
            Lieu
          </label>
          <input
            value={location}
            onChange={(e) => { setLocation(e.target.value) }}
            onBlur={handleLocationBlur}
            placeholder="Ajouter un lieu…"
            style={{
              width:        '100%',
              background:   'var(--bg)',
              border:       '1px solid var(--border)',
              borderRadius: '8px',
              padding:      '8px 12px',
              fontFamily:   'var(--font-body)',
              fontSize:     '14px',
              color:        'var(--text)',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
        </div>

        {/* ── Assignation ── */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '10px',
              color:         'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  '8px',
            }}
          >
            Qui
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['SHARED', 'ILAN', 'CAMILLE'] as const).map((val) => (
              <button
                key={val}
                onClick={() => { handleAssignedToChange(val) }}
                style={{
                  padding:      '6px 14px',
                  borderRadius: '20px',
                  border:       `1.5px solid ${assignedTo === val ? 'var(--cerveau-event)' : 'var(--border)'}`,
                  background:   assignedTo === val
                    ? 'color-mix(in srgb, var(--cerveau-event) 12%, transparent)'
                    : 'transparent',
                  color:        assignedTo === val ? 'var(--cerveau-event)' : 'var(--muted)',
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '12px',
                  cursor:       'pointer',
                  transition:   'all 150ms',
                }}
              >
                {val === 'SHARED' ? 'Partagé' : val === 'ILAN' ? 'Ilan' : 'Camille'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Rappels ── */}
        <div style={{ marginBottom: '28px' }}>
          <EventReminderConfig eventId={entry.id} />
        </div>

        {/* ── Annuler l'événement ── */}
        <button
          onClick={() => void handleCancel()}
          disabled={cancelling}
          style={{
            width:        '100%',
            padding:      '12px',
            borderRadius: '10px',
            border:       '1.5px solid var(--muted)',
            background:   'transparent',
            color:        'var(--muted)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '13px',
            cursor:       cancelling ? 'not-allowed' : 'pointer',
            opacity:      cancelling ? 0.6 : 1,
          }}
        >
          ✗ Annuler l&apos;événement
        </button>

      </div>
    </BottomSheet>
  )
}
