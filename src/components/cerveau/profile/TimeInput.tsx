'use client'

import { type ReactElement } from 'react'

interface TimeInputProps {
  value:    string
  onChange: (value: string) => void
  /** Appelé avec la valeur normalisée après blur — pour persister en base. */
  onSave?:  (value: string) => void
  disabled?: boolean
}

/**
 * Input HH:MM avec validation — normalise au blur, appelle onSave si fourni.
 */
export function TimeInput({ value, onChange, onSave, disabled = false }: TimeInputProps): ReactElement {
  function handleBlur(raw: string): void {
    const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
    if (!match) {
      onChange(value) // revert si invalide
      return
    }
    const h = Math.min(23, parseInt(match[1], 10))
    const m = Math.min(59, parseInt(match[2], 10))
    const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    onChange(normalized)
    onSave?.(normalized)
  }

  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e)  => handleBlur(e.target.value)}
      style={{
        fontFamily:   'var(--font-body)',
        fontSize:     '14px',
        color:        disabled ? 'var(--muted)' : 'var(--text)',
        background:   'var(--surface-raised)',
        border:       '1px solid var(--border)',
        borderRadius: '8px',
        padding:      '6px 10px',
        outline:      'none',
        width:        '90px',
        cursor:       disabled ? 'not-allowed' : 'text',
        opacity:      disabled ? 0.5 : 1,
      }}
    />
  )
}
