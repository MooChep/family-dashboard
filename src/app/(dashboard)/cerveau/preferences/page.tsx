'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, BellOff, Loader2, ArrowLeft } from 'lucide-react'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import { subscribeToPush, requestNotificationPermission } from '@/lib/cerveau/notifications'

type Prefs = {
  eveningStartsAt:    string
  eventLeadTime:      number
  quietFrom:          string | null
  quietUntil:         string | null
  morningDigestAt:    string | null
  weeklyRecapEnabled: boolean
}

const LEAD_TIME_OPTIONS = [
  { value: 15,   label: '15 minutes' },
  { value: 60,   label: '1 heure' },
  { value: 1440, label: '24 heures' },
]

const isDev = process.env.NODE_ENV === 'development'

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>({
    eveningStartsAt:    '19:00',
    eventLeadTime:      1440,
    quietFrom:          null,
    quietUntil:         null,
    morningDigestAt:    '08:00',
    weeklyRecapEnabled: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [notifGranted, setNotifGranted] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const { toast, showToast, dismiss } = useCerveauToast()

  useEffect(() => {
    setNotifGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted')
    void fetch('/api/cerveau/preferences')
      .then(r => r.json())
      .then((data: { success: boolean; data: Prefs | null }) => {
        if (data.success && data.data) setPrefs(data.data)
      })
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/cerveau/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = await res.json() as { success: boolean }
      if (data.success) showToast('Préférences sauvegardées', 'success')
      else showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEnableNotifications() {
    setIsSubscribing(true)
    try {
      const granted = await requestNotificationPermission()
      if (!granted) {
        showToast('Permission refusée par le navigateur', 'error')
        return
      }
      await subscribeToPush()
      setNotifGranted(true)
      showToast('Notifications activées', 'success')
    } catch {
      showToast('Erreur lors de l\'activation', 'error')
    } finally {
      setIsSubscribing(false)
    }
  }

  const fieldClass = 'w-full bg-transparent border-b-2 px-0 py-2.5 text-sm outline-none'

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-4 pt-14 pb-6 md:pt-6">
        <div className="flex items-center gap-3">
          <Link
            href="/cerveau"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
              Préférences
            </h1>
            <p className="font-mono text-[8px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>
              cerveau · notifications
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8">

        {/* Dev warning */}
        {isDev && (
          <div
            className="rounded-xl p-3 font-mono text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
              color: 'var(--warning)',
            }}
          >
            ⚠️ Notifications PWA — service worker inactif en développement.
            Test manuel via GET /api/cerveau/push/schedule
          </div>
        )}

        {/* Push notifications */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Notifications push
          </h2>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center gap-3">
              {notifGranted
                ? <Bell size={18} style={{ color: 'var(--accent)' }} />
                : <BellOff size={18} style={{ color: 'var(--muted)' }} />
              }
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {notifGranted ? 'Notifications activées' : 'Notifications désactivées'}
                </p>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  Rappels, événements à venir
                </p>
              </div>
            </div>
            {!notifGranted && (
              <button
                type="button"
                onClick={() => void handleEnableNotifications()}
                disabled={isSubscribing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {isSubscribing && <Loader2 size={14} className="animate-spin" />}
                Activer
              </button>
            )}
          </div>
        </section>

        {/* Timing */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Timing
          </h2>
          <div className="space-y-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Début de soirée (snooze "ce soir")
              </label>
              <input
                type="time"
                value={prefs.eveningStartsAt}
                onChange={e => setPrefs(p => ({ ...p, eveningStartsAt: e.target.value }))}
                className={fieldClass}
                style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>
            <div className="pb-5">
              <label className="font-mono text-xs uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                Délai de notification par défaut pour les événements
              </label>
              <div className="flex gap-2">
                {LEAD_TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrefs(p => ({ ...p, eventLeadTime: opt.value }))}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: prefs.eventLeadTime === opt.value ? 'var(--accent)' : 'var(--surface2)',
                      color: prefs.eventLeadTime === opt.value ? '#fff' : 'var(--text2)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Heures de silence */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Heures de silence
          </h2>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
                De
              </label>
              <input
                type="time"
                value={prefs.quietFrom ?? ''}
                onChange={e => setPrefs(p => ({ ...p, quietFrom: e.target.value || null }))}
                className={fieldClass}
                style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
                À
              </label>
              <input
                type="time"
                value={prefs.quietUntil ?? ''}
                onChange={e => setPrefs(p => ({ ...p, quietUntil: e.target.value || null }))}
                className={fieldClass}
                style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>
          </div>
        </section>

        {/* Digest matinal */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Digest matinal
          </h2>
          <div>
            <label className="font-mono text-xs uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
              ☀️ Heure du digest
            </label>
            <input
              type="time"
              value={prefs.morningDigestAt ?? '08:00'}
              onChange={e => setPrefs(p => ({ ...p, morningDigestAt: e.target.value || null }))}
              className={fieldClass}
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
            />
            <p className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--muted)' }}>
              Reçois un résumé de ta journée chaque matin
            </p>
          </div>
        </section>

        {/* Récap hebdomadaire */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Récap hebdomadaire
          </h2>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                📊 Récap hebdo
              </p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                Résumé de ta semaine chaque dimanche soir
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.weeklyRecapEnabled}
              onClick={() => setPrefs(p => ({ ...p, weeklyRecapEnabled: !p.weeklyRecapEnabled }))}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{
                backgroundColor: prefs.weeklyRecapEnabled ? 'var(--accent)' : 'var(--surface2)',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: prefs.weeklyRecapEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        {/* Save */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Sauvegarder
        </button>

      </div>
    </div>
  )
}
