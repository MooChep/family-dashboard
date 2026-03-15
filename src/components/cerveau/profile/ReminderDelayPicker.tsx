'use client'

import { type ReactElement } from 'react'

// ── Options disponibles ──

export interface DelayOption {
  value: string
  label: string
}

export const REMINDER_DELAY_OPTIONS: DelayOption[] = [
  { value: 'PT0S',   label: 'À l\'heure exacte' },
  { value: '-PT15M', label: '15 minutes avant' },
  { value: '-PT1H',  label: '1 heure avant' },
  { value: '-PT3H',  label: '3 heures avant' },
  { value: '-P1D',   label: '24 heures avant' },
]

export const EVENT_DELAY_OPTIONS: DelayOption[] = [
  { value: '-P14D',  label: '2 semaines avant' },
  { value: '-P7D',   label: '1 semaine avant' },
  { value: '-P3D',   label: '3 jours avant' },
  { value: '-P1D',   label: '1 jour avant' },
  { value: '-PT2H',  label: '2 heures avant' },
  { value: '-PT30M', label: '30 minutes avant' },
]

// ── Composant ──

interface ReminderDelayPickerProps {
  options:  DelayOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

/**
 * Liste de cases à cocher pour sélectionner les délais de notification actifs.
 */
export function ReminderDelayPicker({
  options,
  selected,
  onChange,
  disabled = false,
}: ReminderDelayPickerProps): ReactElement {
  function toggle(value: string): void {
    if (selected.includes(value)) {
      // Conserver au moins un délai actif
      if (selected.length === 1) return
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: '10px' }}>
      {options.map((opt) => {
        const checked = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className="flex items-center"
            style={{
              gap:    '10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <div
              onClick={() => { if (!disabled) toggle(opt.value) }}
              style={{
                width:        '18px',
                height:       '18px',
                borderRadius: '5px',
                border:       `2px solid ${checked ? 'var(--cerveau-reminder)' : 'var(--border)'}`,
                background:   checked ? 'var(--cerveau-reminder)' : 'transparent',
                flexShrink:   0,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                transition:   'all 150ms ease',
              }}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize:   '14px',
                color:      'var(--text)',
              }}
            >
              {opt.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}
