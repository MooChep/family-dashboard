'use client'
import { useState, useEffect, type ReactElement } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTheme } from '@/components/layout/ThemeProvider'
import { subscribeToPush, requestNotificationPermission } from '@/lib/notifications'
import type { Theme } from '@/types/theme'
import type { Gender } from '@prisma/client'

type Tab = 'profil' | 'themes' | 'preferences'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── Aperçu mini-palette ───────────────────────────────────────────────────────
function ThemePreview({ cssVars }: { cssVars: Record<string, string> | null }): ReactElement {
  if (!cssVars) {
    return <div className="w-5 h-5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
  }
  return (
    <div className="flex gap-0.5 items-center">
      {(['--bg', '--surface', '--accent', '--success', '--danger'] as const).map((v) => (
        <div key={v} className="w-4 h-4 rounded-sm" style={{ backgroundColor: cssVars[v] ?? '#888' }} />
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export function ProfileModal({ isOpen, onClose }: ProfileModalProps): ReactElement {
  const { data: session, update: updateSession } = useSession()
const { theme: currentTheme, setTheme, previewTheme, deleteTheme, themes, isLoading: themesLoading } = useTheme()  
const [tab, setTab] = useState<Tab>('preferences')

  // ── Profil ────────────────────────────────────────────────────────────────
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [gender, setGender]         = useState<Gender>('NEUTRAL')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError]     = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // ── Parchemin ─────────────────────────────────────────────────────────────
  const [permissionGranted,  setPermissionGranted]  = useState(false)
  const [isSubscribed,       setIsSubscribed]        = useState(false)
  const [isSubscribing,      setIsSubscribing]       = useState(false)
  const [isUnsubscribing,    setIsUnsubscribing]     = useState(false)
  const [isTesting,          setIsTesting]           = useState(false)
  const [notifyOnCreate,     setNotifyOnCreate]      = useState(true)
  const [prefsLoading,       setPrefsLoading]        = useState(false)

  // ── Thèmes ────────────────────────────────────────────────────────────────
  // selectedTheme = choix en cours (pas encore confirmé)
  const [selectedTheme, setSelectedTheme]   = useState<string>(currentTheme)
  const [applyLoading, setApplyLoading]     = useState(false)
  const [applySuccess, setApplySuccess]     = useState(false)
  const [newLabel, setNewLabel]             = useState('')
  const [newAccent, setNewAccent]           = useState('#6c63ff')
  const [newBase, setNewBase]               = useState<'dark' | 'light'>('dark')
  const [createLoading, setCreateLoading]   = useState(false)
  const [createError, setCreateError]       = useState<string | null>(null)
  const [deleteError, setDeleteError]       = useState<string | null>(null)
  const [preview, setPreview]               = useState<Record<string, string> | null>(null)

  // Sync selectedTheme + parchemin prefs quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setName(session?.user?.name ?? '')
      setEmail(session?.user?.email ?? '')
      // Charger le genre depuis l'API (pas dans la session JWT par défaut)
      void fetch('/api/user/profile')
        .then((r) => r.ok ? r.json() : null)
        .then((d: { gender?: Gender } | null) => { if (d?.gender) setGender(d.gender) })
      setProfileError(null); setProfileSuccess(false)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setSelectedTheme(currentTheme)
      setApplySuccess(false)
      setPermissionGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted')
      if (session) {
        void (async () => {
          try {
            const reg = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
              ? await navigator.serviceWorker.ready : null
            const pushSub = reg ? await reg.pushManager.getSubscription() : null
            if (pushSub) {
              const endpoint = encodeURIComponent(pushSub.endpoint)
              const d = await fetch(`/api/push/subscribe?endpoint=${endpoint}`).then(r => r.ok ? r.json() : null) as { success: boolean; data: { subscribed: boolean } } | null
              setIsSubscribed(d?.data?.subscribed ?? false)
            } else {
              setIsSubscribed(false)
            }
          } catch { setIsSubscribed(false) }
        })()
        void fetch('/api/parchemin/preferences')
          .then(r => r.ok ? r.json() : null)
          .then((d: { success: boolean; data: { notifyOnCreate: boolean } } | null) => { if (d?.success) setNotifyOnCreate(d.data.notifyOnCreate) })
      }
    }
  }, [isOpen, session, currentTheme])

  useEffect(() => {
    setPreview(computePreview(newAccent, newBase))
  }, [newAccent, newBase])

  // ── Sélection d'un thème : préview live sans persistance ─────────────────
  function handleSelectTheme(name: string): void {
    setSelectedTheme(name)
    setApplySuccess(false)
    previewTheme(name) // applique au DOM instantanément, pas en BDD
  }

  // ── Confirmation : persiste en BDD ────────────────────────────────────────
  async function handleApplyTheme(): Promise<void> {
    setApplyLoading(true)
    setApplySuccess(false)
    try {
      await setTheme(selectedTheme)
      setApplySuccess(true)
    } finally {
      setApplyLoading(false)
    }
  }

  // ── Annulation : revient au thème actif en BDD ────────────────────────────
  function handleCancelTheme(): void {
    setSelectedTheme(currentTheme)
    previewTheme(currentTheme)
    setApplySuccess(false)
  }

  // ── Création d'un thème custom ────────────────────────────────────────────
  async function handleCreateTheme(): Promise<void> {
    setCreateError(null)
    if (!newLabel.trim()) { setCreateError('Nom requis'); return }
    setCreateLoading(true)
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, accent: newAccent, base: newBase }),
      })
      if (!res.ok) {
        const e = await res.json() as { error: string }
        throw new Error(e.error)
      }
      const created = await res.json() as Theme
      // Applique et persiste directement après création
      await setTheme(created.name)
      setSelectedTheme(created.name)
      setNewLabel('')
      setApplySuccess(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setCreateLoading(false)
    }
  }

  // ── Suppression ───────────────────────────────────────────────────────────
  async function handleDeleteTheme(name: string): Promise<void> {
    setDeleteError(null)
    try {
      await deleteTheme(name)
      setSelectedTheme(currentTheme)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur suppression')
    }
  }

  // ── Profil ────────────────────────────────────────────────────────────────
  async function handleSaveProfile(): Promise<void> {
    setProfileError(null); setProfileSuccess(false)
    if (newPwd && newPwd !== confirmPwd) {
      setProfileError('Les mots de passe ne correspondent pas'); return
    }
    setProfileLoading(true)
    try {
      const body: Record<string, string> = {}
      if (name !== session?.user?.name) body.name = name
      if (email !== session?.user?.email) body.email = email
      if (newPwd) { body.currentPassword = currentPwd; body.newPassword = newPwd }
      body.gender = gender  // toujours inclus (valeur par défaut NEUTRAL si inchangé)
      if (Object.keys(body).length === 0) { setProfileSuccess(true); return }
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const e = await res.json() as { error: string }
        throw new Error(e.error)
      }
      await updateSession()
      setProfileSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Parchemin handlers ────────────────────────────────────────────────────
  async function handleEnableNotifications(): Promise<void> {
    setIsSubscribing(true)
    try {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'denied') return
      const granted = await requestNotificationPermission()
      if (!granted) return
      await subscribeToPush()
      setPermissionGranted(true)
      setIsSubscribed(true)
    } finally {
      setIsSubscribing(false)
    }
  }

  async function handleDisableNotifications(): Promise<void> {
    setIsUnsubscribing(true)
    try {
      const reg = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready : null
      const pushSub = reg ? await reg.pushManager.getSubscription() : null
      if (pushSub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: pushSub.endpoint }),
        })
        await pushSub.unsubscribe()
      }
      setIsSubscribed(false)
    } finally {
      setIsUnsubscribing(false)
    }
  }

  async function handleTestNotification(): Promise<void> {
    setIsTesting(true)
    try {
      await fetch('/api/push/test', { method: 'POST' })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleToggleNotifyOnCreate(val: boolean): Promise<void> {
    setNotifyOnCreate(val)
    setPrefsLoading(true)
    try {
      await fetch('/api/parchemin/preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notifyOnCreate: val }),
      })
    } finally {
      setPrefsLoading(false)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const border = '1px solid var(--border)'
  const hasChanges = selectedTheme !== currentTheme

  const tabStyle = (t: Tab): React.CSSProperties => ({
    backgroundColor: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'var(--bg)' : 'var(--text2)',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mon profil" size="xl" className="h-160">
      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: 'var(--surface2)' }}>
        <button style={tabStyle('profil')}      onClick={() => setTab('profil')}>Profil</button>
        <button style={tabStyle('themes')}      onClick={() => setTab('themes')}>Thèmes</button>
        <button style={tabStyle('preferences')} onClick={() => setTab('preferences')}>Préférences</button>
      </div>

      {/* ── Tab Profil ── */}
      {tab === 'profil' && (
        <div className="flex flex-col gap-4">
          <Input label="Nom" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          {/* Genre — utilisé pour les titres d'honneur du module Labeur */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
              Titre d'honneur (Labeur)
            </label>
            <div className="flex gap-2">
              {([
                { value: 'NEUTRAL', label: 'Neutre'  },
                { value: 'MALE',    label: 'Masculin' },
                { value: 'FEMALE',  label: 'Féminin'  },
              ] as { value: Gender; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: gender === value ? 'var(--accent)' : 'var(--surface2)',
                    color:           gender === value ? '#fff' : 'var(--text2)',
                    border:          gender === value ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Détermine la forme de ton titre (ex : Seigneur / Dame / Suzerain·e)
            </p>
          </div>

          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            CHANGER LE MOT DE PASSE
          </p>
          <Input label="Mot de passe actuel" type="password" value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)} placeholder="••••••••" />
          <Input label="Nouveau mot de passe" type="password" value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)} placeholder="min. 8 caractères" />
          <Input label="Confirmer" type="password" value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" />
          {profileError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{profileError}</p>}
          {profileSuccess && <p className="text-sm" style={{ color: 'var(--success)' }}>✓ Profil mis à jour</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" size="md" onClick={onClose}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={profileLoading}
              onClick={() => void handleSaveProfile()}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab Préférences ── */}
      {tab === 'preferences' && (
        <div className="flex flex-col gap-8">

          {/* ── Module : Fief ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
              <p className="text-xs font-semibold tracking-widest uppercase px-2" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Fief
              </p>
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            </div>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: 'var(--surface2)' }}
            >
              <div className="flex items-center gap-3">
                {isSubscribed
                  ? <Bell size={18} style={{ color: 'var(--accent)' }} />
                  : <BellOff size={18} style={{ color: 'var(--muted)' }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {isSubscribed ? 'Notifications activées' : 'Notifications désactivées'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {isSubscribed ? 'Cet appareil reçoit les rappels' : 'Activer pour recevoir les rappels'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isSubscribed && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleTestNotification()}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
                    >
                      {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Tester
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDisableNotifications()}
                      disabled={isUnsubscribing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--danger)' }}
                    >
                      {isUnsubscribing ? <Loader2 size={13} className="animate-spin" /> : <BellOff size={13} />}
                      Désactiver
                    </button>
                  </>
                )}
                {!isSubscribed && (
                  <button
                    type="button"
                    onClick={() => void handleEnableNotifications()}
                    disabled={isSubscribing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {isSubscribing && <Loader2 size={13} className="animate-spin" />}
                    {permissionGranted ? 'Réactiver' : 'Activer'}
                  </button>
                )}
              </div>
            </div>
          </div>{/* end module Fief */}

          {/* ── Module : Parchemin ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
              <p className="text-xs font-semibold tracking-widest uppercase px-2" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Parchemin
              </p>
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            </div>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: 'var(--surface2)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Notifier à la création
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Prévenir l'autre membre quand tu crées une note
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyOnCreate}
                onClick={() => void handleToggleNotifyOnCreate(!notifyOnCreate)}
                disabled={prefsLoading}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60"
                style={{ backgroundColor: notifyOnCreate ? 'var(--accent)' : 'var(--surface)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: notifyOnCreate ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>{/* end module Parchemin */}

        </div>
      )}

      {/* ── Tab Thèmes ── */}
      {tab === 'themes' && (
        <div className="flex flex-col gap-5">

          {/* Liste des thèmes */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              THÈMES DISPONIBLES
            </p>
            {themesLoading ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Chargement…</p>
            ) : (
              <div className="flex flex-col gap-1">
                {themes.map((t) => {
                  const vars = t.cssVars ? JSON.parse(t.cssVars) as Record<string, string> : null
                  const isSelected = selectedTheme === t.name
                  const isActive = currentTheme === t.name
                  const isSystem = t.isDefault || t.createdBy === null
                  const canDelete = !isSystem && t.createdBy === session?.user?.id && !isActive

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-dim)' : 'var(--surface2)',
                        border: isSelected ? '1px solid var(--accent)' : border,
                      }}
                    >
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => handleSelectTheme(t.name)}
                      >
                        <ThemePreview cssVars={vars} />
                        <span className="text-sm font-medium" style={{
                          color: isSelected ? 'var(--accent)' : 'var(--text)',
                          fontFamily: 'var(--font-body)',
                        }}>
                          {t.label}
                        </span>
                        {isSystem && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            backgroundColor: 'var(--surface)',
                            color: 'var(--muted)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            système
                          </span>
                        )}
                        {/* Indicateur : thème sauvegardé en BDD */}
                        {isActive && !hasChanges && (
                          <span className="text-xs" style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                            ✓ actif
                          </span>
                        )}
                      </button>

                      {/* Bouton suppression — custom uniquement */}
                      {!isSystem && t.createdBy === session?.user?.id && (
                        <button
                          onClick={() => void handleDeleteTheme(t.name)}
                          disabled={!canDelete}
                          title={isActive ? 'Impossible de supprimer le thème actif' : 'Supprimer'}
                          className="ml-3 w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                          style={{
                            color: canDelete ? 'var(--danger)' : 'var(--muted2)',
                            backgroundColor: 'transparent',
                            border: `1px solid ${canDelete ? 'var(--danger)' : 'var(--border)'}`,
                            cursor: canDelete ? 'pointer' : 'not-allowed',
                            opacity: canDelete ? 1 : 0.4,
                            fontSize: 13,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {deleteError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{deleteError}</p>}

            {/* ── Barre de confirmation ── */}
            {hasChanges && (
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl mt-1"
                style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--accent)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>
                  Appliquer ce thème par défaut ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelTheme}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{
                      color: 'var(--muted)',
                      border: border,
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Annuler
                  </button>
                  <Button variant="primary" size="sm" isLoading={applyLoading}
                    onClick={() => void handleApplyTheme()}>
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
            {applySuccess && !hasChanges && (
              <p className="text-sm" style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                ✓ Thème enregistré
              </p>
            )}
          </div>

          {/* ── Créer un thème custom ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              CRÉER UN THÈME
            </p>
            <Input label="Nom du thème" type="text" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Minuit Vert" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Base</label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((b) => (
                  <button key={b} onClick={() => setNewBase(b)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: newBase === b ? 'var(--accent)' : 'var(--surface2)',
                      color: newBase === b ? 'var(--bg)' : 'var(--text2)',
                      border: newBase === b ? '1px solid var(--accent)' : border,
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                    }}>
                    {b === 'dark' ? '● Sombre' : '○ Clair'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Couleur d'accent</label>
              <div className="flex items-center gap-3">
                <input type="color" value={newAccent} onChange={(e) => setNewAccent(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  style={{ padding: 2 }} />
                <span className="text-sm font-medium uppercase" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {newAccent}
                </span>
                {preview && (
                  <div className="flex gap-1 ml-2">
                    {(['--bg', '--surface', '--surface2', '--accent', '--text', '--success', '--danger'] as const).map((v) => (
                      <div key={v} title={v} className="w-5 h-5 rounded-md border"
                        style={{ backgroundColor: preview[v], borderColor: 'var(--border)' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {createError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{createError}</p>}
            <Button variant="primary" size="md" isLoading={createLoading}
              onClick={() => void handleCreateTheme()}>
              Créer et appliquer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Calcul aperçu côté client ─────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360, sNorm = s / 100, lNorm = l / 100
  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
  const p = 2 * lNorm - q
  const hue2rgb = (t: number): number => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return '#' + (sNorm === 0
    ? [lNorm, lNorm, lNorm]
    : [hNorm + 1 / 3, hNorm, hNorm - 1 / 3].map(hue2rgb)
  ).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function computePreview(accent: string, base: 'dark' | 'light'): Record<string, string> {
  if (!accent.match(/^#[0-9a-fA-F]{6}$/)) return {}
  const [h, s] = hexToHsl(accent)
  if (base === 'dark') {
    return {
      '--bg':       hslToHex(h, Math.max(s - 40, 5), 5),
      '--surface':  hslToHex(h, Math.max(s - 35, 6), 8),
      '--surface2': hslToHex(h, Math.max(s - 30, 8), 12),
      '--accent':   accent,
      '--text':     hslToHex(h, 10, 92),
      '--success':  '#43e8b0',
      '--danger':   '#f87171',
    }
  }
  return {
    '--bg':       hslToHex(h, Math.max(s - 50, 8), 95),
    '--surface':  '#ffffff',
    '--surface2': hslToHex(h, Math.max(s - 50, 5), 97),
    '--accent':   accent,
    '--text':     hslToHex(h, 15, 10),
    '--success':  '#3a7d5c',
    '--danger':   '#c9623f',
  }
}