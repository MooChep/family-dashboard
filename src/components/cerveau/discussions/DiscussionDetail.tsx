'use client'

import { useState, type ReactElement } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { type DiscussionEntry } from './DiscussionCard'
import { ConversionSheet } from './ConversionSheet'

// ── Types ──

interface DiscussionDetailProps {
  entry:       DiscussionEntry | null
  onClose:     () => void
  onSaved:     (updated: DiscussionEntry) => void
  onDone:      (id: string) => void
  onConverted: (id: string) => void
}

interface PatchBody {
  description?: string | null
  isUrgent?:    boolean
}

// ── Composant ──

/**
 * Panneau détail d'une Discussion : édition de la description, toggle urgence,
 * options de conversion vers Todo / Note / Projet, et "on en a parlé".
 */
export function DiscussionDetail({
  entry,
  onClose,
  onSaved,
  onDone,
  onConverted,
}: DiscussionDetailProps): ReactElement {
  const [description,     setDescription]     = useState(entry?.description ?? '')
  const [isUrgent,        setIsUrgent]        = useState(entry?.isUrgent ?? false)
  const [loading,         setLoading]         = useState(false)
  const [conversionOpen,  setConversionOpen]  = useState(false)

  if (!entry) return <></>

  // ── Persistance partielle ──

  async function patch(body: PatchBody): Promise<void> {
    const res = await fetch(`/api/cerveau/entries/${entry!.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as DiscussionEntry
      onSaved(updated)
    }
  }

  // ── Description : sauvegarde au blur ──

  function handleDescriptionBlur(): void {
    const trimmed = description.trim() || null
    if (trimmed !== (entry!.description ?? null)) {
      void patch({ description: trimmed })
    }
  }

  // ── Toggle urgence ──

  function handleUrgentToggle(): void {
    hapticLight()
    const next = !isUrgent
    setIsUrgent(next)
    void patch({ isUrgent: next })
  }

  // ── On en a parlé : DELETE ──

  async function handleDone(): Promise<void> {
    setLoading(true)
    hapticSuccess()
    try {
      await fetch(`/api/cerveau/entries/${entry!.id}`, { method: 'DELETE' })
      onDone(entry!.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <BottomSheet isOpen={!!entry} onClose={onClose}>
        <div style={{ padding: '16px 20px 40px' }}>

          {/* ── En-tête ── */}
          <div className="flex items-start justify-between" style={{ marginBottom: '16px', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '11px',
                  color:         'var(--cerveau-discussion)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom:  '6px',
                }}
              >
                ◈ Discussion
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize:   '16px',
                  fontWeight: 600,
                  color:      isUrgent ? 'var(--error)' : 'var(--text)',
                  lineHeight: '1.4',
                }}
              >
                {entry.content}
              </div>
            </div>

            {/* ── Toggle urgence ── */}
            <button
              onClick={handleUrgentToggle}
              style={{
                padding:      '6px 12px',
                borderRadius: '20px',
                border:       `1.5px solid ${isUrgent ? 'var(--error)' : 'var(--border)'}`,
                background:   isUrgent
                  ? 'color-mix(in srgb, var(--error) 15%, transparent)'
                  : 'transparent',
                color:        isUrgent ? 'var(--error)' : 'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '12px',
                cursor:       'pointer',
                transition:   'border 150ms, background 150ms',
                flexShrink:   0,
              }}
            >
              {isUrgent ? '!! Urgent' : '! Urgent ?'}
            </button>
          </div>

          {/* ── Description ── */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '10px',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '8px',
              }}
            >
              Détails
            </div>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value) }}
              onBlur={handleDescriptionBlur}
              rows={4}
              placeholder="Ajouter des détails pendant que c'est frais…"
              style={{
                width:        '100%',
                background:   'var(--bg)',
                border:       '1px solid var(--border)',
                borderRadius: '8px',
                padding:      '10px 12px',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
                color:        'var(--text)',
                resize:       'none',
                outline:      'none',
                lineHeight:   '1.5',
                boxSizing:    'border-box',
              }}
            />
          </div>

          {/* ── Convertir en… ── */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '10px',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '10px',
              }}
            >
              Convertir en…
            </div>
            <button
              onClick={() => { setConversionOpen(true) }}
              style={{
                width:        '100%',
                padding:      '11px 16px',
                borderRadius: '10px',
                border:       '1.5px solid var(--cerveau-discussion)',
                background:   'color-mix(in srgb, var(--cerveau-discussion) 8%, transparent)',
                color:        'var(--cerveau-discussion)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '13px',
                cursor:       'pointer',
                textAlign:    'left',
                transition:   'background 150ms',
              }}
            >
              ◈ → Todo / Note / Projet…
            </button>
          </div>

          {/* ── On en a parlé ── */}
          <button
            onClick={() => void handleDone()}
            disabled={loading}
            style={{
              width:        '100%',
              padding:      '13px',
              borderRadius: '10px',
              border:       'none',
              background:   loading ? 'var(--muted)' : 'var(--cerveau-discussion)',
              color:        'var(--text-on-accent)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '13px',
              fontWeight:   700,
              cursor:       loading ? 'not-allowed' : 'pointer',
              transition:   'background 200ms',
            }}
          >
            ✓ On en a parlé
          </button>

        </div>
      </BottomSheet>

      {/* ── Sheet de conversion (empilée) ── */}
      <ConversionSheet
        entry={conversionOpen ? entry : null}
        onClose={() => { setConversionOpen(false) }}
        onConverted={(id) => {
          setConversionOpen(false)
          onConverted(id)
          onClose()
        }}
      />
    </>
  )
}
