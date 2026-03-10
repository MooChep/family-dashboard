'use client'
import { useState, useEffect, type ReactElement } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTheme } from '@/components/layout/ThemeProvider'
import type { Theme } from '@/types/theme'

type Tab = 'profil' | 'themes'

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
const [tab, setTab] = useState<Tab>('profil')

  // ── Profil ────────────────────────────────────────────────────────────────
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError]     = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

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

  // Sync selectedTheme quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setName(session?.user?.name ?? '')
      setEmail(session?.user?.email ?? '')
      setProfileError(null); setProfileSuccess(false)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setSelectedTheme(currentTheme)
      setApplySuccess(false)
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

  // ── Styles ────────────────────────────────────────────────────────────────
  const border = '1px solid var(--border)'
  const hasChanges = selectedTheme !== currentTheme

  const tabStyle = (t: Tab): React.CSSProperties => ({
    backgroundColor: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'var(--bg)' : 'var(--text2)',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mon profil" size="xl">
      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: 'var(--surface2)' }}>
        <button style={tabStyle('profil')} onClick={() => setTab('profil')}>Profil</button>
        <button style={tabStyle('themes')} onClick={() => setTab('themes')}>Thèmes</button>
      </div>

      {/* ── Tab Profil ── */}
      {tab === 'profil' && (
        <div className="flex flex-col gap-4">
          <Input label="Nom" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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