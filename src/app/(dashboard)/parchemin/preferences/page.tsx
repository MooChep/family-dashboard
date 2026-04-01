'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, BellOff, Loader2, ArrowLeft, Send } from 'lucide-react'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import { subscribeToPush, requestNotificationPermission } from '@/lib/cerveau/notifications'

const isDev = process.env.NODE_ENV === 'development'

export default function ParcheminPreferencesPage() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [isSubscribed,      setIsSubscribed]      = useState(false)
  const [isSubscribing,     setIsSubscribing]     = useState(false)
  const [isTesting,         setIsTesting]         = useState(false)
  const { toast, showToast, dismiss } = useCerveauToast()

  useEffect(() => {
    setPermissionGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted')
    void fetch('/api/cerveau/push/subscribe')
      .then(r => r.json())
      .then((data: { success: boolean; data: { subscribed: boolean } }) => {
        if (data.success) setIsSubscribed(data.data.subscribed)
      })
  }, [])

  async function handleEnableNotifications() {
    setIsSubscribing(true)
    try {
      if (typeof Notification === 'undefined') {
        showToast('Notifications non supportées — ajoute l\'app à l\'écran d\'accueil (iOS)', 'error')
        return
      }
      if (Notification.permission === 'denied') {
        showToast('Notifications bloquées — autorise-les dans les réglages du navigateur', 'error')
        return
      }
      const granted = await requestNotificationPermission()
      if (!granted) { showToast('Permission refusée', 'error'); return }
      await subscribeToPush()
      setPermissionGranted(true)
      setIsSubscribed(true)
      showToast('Notifications activées', 'success')
    } catch (err) {
      showToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setIsSubscribing(false)
    }
  }

  async function handleTestNotification() {
    setIsTesting(true)
    try {
      const res  = await fetch('/api/cerveau/push/test', { method: 'POST' })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) showToast('Notification envoyée !', 'success')
      else showToast(data.error ?? 'Erreur', 'error')
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-4 pt-14 pb-6 md:pt-6">
        <div className="flex items-center gap-3">
          <Link
            href="/parchemin"
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
              parchemin · notifications
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8">

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

        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Notifications push
          </h2>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center gap-3">
              {isSubscribed
                ? <Bell size={18} style={{ color: 'var(--accent)' }} />
                : <BellOff size={18} style={{ color: 'var(--muted)' }} />
              }
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {isSubscribed ? 'Notifications activées' : 'Notifications désactivées'}
                </p>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  {isSubscribed ? 'Rappels de notes activés sur cet appareil' : 'Reçois les rappels de tes notes'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isSubscribed && (
                <button
                  type="button"
                  onClick={() => void handleTestNotification()}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
                >
                  {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Tester
                </button>
              )}
              {!isSubscribed && (
                <button
                  type="button"
                  onClick={() => void handleEnableNotifications()}
                  disabled={isSubscribing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {isSubscribing && <Loader2 size={14} className="animate-spin" />}
                  {permissionGranted ? 'Réactiver' : 'Activer'}
                </button>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
