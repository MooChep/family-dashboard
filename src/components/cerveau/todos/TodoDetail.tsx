'use client'

import { useState, type ReactElement, type ChangeEvent } from 'react'
import { type EntryPriority, type EntryAssignee } from '@prisma/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { hapticSuccess } from '@/lib/haptics'
import { type TodoEntry } from './TodoCard'

// ── Types ──

interface TodoDetailProps {
  entry:     TodoEntry | null
  onClose:   () => void
  onSaved:   (updated: TodoEntry) => void
  onDone:    (id: string) => void
}

interface PatchBody {
  content?:    string
  priority?:   EntryPriority | null
  assignedTo?: EntryAssignee
  dueDate?:    string | null
  status?:     'DONE' | 'CANCELLED'
}

// ── Helpers ──

const PRIORITY_OPTIONS: { value: EntryPriority | null; label: string; color: string }[] = [
  { value: null,     label: '○',   color: 'var(--muted)' },
  { value: 'LOW',    label: '!',   color: 'var(--muted)' },
  { value: 'MEDIUM', label: '!!',  color: 'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)' },
  { value: 'HIGH',   label: '!!!', color: 'var(--cerveau-todo)' },
]

const ASSIGNEE_OPTIONS: { value: EntryAssignee; label: string }[] = [
  { value: 'SHARED',  label: 'Partagé'  },
  { value: 'ILAN',    label: 'Ilan'     },
  { value: 'CAMILLE', label: 'Camille'  },
]

/** Formate une Date ISO en valeur YYYY-MM-DD pour <input type="date"> */
function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

// ── Composant ──

/** Panneau détail d'un Todo : édition inline contenu, priorité, assignation, date. */
export function TodoDetail({ entry, onClose, onSaved, onDone }: TodoDetailProps): ReactElement {
  const [content,    setContent]    = useState(entry?.content    ?? '')
  const [priority,   setPriority]   = useState<EntryPriority | null>(entry?.priority ?? null)
  const [assignedTo, setAssignedTo] = useState<EntryAssignee>(entry?.assignedTo as EntryAssignee ?? 'SHARED')
  const [dueDate,    setDueDate]    = useState<string>(toDateInputValue(entry?.dueDate ?? null))
  const [saving,     setSaving]     = useState(false)
  const [doneAnim,   setDoneAnim]   = useState(false)

  if (!entry) return <></>

  // ── Persistance partielle (un seul champ changé) ──

  async function patch(body: PatchBody): Promise<void> {
    const res = await fetch(`/api/cerveau/entries/${entry!.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as TodoEntry
      onSaved(updated)
    }
  }

  // ── Sauvegarde du contenu à la perte de focus ──

  function handleContentBlur(): void {
    const trimmed = content.trim()
    if (trimmed && trimmed !== entry!.content) {
      void patch({ content: trimmed })
    }
  }

  // ── Priorité ──

  function handlePriority(p: EntryPriority | null): void {
    setPriority(p)
    void patch({ priority: p })
  }

  // ── Assignation ──

  function handleAssignee(a: EntryAssignee): void {
    setAssignedTo(a)
    void patch({ assignedTo: a })
  }

  // ── Date d'échéance ──

  function handleDueDateChange(e: ChangeEvent<HTMLInputElement>): void {
    const val = e.target.value
    setDueDate(val)
    void patch({ dueDate: val || null })
  }

  // ── Cocher Done ──

  function handleDone(): void {
    if (doneAnim) return
    setDoneAnim(true)
    hapticSuccess()
    setTimeout(() => {
      onDone(entry!.id)
      onClose()
    }, 350)
  }

  // ── Sauvegarder et fermer ──

  async function handleSave(): Promise<void> {
    setSaving(true)
    const trimmed = content.trim()
    if (!trimmed) { setSaving(false); return }
    await patch({
      content:    trimmed,
      priority,
      assignedTo,
      dueDate:    dueDate || null,
    })
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
              color:         'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            ◻ Todo
          </span>
          <button
            onClick={() => void handleDone()}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '6px',
              padding:      '6px 14px',
              borderRadius: '20px',
              border:       '1.5px solid var(--cerveau-todo)',
              background:   doneAnim ? 'var(--cerveau-todo)' : 'transparent',
              color:        doneAnim ? 'var(--text-on-accent)' : 'var(--cerveau-todo)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              cursor:       'pointer',
              transition:   'background 250ms, color 250ms',
            }}
          >
            {doneAnim ? '✓ Fait !' : '◻ Marquer fait'}
          </button>
        </div>

        {/* ── Contenu éditable ── */}
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value) }}
          onBlur={handleContentBlur}
          rows={3}
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

        {/* ── Priorité ── */}
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
            Priorité
          </div>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => { handlePriority(opt.value) }}
                style={{
                  padding:      '6px 14px',
                  borderRadius: '20px',
                  border:       `1.5px solid ${priority === opt.value ? opt.color : 'var(--border)'}`,
                  background:   priority === opt.value ? `color-mix(in srgb, ${opt.color} 15%, transparent)` : 'transparent',
                  color:        opt.color,
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '13px',
                  cursor:       'pointer',
                  transition:   'border 150ms, background 150ms',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

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
            Assigné à
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

        {/* ── Date d'échéance ── */}
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
            Date d&apos;échéance
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={handleDueDateChange}
            style={{
              background:   'var(--bg)',
              border:       '1px solid var(--border)',
              borderRadius: '8px',
              padding:      '8px 12px',
              fontFamily:   'var(--font-mono)',
              fontSize:     '13px',
              color:        dueDate ? 'var(--text)' : 'var(--muted)',
              outline:      'none',
              cursor:       'pointer',
            }}
          />
          {dueDate && (
            <button
              onClick={() => { setDueDate(''); void patch({ dueDate: null }) }}
              style={{
                marginLeft:   '8px',
                background:   'transparent',
                border:       'none',
                color:        'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '12px',
                cursor:       'pointer',
                padding:      '4px',
              }}
            >
              ✕
            </button>
          )}
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
            background:   saving ? 'var(--muted)' : 'var(--cerveau-todo)',
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
