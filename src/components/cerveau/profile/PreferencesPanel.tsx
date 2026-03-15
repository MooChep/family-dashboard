'use client'

import { useState, useEffect, useCallback, type ReactElement, type CSSProperties } from 'react'
import { type NotificationPreference } from '@prisma/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TimeInput } from './TimeInput'
import {
  ReminderDelayPicker,
  REMINDER_DELAY_OPTIONS,
  EVENT_DELAY_OPTIONS,
} from './ReminderDelayPicker'

// ── Types locaux ──

interface PrefsForm {
  reminderDelays:    string[]
  snoozeTonightHour: string
  eventDefaultDelays: string[]
  enrichDelay:       number
  briefEnabled:      boolean
  briefTime:         string
  recapEnabled:      boolean
  recapDay:          number
  recapTime:         string
  silenceEnabled:    boolean
  silenceStart:      string
  silenceEnd:        string
}

function parseJsonArray(raw: string, fallback: string[]): string[] {
  try { return JSON.parse(raw) as string[] }
  catch { return fallback }
}

function prefsToForm(p: NotificationPreference): PrefsForm {
  return {
    reminderDelays:    parseJsonArray(p.reminderDelays, ['PT0S']),
    snoozeTonightHour: p.snoozeTonightHour,
    eventDefaultDelays: parseJsonArray(p.eventDefaultDelays, ['-P1D', '-PT2H']),
    enrichDelay:       p.enrichDelay,
    briefEnabled:      p.briefEnabled,
    briefTime:         p.briefTime,
    recapEnabled:      p.recapEnabled,
    recapDay:          p.recapDay,
    recapTime:         p.recapTime,
    silenceEnabled:    p.silenceEnabled,
    silenceStart:      p.silenceStart ?? '23:00',
    silenceEnd:        p.silenceEnd   ?? '07:30',
  }
}

const RECAP_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

// ── Composant ──

interface PreferencesPanelProps {
  isOpen:  boolean
  onClose: () => void
}

/**
 * Panneau de préférences Cerveau accessible depuis le header.
 * Sections phase 2 visibles mais désactivées (opacity 0.4, non éditables).
 */
export function PreferencesPanel({ isOpen, onClose }: PreferencesPanelProps): ReactElement {
  const [prefs,   setPrefs]   = useState<PrefsForm | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  // ── Chargement ──

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    void fetch('/api/cerveau/preferences')
      .then((r) => r.json())
      .then((data: NotificationPreference) => {
        setPrefs(prefsToForm(data))
        setLoading(false)
      })
  }, [isOpen])

  // ── Sauvegarde auto (debounce via blur / change immédiat sur toggle) ──

  const save = useCallback(async (patch: Partial<PrefsForm>): Promise<void> => {
    setSaving(true)
    await fetch('/api/cerveau/preferences', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    })
    setSaving(false)
  }, [])

  function updateField<K extends keyof PrefsForm>(key: K, value: PrefsForm[K]): void {
    setPrefs((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function saveField<K extends keyof PrefsForm>(key: K, value: PrefsForm[K]): void {
    updateField(key, value)
    void save({ [key]: value })
  }

  // ── Styles partagés ──

  const sectionTitle: CSSProperties = {
    fontFamily:   'var(--font-display)',
    fontSize:     '11px',
    fontWeight:   700,
    letterSpacing: '0.08em',
    color:        'var(--muted)',
    textTransform: 'uppercase',
    marginBottom: '12px',
  }

  const divider: CSSProperties = {
    borderTop: '1px solid var(--border)',
    margin:    '20px 0',
  }

  const fieldLabel: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize:   '13px',
    color:      'var(--muted)',
    marginBottom: '8px',
  }

  const numberInput: CSSProperties = {
    fontFamily:   'var(--font-body)',
    fontSize:     '14px',
    color:        'var(--text)',
    background:   'var(--surface-raised)',
    border:       '1px solid var(--border)',
    borderRadius: '8px',
    padding:      '6px 10px',
    outline:      'none',
    width:        '72px',
    textAlign:    'center',
  }

  // ── Rendu ──

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '4px 20px 32px' }}>

        {/* Titre */}
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
            Préférences
          </h2>
          {saving && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)' }}>
              Sauvegarde…
            </span>
          )}
        </div>

        {loading || !prefs ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', padding: '20px 0' }}>
            Chargement…
          </div>
        ) : (
          <>
            {/* ── RAPPELS ── */}
            <p style={sectionTitle}>Rappels</p>

            <p style={fieldLabel}>Délais de notification</p>
            <ReminderDelayPicker
              options={REMINDER_DELAY_OPTIONS}
              selected={prefs.reminderDelays}
              onChange={(v) => saveField('reminderDelays', v)}
            />

            <div style={{ marginTop: '16px' }}>
              <p style={fieldLabel}>Heure "ce soir" pour le snooze</p>
              <TimeInput
                value={prefs.snoozeTonightHour}
                onChange={(v) => updateField('snoozeTonightHour', v)}
                onSave={(v) => void save({ snoozeTonightHour: v })}
              />
            </div>

            <div style={divider} />

            {/* ── ÉVÉNEMENTS ── */}
            <p style={sectionTitle}>Événements</p>

            <p style={fieldLabel}>Délais par défaut</p>
            <ReminderDelayPicker
              options={EVENT_DELAY_OPTIONS}
              selected={prefs.eventDefaultDelays}
              onChange={(v) => saveField('eventDefaultDelays', v)}
            />

            <div style={divider} />

            {/* ── DISCUSSIONS ── */}
            <p style={sectionTitle}>Discussions</p>

            <p style={fieldLabel}>Notif d'enrichissement après</p>
            <div className="flex items-center" style={{ gap: '8px' }}>
              <input
                type="number"
                min={5}
                max={480}
                value={prefs.enrichDelay}
                onChange={(e) => updateField('enrichDelay', parseInt(e.target.value, 10) || 60)}
                onBlur={() => void save({ enrichDelay: prefs.enrichDelay })}
                style={numberInput}
              />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)' }}>
                minutes
              </span>
            </div>

            <div style={divider} />

            {/* ── BRIEF MATINAL — phase 2 ── */}
            <div style={{ opacity: 0.4 }}>
              <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Brief matinal
                <span style={{ fontSize: '10px', background: 'var(--border)', borderRadius: '4px', padding: '1px 5px', letterSpacing: 0 }}>
                  phase 2
                </span>
              </p>

              <div className="flex items-center" style={{ gap: '12px', marginBottom: '0' }}>
                <ToggleSwitch checked={false} onChange={() => undefined} disabled />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text)' }}>
                  Tous les jours à
                </span>
                <TimeInput value="08:00" onChange={() => undefined} disabled />
              </div>
            </div>

            <div style={divider} />

            {/* ── RÉCAP HEBDOMADAIRE — phase 2 ── */}
            <div style={{ opacity: 0.4 }}>
              <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Récap hebdomadaire
                <span style={{ fontSize: '10px', background: 'var(--border)', borderRadius: '4px', padding: '1px 5px', letterSpacing: 0 }}>
                  phase 2
                </span>
              </p>

              <div className="flex items-center flex-wrap" style={{ gap: '10px' }}>
                <ToggleSwitch checked={false} onChange={() => undefined} disabled />
                <select
                  disabled
                  style={{
                    fontFamily:   'var(--font-body)',
                    fontSize:     '14px',
                    color:        'var(--text)',
                    background:   'var(--surface-raised)',
                    border:       '1px solid var(--border)',
                    borderRadius: '8px',
                    padding:      '6px 10px',
                  }}
                >
                  <option>{RECAP_DAYS[0]}</option>
                </select>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text)' }}>à</span>
                <TimeInput value="19:00" onChange={() => undefined} disabled />
              </div>
            </div>

            <div style={divider} />

            {/* ── SILENCE — phase 2 ── */}
            <div style={{ opacity: 0.4 }}>
              <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Fenêtre de silence
                <span style={{ fontSize: '10px', background: 'var(--border)', borderRadius: '4px', padding: '1px 5px', letterSpacing: 0 }}>
                  phase 2
                </span>
              </p>

              <div className="flex items-center flex-wrap" style={{ gap: '10px' }}>
                <ToggleSwitch checked={false} onChange={() => undefined} disabled />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text)' }}>de</span>
                <TimeInput value="23:00" onChange={() => undefined} disabled />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text)' }}>à</span>
                <TimeInput value="07:30" onChange={() => undefined} disabled />
              </div>
            </div>

          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ── Toggle switch réutilisable ──

interface ToggleSwitchProps {
  checked:  boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked) }}
      style={{
        width:        '40px',
        height:       '24px',
        borderRadius: '12px',
        background:   checked ? 'var(--cerveau-reminder)' : 'var(--border)',
        border:       'none',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        position:     'relative',
        flexShrink:   0,
        transition:   'background 200ms ease',
      }}
    >
      <span
        style={{
          position:   'absolute',
          top:        '3px',
          left:       checked ? '19px' : '3px',
          width:      '18px',
          height:     '18px',
          borderRadius: '50%',
          background: 'white',
          transition: 'left 200ms ease',
          boxShadow:  '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

