'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import { formatDateLongFR, formatAbsolute } from '@/lib/cerveau/formatDate'

interface DatePickerFRProps {
  value:      string
  onChange:   (v: string) => void
  showTime?:  boolean
  className?: string
}

export interface DatePickerFRHandle {
  openPicker: () => void
}

export const DatePickerFR = forwardRef<DatePickerFRHandle, DatePickerFRProps>(
  function DatePickerFR({ value, onChange, showTime = false, className }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    let display: string
    if (!value) {
      display = showTime ? 'Choisir une date et heure' : 'Choisir une date'
    } else if (showTime) {
      display = formatAbsolute(new Date(value))
    } else {
      display = formatDateLongFR(new Date(value + 'T00:00'))
    }

    function openPicker() {
      const el = inputRef.current
      if (!el) return
      if (typeof el.showPicker === 'function') {
        el.showPicker()
      } else {
        el.click()
      }
    }

    useImperativeHandle(ref, () => ({ openPicker }))

    return (
      <div className={`relative cursor-pointer select-none ${className ?? ''}`}>
        {/* Visible FR display */}
        <div style={{ color: value ? 'var(--text)' : 'var(--text2)' }}>
          {display}
        </div>

        {/* Transparent input overlay — iOS : tap direct sur l'input ouvre le picker natif
             Desktop : onClick appelle showPicker() explicitement */}
        <input
          ref={inputRef}
          type={showTime ? 'datetime-local' : 'date'}
          value={value}
          onChange={e => e.target.value && onChange(e.target.value)}
          onClick={() => { try { inputRef.current?.showPicker?.() } catch { /* ignore */ } }}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          tabIndex={-1}
        />
      </div>
    )
  }
)
