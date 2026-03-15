'use client'

import { useState, type ReactElement } from 'react'
import { type EntryAssignee } from '@prisma/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticLight } from '@/lib/haptics'
import { type NoteEntry } from './NoteCard'

// ── Types ──

interface NoteDetailProps {
  entry:     NoteEntry | null
  onClose:   () => void
  onSaved:   (updated: NoteEntry) => void
  onArchive: (id: string) => void
  onPin:     (id: string, pinned: boolean) => void
}

interface PatchBody {
  content?:    string
  isPinned?:   boolean
  assignedTo?: EntryAssignee
  status?:     'ARCHIVED'
}

// ── Constantes ──

const ASSIGNEE_OPTIONS: { value: EntryAssignee; label: string }[] = [
  { value: 'SHARED',  label: 'Partagé'  },
  { value: 'ILAN',    label: 'Ilan'     },
  { value: 'CAMILLE', label: 'Camille'  },
]

// ── Composant ──

/** Panneau détail d'une Note : édition plein texte, assignation, épinglage, archivage. */
export function NoteDetail({ entry, onClose, onSaved, onArchive, onPin }: NoteDetailProps): ReactElement {
  const [content,    setContent]    = useState(entry?.content    ?? '')
  const [assignedTo, setAssignedTo] = useState<EntryAssignee>(entry?.assignedTo as EntryAssignee ?? 'SHARED')
  const [saving,     setSaving]     = useState(false)

  if (!entry) return <></>

  // ── Persistance partielle ──

  async function patch(body: PatchBody): Promise<NoteEntry | null> {
    const res = await fetch(`/api/cerveau/entries/${entry!.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as NoteEntry
      onSaved(updated)
      return updated
    }
    return null
  }

  // ── Sauvegarde contenu à la perte de focus ──

  function handleContentBlur(): void {
    const trimmed = content.trim()
    if (trimmed && trimmed !== entry!.content) {
      void patch({ content: trimmed })
    }
  }

  // ── Assignation ──

  function handleAssignee(a: EntryAssignee): void {
    setAssignedTo(a)
    void patch({ assignedTo: a })
  }

  // ── Épinglage ──

  function handlePin(): void {
    hapticLight()
    const newPinned = !entry!.isPinned
    void patch({ isPinned: newPinned }).then(() => {
      onPin(entry!.id, newPinned)
    })
  }

  // ── Archivage ──

  async function handleArchive(): Promise<void> {
    setSaving(true)
    await patch({ status: 'ARCHIVED' })
    setSaving(false)
    onArchive(entry!.id)
    onClose()
  }

  // ── Sauvegarder et fermer ──

  async function handleSave(): Promise<void> {
    setSaving(true)
    const trimmed = content.trim()
    if (!trimmed) { setSaving(false); return }
    await patch({ content: trimmed, assignedTo })
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet isOpen={!!entry} onClose={onClose}>
      <div style={{ padding: '16px 20px 32px' }}>

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '11px',
              color:         'var(--cerveau-note)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            ◆ Note
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePin}
              style={{
                padding:      '6px 12px',
                borderRadius: '20px',
                border:       `1.5px solid ${entry.isPinned ? 'var(--cerveau-note)' : 'var(--border)'}`,
                background:   entry.isPinned ? 'color-mix(in srgb, var(--cerveau-note) 15%, transparent)' : 'transparent',
                color:        entry.isPinned ? 'var(--cerveau-note)' : 'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '12px',
                cursor:       'pointer',
                transition:   'border 150ms, background 150ms',
              }}
            >
              {entry.isPinned ? '📌 Épinglée' : '📌 Épingler'}
            </button>
            <button
              onClick={() => void handleArchive()}
              disabled={saving}
              style={{
                padding:      '6px 12px',
                borderRadius: '20px',
                border:       '1.5px solid var(--border)',
                background:   'transparent',
                color:        'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '12px',
                cursor:       saving ? 'not-allowed' : 'pointer',
              }}
            >
              🗂 Archiver
            </button>
          </div>
        </div>

        {/* ── Contenu éditable ── */}
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value) }}
          onBlur={handleContentBlur}
          rows={5}
          style={{
            width:        '100%',
            background:   'var(--bg)',
            border:       '1px solid var(--border)',
            borderRadius: '8px',
            padding:      '10px 12px',
            fontFamily:   'var(--font-body)',
            fontSize:     '15px',
            color:        'var(--text)',
            resize:       'none',
            outline:      'none',
            lineHeight:   '1.5',
            boxSizing:    'border-box',
          }}
        />

        {/* ── Assignation ── */}
        <div style={{ marginTop: '20px' }}>
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
            Pour
          </div>
          <div className="flex gap-2">
            {ASSIGNEE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { handleAssignee(opt.value) }}
                style={{
                  padding:      '6px 14px',
                  borderRadius: '20px',
                  border:       `1.5px solid ${assignedTo === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  background:   assignedTo === opt.value ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color:        assignedTo === opt.value ? 'var(--accent)' : 'var(--muted)',
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '12px',
                  cursor:       'pointer',
                  transition:   'border 150ms, background 150ms',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bouton Sauvegarder ── */}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !content.trim()}
          style={{
            marginTop:    '28px',
            width:        '100%',
            padding:      '12px',
            borderRadius: '10px',
            border:       'none',
            background:   saving ? 'var(--muted)' : 'var(--cerveau-note)',
            color:        'var(--text-on-accent)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '13px',
            fontWeight:   700,
            cursor:       saving ? 'not-allowed' : 'pointer',
            transition:   'background 200ms',
          }}
        >
          {saving ? 'Enregistrement…' : 'Sauvegarder'}
        </button>

      </div>
    </BottomSheet>
  )
}
