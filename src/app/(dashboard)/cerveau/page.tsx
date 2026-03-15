'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { useSession } from 'next-auth/react'
import { type EntryType } from '@prisma/client'
import { CaptureBar } from '@/components/cerveau/capture/CaptureBar'
import { CaptureSheet } from '@/components/cerveau/capture/CaptureSheet'
import { DashboardView } from '@/components/cerveau/dashboard/DashboardView'
import { PushSetup } from '@/components/cerveau/notifications/PushSetup'
import { PreferencesPanel } from '@/components/cerveau/profile/PreferencesPanel'
import { ENTRY_TYPE_META } from '@/lib/cerveau/types'

// ── Toast ──

interface Toast {
  type:    EntryType
  content: string
}

export default function CerveauPage(): ReactElement {
  const { data: session } = useSession()

  const [captureText,   setCaptureText]   = useState('')
  const [predictedType, setPredictedType] = useState<EntryType | null>(null)
  const [isSheetOpen,   setIsSheetOpen]   = useState(false)
  const [isPrefsOpen,   setIsPrefsOpen]   = useState(false)
  const [toast,         setToast]         = useState<Toast | null>(null)
  const [refreshKey,    setRefreshKey]    = useState(0)

  // ── Auto-dismiss toast après 2.5s ──
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  function handleCapture(text: string, type: EntryType | null): void {
    setCaptureText(text)
    setPredictedType(type)
    setIsSheetOpen(true)
  }

  function handleConfirmed({ type, content }: { type: EntryType; content: string }): void {
    setToast({ type, content })
    setRefreshKey((k) => k + 1)
  }

  return (
    <div
      className="flex flex-col"
      style={{ padding: '20px 16px 88px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
    >
      {/* ── Souscription push (silencieux) ── */}
      <PushSetup />

      {/* ── Titre + bouton préférences ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize:   '22px',
            fontWeight: 700,
            color:      'var(--text)',
          }}
        >
          Cerveau
        </h1>
        <button
          type="button"
          onClick={() => setIsPrefsOpen(true)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          style={{
            background:   'transparent',
            border:       'none',
            borderRadius: '8px',
            padding:      '6px',
            cursor:       'pointer',
            color:        'var(--muted)',
            display:      'flex',
            alignItems:   'center',
            transition:   'background 150ms ease',
          }}
          aria-label="Préférences"
        >
          {/* Gear icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* ── Barre de capture ── */}
      <CaptureBar
        onSubmit={handleCapture}
        userId={session?.user?.id}
      />

      {/* ── Dashboard ── */}
      <DashboardView refreshKey={refreshKey} />

      {/* ── Préférences ── */}
      <PreferencesPanel
        isOpen={isPrefsOpen}
        onClose={() => setIsPrefsOpen(false)}
      />

      {/* ── Sheet de confirmation ── */}
      <CaptureSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        rawText={captureText}
        predictedType={predictedType}
        onConfirmed={handleConfirmed}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position:     'fixed',
            bottom:       '80px',
            left:         '50%',
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            padding:      '10px 18px',
            display:      'flex',
            alignItems:   'center',
            gap:          '8px',
            boxShadow:    '0 4px 24px rgba(0,0,0,0.15)',
            zIndex:       100,
            fontFamily:   'var(--font-body)',
            fontSize:     '14px',
            color:        'var(--text)',
            whiteSpace:   'nowrap',
            // Entrée : slide + fade in 200ms · Sortie : fade out 200ms à 2300ms
            animation:    'toastIn 200ms ease both, toastOut 200ms ease 2300ms both',
          }}
        >
          {(() => {
            const Icon = ENTRY_TYPE_META[toast.type].icon
            return <Icon size={14} style={{ color: ENTRY_TYPE_META[toast.type].colorVar, flexShrink: 0 }} />
          })()}
          <span>
            <span style={{ color: 'var(--muted)' }}>Ajouté · </span>
            {toast.content.length > 40 ? toast.content.slice(0, 40) + '…' : toast.content}
          </span>
        </div>
      )}
    </div>
  )
}
