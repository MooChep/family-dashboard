'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollText, Bell, FileText, CheckSquare, List, ListOrdered, Plus, Pin, Archive } from 'lucide-react'
import { SwipeableCard } from '@/components/cerveau/SwipeableCard'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import { formatRelative, formatCountdown } from '@/lib/cerveau/formatDate'
import type { NoteWithRelations, NoteFormat } from '@/lib/parchemin/types'

const FORMAT_ICONS: Record<NoteFormat, React.ElementType> = {
  TEXT:      FileText,
  CHECKLIST: CheckSquare,
  BULLETS:   List,
  NUMBERED:  ListOrdered,
}

function sortNotes(notes: NoteWithRelations[]): { pinned: NoteWithRelations[]; unpinned: NoteWithRelations[] } {
  const pinned   = notes.filter(n => n.pinned)
  const withDue  = notes
    .filter(n => !n.pinned && n.dueDate)
    .sort((a, b) => new Date(a.dueDate as unknown as string).getTime() - new Date(b.dueDate as unknown as string).getTime())
  const rest     = notes.filter(n => !n.pinned && !n.dueDate)
  return { pinned, unpinned: [...withDue, ...rest] }
}

export default function ParcheminPage() {
  const router = useRouter()
  const { toast, showToast, dismiss } = useCerveauToast()
  const [notes,         setNotes]         = useState<NoteWithRelations[]>([])
  const [loading,       setLoading]       = useState(true)
  const [archivedCount, setArchivedCount] = useState(0)

  const fetchNotes = useCallback(async () => {
    const [activeRes, archivedRes] = await Promise.all([
      fetch('/api/parchemin/notes'),
      fetch('/api/parchemin/notes/archived'),
    ])
    if (activeRes.ok) {
      const { data } = await activeRes.json() as { data: NoteWithRelations[] }
      setNotes(data ?? [])
    }
    if (archivedRes.ok) {
      const { data } = await archivedRes.json() as { data: NoteWithRelations[] }
      setArchivedCount((data ?? []).length)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetchNotes() }, [fetchNotes])

  async function archiveNote(note: NoteWithRelations) {
    setNotes(prev => prev.filter(n => n.id !== note.id))
    setArchivedCount(c => c + 1)
    showToast('Archivé', 'success', async () => {
      await fetch(`/api/parchemin/notes/${note.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivedAt: null }),
      })
      await fetchNotes()
    })
    await fetch(`/api/parchemin/notes/${note.id}`, { method: 'DELETE' })
  }

  async function togglePin(note: NoteWithRelations) {
    const res = await fetch(`/api/parchemin/notes/${note.id}/pin`, { method: 'POST' })
    if (res.ok) {
      const { data } = await res.json() as { data: NoteWithRelations }
      setNotes(prev => prev.map(n => n.id === data.id ? data : n))
      showToast(data.pinned ? 'Épinglé' : 'Désépinglé', 'success')
    }
  }

  const { pinned, unpinned } = sortNotes(notes)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-36 flex flex-col gap-5">
      <CerveauToast toast={toast} onDismiss={dismiss} />

      <div className="flex items-center gap-3">
        <ScrollText size={22} style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Parchemin</h1>
      </div>

      {pinned.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-widest uppercase px-1" style={{ color: 'var(--text2)' }}>
            Épinglées
          </p>
          {pinned.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onArchive={() => void archiveNote(note)}
              onPin={() => void togglePin(note)}
              onClick={() => router.push(`/parchemin/${note.id}`)}
            />
          ))}
        </section>
      )}

      {unpinned.length > 0 && (
        <section className="flex flex-col gap-2">
          {pinned.length > 0 && (
            <p className="text-[11px] font-semibold tracking-widest uppercase px-1" style={{ color: 'var(--text2)' }}>
              Notes
            </p>
          )}
          {unpinned.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onArchive={() => void archiveNote(note)}
              onPin={() => void togglePin(note)}
              onClick={() => router.push(`/parchemin/${note.id}`)}
            />
          ))}
        </section>
      )}

      {notes.length === 0 && (
        <div className="text-center py-12">
          <ScrollText size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text2)' }} />
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Aucune note pour l&apos;instant</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push('/parchemin/archive')}
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
      >
        Voir les archives{archivedCount > 0 ? ` (${archivedCount})` : ''}
      </button>

      {/* Bouton "+ Nouvelle note" — fixé en bas comme l'ajout d'item */}
      <div
        className="fixed left-0 right-0 px-4 z-10"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/parchemin/new')}
            className="flex items-center gap-2 w-full px-4 py-3.5 rounded-xl text-sm shadow-lg"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <Plus size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text2)' }}>Nouvelle note…</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteCard({
  note,
  onArchive,
  onPin,
  onClick,
}: {
  note:      NoteWithRelations
  onArchive: () => void
  onPin:     () => void
  onClick:   () => void
}) {
  const FormatIcon = FORMAT_ICONS[note.format as NoteFormat]
  const dueStr     = note.dueDate ? (note.dueDate as unknown as string) : null
  const isOverdue  = dueStr ? new Date(dueStr) < new Date() : false

  const previewText = note.format === 'TEXT'
    ? (note.body?.slice(0, 40) ?? '') + (note.body && note.body.length > 40 ? '…' : '')
    : note.format === 'CHECKLIST'
      ? (() => {
          const remaining = (note.items as { checked: boolean }[]).filter(i => !i.checked).length
          return remaining === 0 && note.items.length > 0
            ? `${note.items.length} / ${note.items.length} ✓`
            : `${remaining} / ${note.items.length} restant${remaining > 1 ? 's' : ''}`
        })()
      : `${note.items.length} élément${note.items.length > 1 ? 's' : ''}`

  return (
    <div className="relative group">
      {/* Desktop: bouton épingler à gauche */}
      <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPin() }}
          title={note.pinned ? 'Désépingler' : 'Épingler'}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--surface)', color: note.pinned ? 'var(--accent)' : 'var(--text2)' }}
        >
          <Pin size={13} />
        </button>
      </div>
      {/* Desktop: bouton archiver à droite */}
      <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onArchive() }}
          title="Archiver"
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
        >
          <Archive size={13} />
        </button>
      </div>

      <SwipeableCard
        onSwipeLeft={onArchive}
        onSwipeRight={onPin}
        leftLabel="Archiver"
        rightLabel={note.pinned ? 'Désépingler' : 'Épingler'}
        leftColor="bg-amber-600"
        rightColor="bg-emerald-600"
      >
        <div
          className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
          style={{ backgroundColor: 'var(--surface)' }}
          onClick={onClick}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FormatIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                {note.title}
              </p>
              <p className="font-mono text-[10px] truncate" style={{ color: 'var(--text2)' }}>
                {previewText}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {note.notifAt && !note.notifSentAt && (
              <Bell size={12} style={{ color: 'var(--accent)' }} />
            )}
            {dueStr && (
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isOverdue
                    ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                    : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: isOverdue ? 'var(--danger)' : 'var(--accent)',
                }}
              >
                {formatCountdown(new Date(dueStr))}
              </span>
            )}
            {!dueStr && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--text2)' }}>
                {formatRelative(new Date(note.updatedAt as unknown as string))}
              </span>
            )}
          </div>
        </div>
      </SwipeableCard>
    </div>
  )
}
