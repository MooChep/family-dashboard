'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Bell, Pencil, CheckSquare, Square, FileText, List, ListOrdered, X, Plus,
  GripVertical, ListChecks, House,
} from 'lucide-react'
import { DatePickerFR } from '@/components/cerveau/DatePickerFR'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import type { NoteWithRelations, NoteFormat } from '@/lib/parchemin/types'
import type { ParcheminItem } from '@prisma/client'

const FORMAT_OPTIONS: { id: NoteFormat; icon: React.ElementType; label: string }[] = [
  { id: 'TEXT',      icon: FileText,    label: 'Texte'   },
  { id: 'CHECKLIST', icon: CheckSquare, label: 'Liste'   },
  { id: 'BULLETS',   icon: List,        label: 'Puces'   },
  { id: 'NUMBERED',  icon: ListOrdered, label: 'Numéros' },
]

const RECIPIENTS: { id: 'ILAN' | 'CAMILLE' | 'BOTH'; label: string }[] = [
  { id: 'ILAN',    label: 'Ilan'     },
  { id: 'CAMILLE', label: 'Camille'  },
  { id: 'BOTH',    label: 'Les deux' },
]

function toDatetimeLocal(utcString: string): string {
  const d   = new Date(utcString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateOnly(utcString: string): string {
  const d   = new Date(utcString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ParcheminNotePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router  = useRouter()
  const { toast, showToast, dismiss } = useCerveauToast()

  const [note,         setNote]         = useState<NoteWithRelations | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [editMode,     setEditMode]     = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const addItemInputRef = useRef<HTMLInputElement>(null)

  // Edit fields
  const [editTitle,   setEditTitle]   = useState('')
  const [editBody,    setEditBody]    = useState('')
  const [editFormat,  setEditFormat]  = useState<NoteFormat>('TEXT')
  const [editDueDate, setEditDueDate] = useState('')

  // Inline notif panel
  const [showNotif,   setShowNotif]   = useState(false)
  const [notifMode,   setNotifMode]   = useState<'now' | 'schedule'>('now')
  const [notifTo,     setNotifTo]     = useState<'ILAN' | 'CAMILLE' | 'BOTH'>('BOTH')
  const [notifAt,     setNotifAt]     = useState('')
  const [notifBody,   setNotifBody]   = useState('')
  const [savingNotif, setSavingNotif] = useState(false)

  // Drag state (ID-based pour éviter les décalages d'index pendant le réordonnancement)
  const draggingRef    = useRef<string | null>(null)
  const dropTargetRef  = useRef<string | null>(null)
  const noteRef        = useRef<NoteWithRelations | null>(null)
  const [draggingId,   setDraggingId]   = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  useEffect(() => { noteRef.current = note }, [note])

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const fetchNote = useCallback(async () => {
    const res = await fetch(`/api/parchemin/notes/${id}`)
    if (res.ok) {
      const { data } = await res.json() as { data: NoteWithRelations }
      setNote(data)
      setEditTitle(data.title)
      setEditBody(data.body ?? '')
      setEditFormat(data.format)
      setEditDueDate(data.dueDate ? toDateOnly(data.dueDate as unknown as string) : '')
      setNotifTo((data.notifTo as 'ILAN' | 'CAMILLE' | 'BOTH') ?? 'BOTH')
      setNotifAt(data.notifAt ? toDatetimeLocal(data.notifAt as unknown as string) : '')
      setNotifBody(data.notifBody ?? '')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { void fetchNote() }, [fetchNote])

  // Focus add-item input when it becomes visible
  useEffect(() => {
    if (isAddingItem) addItemInputRef.current?.focus()
  }, [isAddingItem])

  // Auto-resize textarea quand le contenu ou le mode édition change
  useEffect(() => {
    if (editMode && bodyRef.current) {
      bodyRef.current.style.height = 'auto'
      bodyRef.current.style.height = bodyRef.current.scrollHeight + 'px'
    }
  }, [editBody, editMode])

  async function patchNote(payload: Record<string, unknown>) {
    const res = await fetch(`/api/parchemin/notes/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    if (res.ok) {
      const { data } = await res.json() as { data: NoteWithRelations }
      setNote(data)
      return data
    }
    return null
  }

  async function patchItem(itemId: string, payload: { label?: string; checked?: boolean }) {
    const res = await fetch(`/api/parchemin/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    if (res.ok) {
      const { data } = await res.json() as { data: ParcheminItem }
      setNote(prev => prev ? { ...prev, items: prev.items.map(i => i.id === data.id ? data : i) } : prev)
    }
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/parchemin/items/${itemId}`, { method: 'DELETE' })
    setNote(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
  }

  async function addItem(label: string) {
    const maxOrder = note?.items.reduce((m, i) => Math.max(m, i.order), -1) ?? -1
    const res = await fetch(`/api/parchemin/notes/${id}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ label, order: maxOrder + 1 }),
    })
    if (res.ok) {
      const { data } = await res.json() as { data: ParcheminItem }
      setNote(prev => prev ? { ...prev, items: [...prev.items, data] } : prev)
    }
  }

  async function toggleItem(item: ParcheminItem) {
    // Optimistic
    setNote(prev => prev
      ? { ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i) }
      : prev)
    await fetch(`/api/parchemin/items/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ checked: !item.checked }),
    })
  }

  async function checkAll(checked: boolean) {
    if (!note) return
    setNote(prev => prev ? { ...prev, items: prev.items.map(i => ({ ...i, checked })) } : prev)
    await Promise.all(
      note.items.map(i =>
        fetch(`/api/parchemin/items/${i.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ checked }),
        })
      )
    )
  }

  async function handleFormatChange(fmt: NoteFormat) {
    if (!note) return
    const prev = note.format
    if (prev === fmt) return

    if (prev === 'TEXT' && fmt !== 'TEXT') {
      const lines = (note.body ?? '').split('\n').filter(l => l.trim())
      await patchNote({ format: fmt, body: null })
      for (let i = 0; i < lines.length; i++) {
        await fetch(`/api/parchemin/notes/${id}/items`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ label: lines[i], order: i }),
        })
      }
      await fetchNote()
    } else if (prev !== 'TEXT' && fmt === 'TEXT') {
      const bodyText = [...note.items]
        .sort((a, b) => a.order - b.order)
        .map(i => i.label)
        .join('\n')
      await patchNote({ format: fmt, body: bodyText || null })
      // Supprimer tous les items maintenant capturés dans le corps
      await Promise.all(note.items.map(i =>
        fetch(`/api/parchemin/items/${i.id}`, { method: 'DELETE' })
      ))
      await fetchNote()
    } else {
      await patchNote({ format: fmt })
      setEditFormat(fmt)
    }
  }

  // ── Drag to reorder (ID-based) ───────────────────────────────────────────────
  function handleDragStart(itemId: string) {
    draggingRef.current = itemId
    setDraggingId(itemId)
  }

  function handleDragEnter(itemId: string) {
    dropTargetRef.current = itemId
    setDropTargetId(itemId)
  }

  async function handleDragEnd() {
    const fromId = draggingRef.current
    const toId   = dropTargetRef.current
    setDraggingId(null)
    setDropTargetId(null)
    draggingRef.current   = null
    dropTargetRef.current = null

    if (!fromId || !toId || fromId === toId) return
    const current = noteRef.current
    if (!current) return

    const base = [...current.items].sort((a, b) => a.order - b.order)
    const fromIdx = base.findIndex(i => i.id === fromId)
    const toIdx   = base.findIndex(i => i.id === toId)
    if (fromIdx < 0 || toIdx < 0) return

    const arr = [...base]
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)

    setNote(prev => prev
      ? { ...prev, items: arr.map((item, i) => ({ ...item, order: i })) }
      : prev)

    await Promise.all(arr.map((item, i) =>
      fetch(`/api/parchemin/items/${item.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order: i }),
      })
    ))
  }

  function handleTitleBlur() {
    if (editTitle.trim() && editTitle !== note?.title) {
      void patchNote({ title: editTitle })
    }
  }

  function handleBodyBlur() {
    if (editBody !== (note?.body ?? '')) {
      void patchNote({ body: editBody || null })
    }
  }

  function handleDueDateChange(v: string) {
    setEditDueDate(v)
    void patchNote({ dueDate: v || null })
  }

  function adjustTextarea(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  async function saveNotif() {
    if (!notifAt) return
    setSavingNotif(true)
    try {
      await fetch(`/api/parchemin/notes/${id}/notif`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notifAt, notifTo, notifBody: notifBody || null }),
      })
      setShowNotif(false)
      await fetchNote()
      showToast('Rappel programmé', 'success')
    } finally {
      setSavingNotif(false)
    }
  }

  async function sendNowNotif() {
    setSavingNotif(true)
    try {
      await fetch(`/api/parchemin/notes/${id}/notif`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sendNow: true, notifTo, notifBody: notifBody || null }),
      })
      setShowNotif(false)
      await fetchNote()
      showToast('Notification envoyée', 'success')
    } finally {
      setSavingNotif(false)
    }
  }

  async function cancelNotif() {
    setSavingNotif(true)
    try {
      await fetch(`/api/parchemin/notes/${id}/notif`, { method: 'DELETE' })
      setShowNotif(false)
      await fetchNote()
      showToast('Rappel annulé', 'success')
    } finally {
      setSavingNotif(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="text-sm" style={{ color: 'var(--text2)' }}>← Retour</button>
        <p className="mt-4 text-sm" style={{ color: 'var(--text2)' }}>Note introuvable.</p>
      </div>
    )
  }

  const isLinked  = !!note.parentId
  const hasItems  = note.format !== 'TEXT'
  const hasNotif  = !!(note.notifAt && !note.notifSentAt)
  const allChecked = note.format === 'CHECKLIST' && note.items.length > 0 && note.items.every(i => i.checked)

  const baseItems = note.format === 'CHECKLIST'
    ? [...note.items].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1
        return a.order - b.order
      })
    : [...note.items].sort((a, b) => a.order - b.order)

  // Réordonne visuellement en temps réel pendant le drag
  const sortedItems = (() => {
    if (!draggingId || !dropTargetId || draggingId === dropTargetId) return baseItems
    const fromIdx = baseItems.findIndex(i => i.id === draggingId)
    const toIdx   = baseItems.findIndex(i => i.id === dropTargetId)
    if (fromIdx < 0 || toIdx < 0) return baseItems
    const arr = [...baseItems]
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    return arr
  })()

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-36 flex flex-col gap-4">
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Ligne boutons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-11 h-11 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => router.push('/parchemin')}
              className="w-11 h-11 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
              aria-label="Accueil Parchemin"
            >
              <House size={17} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotif(v => !v)}
              className="w-11 h-11 flex items-center justify-center rounded-xl"
              style={{
                backgroundColor: showNotif || hasNotif
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : 'var(--surface)',
                color: showNotif || hasNotif ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={() => setEditMode(v => !v)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-sm font-medium"
              style={{
                backgroundColor: editMode ? 'var(--accent)' : 'var(--surface)',
                color:           editMode ? '#fff'          : 'var(--text2)',
              }}
            >
              {editMode ? <span className="text-xs font-semibold" style={{ color: 'inherit' }}>OK</span> : <Pencil size={16} />}
            </button>
          </div>
        </div>

        {/* Titre pleine largeur sous les boutons */}
        {editMode ? (
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-transparent text-lg font-semibold outline-none px-1"
            style={{ color: 'var(--text)' }}
          />
        ) : (
          <h1 className="text-lg font-semibold leading-snug px-1 wrap-break-word" style={{ color: 'var(--text)' }}>
            {note.title}
          </h1>
        )}
      </div>

      {/* ── Panneau notif inline ────────────────────────────────────── */}
      {showNotif && (
        <div
          className="flex flex-col gap-3 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Mode toggle : Maintenant / Programmer */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg)' }}>
            {(['now', 'schedule'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setNotifMode(mode)}
                className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={
                  notifMode === mode
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text2)' }
                }
              >
                {mode === 'now' ? 'Maintenant' : 'Programmer'}
              </button>
            ))}
          </div>

          {/* Destinataires */}
          <div className="flex gap-2">
            {RECIPIENTS.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setNotifTo(r.id)}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={
                  notifTo === r.id
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Date/heure — seulement en mode programmé */}
          {notifMode === 'schedule' && (
            <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              <DatePickerFR value={notifAt} onChange={setNotifAt} showTime />
            </div>
          )}

          {/* Message */}
          <textarea
            value={notifBody}
            onChange={e => setNotifBody(e.target.value)}
            placeholder="Message (optionnel)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none outline-none"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />

          {/* Actions */}
          <div className="flex gap-2">
            {note.notifAt && (
              <button
                type="button"
                onClick={() => void cancelNotif()}
                disabled={savingNotif}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--danger)' }}
              >
                Annuler le rappel
              </button>
            )}
            <button
              type="button"
              onClick={() => notifMode === 'now' ? void sendNowNotif() : void saveNotif()}
              disabled={savingNotif || (notifMode === 'schedule' && !notifAt)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                opacity: savingNotif || (notifMode === 'schedule' && !notifAt) ? 0.5 : 1,
              }}
            >
              {notifMode === 'now' ? 'Envoyer maintenant' : 'Programmer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Note liée ──────────────────────────────────────────────── */}
      {note.parent && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
          onClick={() => router.push(`/parchemin/${note.parent!.id}`)}
        >
          <span>Rattachée à :</span>
          <span className="font-medium" style={{ color: 'var(--accent)' }}>{note.parent.title}</span>
        </div>
      )}

      {/* ── Sélecteur de format (edit mode, non liée) ──────────────── */}
      {editMode && !isLinked && (
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map(opt => {
            const Icon     = opt.icon
            const isActive = editFormat === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleFormatChange(opt.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px]"
                style={
                  isActive
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--surface)', color: 'var(--text2)' }
                }
              >
                <Icon size={14} />
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Échéance (edit mode) ────────────────────────────────────── */}
      {editMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: 'var(--text2)' }}>Échéance</span>
          <DatePickerFR value={editDueDate} onChange={handleDueDateChange} showTime={false} />
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">

        {/* TEXT */}
        {note.format === 'TEXT' && (
          editMode ? (
            <textarea
              ref={bodyRef}
              value={editBody}
              onChange={e => { setEditBody(e.target.value); adjustTextarea(e.target) }}
              onBlur={handleBodyBlur}
              placeholder="Contenu de la note…"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                color:           'var(--text)',
                border:          '1px solid var(--border)',
                minHeight:       '80px',
              }}
            />
          ) : (
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap px-1"
              style={{ color: note.body ? 'var(--text)' : 'var(--text2)' }}
            >
              {note.body || 'Aucun contenu'}
            </p>
          )
        )}

        {/* CHECKLIST */}
        {note.format === 'CHECKLIST' && (
          <div className="flex flex-col gap-0.5">
            {sortedItems.map((item, idx) => (
              editMode ? (
                item.id === draggingId ? (
                  // Slot vide au position de destination
                  <DragSlot key={item.id} itemId={item.id} onDragEnter={handleDragEnter} onDragEnd={() => void handleDragEnd()} />
                ) : (
                <EditableItem
                  key={item.id}
                  item={item}
                  format={note.format}
                  index={idx}
                  isDragging={false}
                  onPatch={patchItem}
                  onDelete={deleteItem}
                  onAddAfter={() => setIsAddingItem(true)}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnter={handleDragEnter}
                  onDragEnd={() => void handleDragEnd()}
                />
                )
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void toggleItem(item)}
                  className="flex items-center gap-3 w-full py-2.5 px-1 rounded-lg"
                >
                  {item.checked
                    ? <CheckSquare size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    : <Square     size={18} style={{ color: 'var(--text2)', flexShrink: 0 }} />}
                  <span
                    className="text-sm text-left"
                    style={{
                      color:          item.checked ? 'var(--text2)' : 'var(--text)',
                      textDecoration: item.checked ? 'line-through' : 'none',
                      opacity:        item.checked ? 0.5 : 1,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            ))}

            {/* Toggle tout cocher/décocher — visible en mode lecture */}
            {!editMode && note.items.length > 0 && (
              <button
                type="button"
                onClick={() => void checkAll(!allChecked)}
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs font-medium self-start"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text2)' }}
              >
                <ListChecks size={14} style={{ color: 'var(--accent)' }} />
                {allChecked ? 'Tout décocher' : 'Tout cocher'}
              </button>
            )}
          </div>
        )}

        {/* BULLETS / NUMBERED */}
        {(note.format === 'BULLETS' || note.format === 'NUMBERED') && (
          <div className="flex flex-col gap-0.5">
            {sortedItems.map((item, idx) => (
              editMode ? (
                item.id === draggingId ? (
                  <DragSlot key={item.id} itemId={item.id} onDragEnter={handleDragEnter} onDragEnd={() => void handleDragEnd()} />
                ) : (
                <EditableItem
                  key={item.id}
                  item={item}
                  format={note.format}
                  index={idx}
                  isDragging={false}
                  onPatch={patchItem}
                  onDelete={deleteItem}
                  onAddAfter={() => setIsAddingItem(true)}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnter={handleDragEnter}
                  onDragEnd={() => void handleDragEnd()}
                />
                )
              ) : (
                <div key={item.id} className="flex items-start gap-2 py-1.5 px-1">
                  <span className="text-sm shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>
                    {note.format === 'NUMBERED' ? `${idx + 1}.` : '•'}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* ── Zone d'ajout d'item — sticky au bas ────────────────────── */}
      {hasItems && (
        <div
          className="fixed left-0 right-0 px-4 z-10"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)' }}
        >
          <div className="max-w-2xl mx-auto">
            {isAddingItem ? (
              <input
                ref={addItemInputRef}
                type="text"
                placeholder="Nouvel élément…"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none shadow-lg"
                style={{
                  backgroundColor: 'var(--surface)',
                  color:           'var(--text)',
                  border:          '1px solid var(--accent)',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    void addItem(e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                  if (e.key === 'Escape') setIsAddingItem(false)
                }}
                onBlur={e => {
                  if (e.currentTarget.value.trim()) void addItem(e.currentTarget.value.trim())
                  setIsAddingItem(false)
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingItem(true)}
                className="flex items-center gap-2 w-full px-4 py-3.5 rounded-xl text-sm shadow-lg"
                style={{
                  backgroundColor: 'var(--surface)',
                  color:           'var(--text2)',
                  border:          '1px solid var(--border)',
                }}
              >
                <Plus size={15} style={{ color: 'var(--accent)' }} />
                Ajouter un élément
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DragSlot({
  itemId,
  onDragEnter,
  onDragEnd,
}: {
  itemId:      string
  onDragEnter: (id: string) => void
  onDragEnd:   () => void
}) {
  return (
    <div
      data-drag-id={itemId}
      onDragEnter={() => onDragEnter(itemId)}
      onDragOver={e => e.preventDefault()}
      onDragEnd={onDragEnd}
      className="h-9 rounded-lg transition-all"
      style={{
        border:          '2px dashed var(--accent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
      }}
    />
  )
}

function EditableItem({
  item,
  format,
  index,
  isDragging,
  onPatch,
  onDelete,
  onAddAfter,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  item:        ParcheminItem
  format:      NoteFormat
  index:       number
  isDragging:  boolean
  onPatch:     (id: string, payload: { label?: string; checked?: boolean }) => Promise<void>
  onDelete:    (id: string) => Promise<void>
  onAddAfter:  () => void
  onDragStart: () => void
  onDragEnter: (itemId: string) => void
  onDragEnd:   () => void
}) {
  const [label, setLabel] = useState(item.label)

  function handleBlur() {
    if (label.trim() && label !== item.label) {
      void onPatch(item.id, { label: label.trim() })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!label.trim()) {
        // Entrée vide → supprimer
        void onDelete(item.id)
        return
      }
      if (label.trim() !== item.label) void onPatch(item.id, { label: label.trim() })
      onAddAfter()
    }
  }

  // Touch drag — listeners au niveau document pour survivre aux re-renders qui démontent le grip
  function handleGripTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    onDragStart()

    function onMove(ev: TouchEvent) {
      const touch = ev.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const container = el?.closest('[data-drag-id]') as HTMLElement | null
      if (container?.dataset.dragId) onDragEnter(container.dataset.dragId)
    }
    function onEnd() {
      onDragEnd()
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend',  onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend',  onEnd)
  }

  return (
    <div
      data-drag-id={item.id}
      draggable
      onDragStart={onDragStart}
      onDragEnter={() => onDragEnter(item.id)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      className="flex items-center gap-2 py-1.5 group rounded-lg"
      style={{ opacity: isDragging ? 0.3 : 1, transition: 'opacity 0.15s' }}
    >
      {/* Poignée de déplacement */}
      <div
        className="shrink-0 flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onTouchStart={handleGripTouchStart}
      >
        <GripVertical size={16} style={{ color: 'var(--text2)', opacity: 0.4 }} />
      </div>
      <span className="text-sm shrink-0 w-5 text-center" style={{ color: 'var(--accent)' }}>
        {format === 'CHECKLIST' ? '☐' : format === 'NUMBERED' ? `${index + 1}.` : '•'}
      </span>
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none text-sm py-1"
        style={{ color: 'var(--text)' }}
      />
      <button
        type="button"
        onClick={() => void onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded"
        style={{ color: 'var(--danger)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
