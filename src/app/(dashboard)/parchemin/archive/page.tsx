'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, CheckSquare, List, ListOrdered, RotateCcw, Trash2, Bell } from 'lucide-react'
import { useCerveauToast, CerveauToast } from '@/components/ui/CerveauToast'
import { formatRelative } from '@/lib/formatDate'
import type { NoteWithRelations, NoteFormat } from '@/lib/parchemin/types'

const FORMAT_ICONS: Record<NoteFormat, React.ElementType> = {
  TEXT:      FileText,
  CHECKLIST: CheckSquare,
  BULLETS:   List,
  NUMBERED:  ListOrdered,
  REMINDER: Bell,
}

export default function ParcheminArchivePage() {
  const router = useRouter()
  const { toast, showToast, dismiss } = useCerveauToast()
  const [notes,   setNotes]   = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetchArchived = useCallback(async () => {
    const res = await fetch('/api/parchemin/notes/archived')
    if (res.ok) {
      const { data } = await res.json() as { data: NoteWithRelations[] }
      setNotes(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetchArchived() }, [fetchArchived])

  async function deleteNote(note: NoteWithRelations) {
    const res = await fetch(`/api/parchemin/notes/${note.id}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== note.id))
      showToast('Note supprimée', 'success')
    }
  }

  async function restoreNote(note: NoteWithRelations) {
    const res = await fetch(`/api/parchemin/notes/${note.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ archivedAt: null }),
    })
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== note.id))
      showToast('Note restaurée', 'success')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 flex flex-col gap-4">
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--text2)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Archives</h1>
        <span className="text-xs font-mono" style={{ color: 'var(--text2)' }}>({notes.length})</span>
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Aucune note archivée</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notes.map(note => {
          const FormatIcon = FORMAT_ICONS[note.format]
          return (
            <div
              key={note.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FormatIcon size={15} style={{ color: 'var(--text2)', flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {note.title}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--text2)' }}>
                    {note.archivedAt ? formatRelative(new Date(note.archivedAt)) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void restoreNote(note)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: 'var(--surface2)', color: 'var(--accent)' }}
                  title="Restaurer"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteNote(note)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: 'var(--surface2)', color: 'var(--danger)' }}
                  title="Supprimer définitivement"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
