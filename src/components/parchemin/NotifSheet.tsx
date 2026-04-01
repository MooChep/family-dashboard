'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { DatePickerFR } from '@/components/cerveau/DatePickerFR'

interface NotifSheetProps {
  isOpen:    boolean
  onClose:   () => void
  noteId:    string
  noteTitle: string
  existing?: { notifAt: string; notifTo: string; notifBody?: string }
  onSaved?:  () => void
}

type Recipient = 'ILAN' | 'CAMILLE' | 'BOTH'

export function NotifSheet({ isOpen, onClose, noteId, noteTitle, existing, onSaved }: NotifSheetProps) {
  const [recipient, setRecipient] = useState<Recipient>(
    (existing?.notifTo as Recipient | undefined) ?? 'BOTH'
  )
  const [notifAt,   setNotifAt]   = useState(existing?.notifAt ?? '')
  const [notifBody, setNotifBody] = useState(existing?.notifBody ?? '')
  const [saving,    setSaving]    = useState(false)

  if (!isOpen) return null

  async function handleSubmit() {
    if (!notifAt) return
    setSaving(true)
    try {
      await fetch(`/api/parchemin/notes/${noteId}/notif`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notifAt, notifTo: recipient, notifBody: notifBody || undefined }),
      })
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    setSaving(true)
    try {
      await fetch(`/api/parchemin/notes/${noteId}/notif`, { method: 'DELETE' })
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const RECIPIENTS: { id: Recipient; label: string }[] = [
    { id: 'ILAN',    label: 'Ilan'     },
    { id: 'CAMILLE', label: 'Camille'  },
    { id: 'BOTH',    label: 'Les deux' },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--bg)',
          maxHeight: '90dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            Rappel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Note title context */}
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Pour : <span style={{ color: 'var(--text)' }} className="font-medium">{noteTitle}</span>
          </p>

          {/* Recipient */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Envoyer à</span>
            <div className="flex gap-2">
              {RECIPIENTS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecipient(r.id)}
                  className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors"
                  style={
                    recipient === r.id
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { backgroundColor: 'var(--surface)', color: 'var(--text2)' }
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/time */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Quand ?</span>
            <div
              className="px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <DatePickerFR value={notifAt} onChange={setNotifAt} showTime />
            </div>
          </div>

          {/* Optional message */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
              Message (optionnel)
            </span>
            <textarea
              value={notifBody}
              onChange={e => setNotifBody(e.target.value)}
              placeholder="Message du rappel..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
              style={{
                backgroundColor: 'var(--surface)',
                color:           'var(--text)',
                border:          '1px solid var(--border)',
              }}
            />
          </div>

          {/* Cancel existing notif */}
          {existing && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--danger)' }}
            >
              Annuler le rappel
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !notifAt}
            className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-opacity"
            style={{
              backgroundColor: 'var(--accent)',
              color:           '#fff',
              opacity:         saving || !notifAt ? 0.5 : 1,
            }}
          >
            {saving ? 'Enregistrement…' : 'ENVOYER'}
          </button>
        </div>
      </div>
    </>
  )
}
