'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { normalize } from '@/lib/cerveau/normalize'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { TemplateSummary } from '@/app/api/cerveau/templates/route'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'

interface SaveAsTemplateSheetProps {
  entry:     EntryWithRelations
  onClose:   () => void
  showToast: ToastFn
}

function suggestShortcut(name: string): string {
  return normalize(name)
    .split(/\s+/)
    .map(w => w.slice(0, 3))
    .join('')
    .slice(0, 12)
}

const inputClass = [
  'w-full bg-transparent text-sm outline-none py-2',
  'border-b-2 transition-colors',
].join(' ')

export function SaveAsTemplateSheet({ entry, onClose, showToast }: SaveAsTemplateSheetProps) {
  const [name, setName] = useState(entry.title)
  const [shortcut, setShortcut] = useState(suggestShortcut(entry.title))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const items = entry.listItems.map(i => i.label)
      const res = await fetch('/api/cerveau/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         name.trim(),
          shortcut:     shortcut.trim() || undefined,
          type:         entry.type,
          titlePattern: name.trim(),
          body:         entry.body,
          priority:     entry.priority,
          assignedTo:   entry.assignedTo,
          tags:         entry.tags,
          recurrence:   entry.recurrence,
          items:        items.length ? items : undefined,
        }),
      })
      const data = await res.json() as ApiResponse<TemplateSummary>
      if (data.success) {
        showToast('Template créé ✓', 'success')
        onClose()
      } else {
        showToast('Erreur lors de la création du template', 'error')
      }
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full rounded-t-2xl px-5 pt-5 pb-10"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-base" style={{ color: 'var(--text)' }}>
            Sauvegarder comme template
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={20} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Nom du template
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setShortcut(suggestShortcut(e.target.value))
              }}
              className={inputClass}
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              autoFocus
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Shortcut (optionnel) — utilisable via *{shortcut || '…'}
            </label>
            <input
              type="text"
              value={shortcut}
              onChange={e => setShortcut(e.target.value.replace(/\s/g, ''))}
              placeholder="ex: courses, revision…"
              className={inputClass}
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !name.trim()}
          className="mt-8 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {saving ? 'Enregistrement…' : 'Créer le template'}
        </button>
      </div>
    </div>
  )
}
