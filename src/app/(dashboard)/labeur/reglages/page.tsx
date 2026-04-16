'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import type { LabeurSettings } from '@prisma/client'

/**
 * Page de réglages du module Labeur.
 * Permet de configurer l'inflation, la malédiction, les seuils d'alerte
 * et les délais de rappel push.
 */
export default function LabeurReglagesPage() {
  const [settings, setSettings] = useState<LabeurSettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Valeurs du formulaire (décalées des settings pour permettre l'annulation)
  const [inflationCap,            setInflationCap]            = useState(150)
  const [curseSeuil,              setCurseSeuil]              = useState(50)
  const [inflationAlertThreshold, setInflationAlertThreshold] = useState(25)
  const [overdueReminderHours,    setOverdueReminderHours]    = useState(24)
  const [oneshotReminderHours,    setOneshotReminderHours]    = useState(48)
  const [timezone,                setTimezone]                = useState('Europe/Paris')

  useEffect(() => {
    fetch('/api/labeur/settings')
      .then((r) => r.json())
      .then(({ data }: { data: LabeurSettings }) => {
        if (!data) return
        setSettings(data)
        setInflationCap(data.inflationCap)
        setCurseSeuil(data.curseSeuil)
        setInflationAlertThreshold(data.inflationAlertThreshold)
        setOverdueReminderHours(data.overdueReminderHours)
        setOneshotReminderHours(data.oneshotReminderHours)
        setTimezone(data.timezone)
      })
      .finally(() => setLoading(false))
  }, [])

  // Annuler — revenir aux valeurs enregistrées
  function handleReset() {
    if (!settings) return
    setInflationCap(settings.inflationCap)
    setCurseSeuil(settings.curseSeuil)
    setInflationAlertThreshold(settings.inflationAlertThreshold)
    setOverdueReminderHours(settings.overdueReminderHours)
    setOneshotReminderHours(settings.oneshotReminderHours)
    setTimezone(settings.timezone)
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const res = await fetch('/api/labeur/settings', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inflationCap,
        curseSeuil,
        inflationAlertThreshold,
        overdueReminderHours,
        oneshotReminderHours,
        timezone,
      }),
    })
    if (res.ok) {
      const { data } = await res.json() as { data: LabeurSettings }
      setSettings(data)
      setSaved(true)
    } else {
      const { error: e } = await res.json() as { error: string }
      setError(e ?? 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  // Détecte si des modifications non sauvegardées sont présentes
  const isDirty = settings && (
    inflationCap            !== settings.inflationCap ||
    curseSeuil              !== settings.curseSeuil ||
    inflationAlertThreshold !== settings.inflationAlertThreshold ||
    overdueReminderHours    !== settings.overdueReminderHours ||
    oneshotReminderHours    !== settings.oneshotReminderHours ||
    timezone                !== settings.timezone
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Réglages Labeur</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Configuration de l'inflation et des notifications
        </p>
      </div>

      {/* ── Section : Économie du Marché ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Économie du Marché
        </h2>

        <SliderField
          label="Plafond d'inflation"
          description="Valeur maximale que peut atteindre l'inflation globale."
          value={inflationCap}
          min={10} max={500} step={5}
          unit="%"
          onChange={setInflationCap}
        />

        <SliderField
          label="Seuil de malédiction"
          description="L'inflation qui déclenche le sceau sur les articles du Marché."
          value={curseSeuil}
          min={10} max={200} step={5}
          unit="%"
          onChange={setCurseSeuil}
        />

        <SliderField
          label="Seuil d'alerte inflation"
          description="Notification push envoyée quand l'inflation dépasse ce seuil."
          value={inflationAlertThreshold}
          min={5} max={100} step={5}
          unit="%"
          onChange={setInflationAlertThreshold}
        />
      </section>

      {/* ── Section : Rappels push ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Rappels push
        </h2>

        <SliderField
          label="Rappel tâche récurrente en retard"
          description="Délai (en heures) après lequel un rappel est envoyé pour une tâche récurrente en retard."
          value={overdueReminderHours}
          min={1} max={168} step={1}
          unit="h"
          onChange={setOverdueReminderHours}
        />

        <SliderField
          label="Rappel tâche ponctuelle"
          description="Délai (en heures) avant l'échéance d'une tâche ponctuelle pour envoyer un rappel."
          value={oneshotReminderHours}
          min={1} max={168} step={1}
          unit="h"
          onChange={setOneshotReminderHours}
        />
      </section>

      {/* ── Section : Système ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Système
        </h2>

        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-1.5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Fuseau horaire
          </label>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Utilisé pour calculer les échéances et les retards.
          </p>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--surface2)',
              color:           'var(--text)',
              border:          '1px solid var(--border)',
              outline:         'none',
            }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Feedback ── */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
      {saved && !isDirty && (
        <p className="text-sm" style={{ color: 'var(--success)' }}>✓ Réglages enregistrés</p>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        {isDirty && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <RotateCcw size={14} />
            Annuler
          </button>
        )}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Save size={14} />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

    </div>
  )
}

// ─── SliderField ──────────────────────────────────────────────────────────────

type SliderFieldProps = {
  label:       string
  description: string
  value:       number
  min:         number
  max:         number
  step:        number
  unit:        string
  onChange:    (v: number) => void
}

function SliderField({
  label, description, value, min, max, step, unit, onChange,
}: SliderFieldProps) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-lg font-mono font-bold" style={{ color: 'var(--accent)' }}>
          {value}{unit}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{description}</p>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--accent)' }}
      />
      <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--muted)' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ─── Fuseaux horaires courants ────────────────────────────────────────────────

const TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
]
