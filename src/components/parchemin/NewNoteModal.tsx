'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, CheckSquare, List, ListOrdered, ChevronDown, Bell } from 'lucide-react'
import { DatePickerFR } from '@/components/ui/DatePickerFR'
import { Modal } from '@/components/ui/Modal'
import type { NoteFormat, NoteWithRelations } from '@/lib/parchemin/types'

const FORMAT_OPTIONS: { id: NoteFormat; icon: React.ElementType; label: string }[] = [
  { id: 'TEXT',      icon: FileText,    label: 'Texte'   },
  { id: 'CHECKLIST', icon: CheckSquare, label: 'Liste'   },
  { id: 'BULLETS',   icon: List,        label: 'Puces'   },
  { id: 'NUMBERED',  icon: ListOrdered, label: 'Numéros' },
  { id: 'REMINDER' as NoteFormat, icon: Bell, label: 'Rappel' },
]

const RECIPIENTS: { id: 'ILAN' | 'CAMILLE' | 'BOTH'; label: string }[] = [
  { id: 'ILAN',    label: 'Ilan'     },
  { id: 'CAMILLE', label: 'Camille'  },
  { id: 'BOTH',    label: 'Les deux' },
]

function itemMarker(format: NoteFormat, idx: number): string {
  if (format === 'NUMBERED')  return `${idx + 1}.`
  if (format === 'CHECKLIST') return '☐'
  return '•'
}

function nowDatetimeLocal(): string {
  const d   = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

interface NoteFormProps {
  onClose:          () => void
  onSaved:          () => void
  initialParentId?: string
}

function NoteFormInner({ onClose, onSaved, initialParentId }: NoteFormProps) {
  const router = useRouter()

  const [format,   setFormat]   = useState<NoteFormat>('TEXT')
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [items,    setItems]    = useState<string[]>([''])
  const [parentId, setParentId] = useState<string | undefined>(initialParentId)
  const [saving,   setSaving]   = useState(false)

  const isReminder = format === ('REMINDER' as NoteFormat)

  const [showParent,  setShowParent]  = useState(!!initialParentId)
  const [showNotif,   setShowNotif]   = useState(false)
  const [showDueDate, setShowDueDate] = useState(false)
  const [notifAt,     setNotifAt]     = useState('')
  const [notifTo,     setNotifTo]     = useState<'ILAN' | 'CAMILLE' | 'BOTH'>('BOTH')
  const [dueDate,     setDueDate]     = useState('')

  const [parentNotes, setParentNotes] = useState<NoteWithRelations[]>([])

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const firstItemRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (format === 'TEXT') textareaRef.current?.focus()
    else firstItemRef.current?.focus()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!isReminder) return
    setShowNotif(true)
    setNotifAt(prev => prev || nowDatetimeLocal())
  }, [isReminder]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchParentNotes = useCallback(async () => {
    const res = await fetch('/api/parchemin/notes')
    if (res.ok) {
      const { data } = await res.json() as { data: NoteWithRelations[] }
      setParentNotes(data ?? [])
    }
  }, [])

  useEffect(() => {
    if (showParent) void fetchParentNotes()
  }, [showParent, fetchParentNotes])

  useEffect(() => {
    if (!parentId || parentNotes.length === 0) return
    const parent = parentNotes.find(n => n.id === parentId)
    if (!parent) return
    applyFormatChange(format, parent.format)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, parentNotes])

  function applyFormatChange(prevFmt: NoteFormat, newFmt: NoteFormat) {
    if (prevFmt === 'TEXT' && newFmt !== 'TEXT') {
      const lines = body.split('\n').filter(l => l.trim())
      setItems(lines.length > 0 ? lines : [''])
    } else if (prevFmt !== 'TEXT' && newFmt === 'TEXT') {
      setBody(items.filter(i => i.trim()).join('\n'))
      setItems([''])
    }
    setFormat(newFmt)
  }

  function handleFormatClick(newFmt: NoteFormat) {
    if (parentId) return
    if ((newFmt as string) === 'REMINDER' && !notifAt) setNotifAt(nowDatetimeLocal())
    applyFormatChange(format, newFmt)
  }

  function adjustTextarea(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleItemChange(idx: number, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? value : it))
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      setItems(prev => [...prev.slice(0, idx + 1), '', ...prev.slice(idx + 1)])
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-item-input]')
        inputs[idx + 1]?.focus()
      }, 10)
    }
    if (e.key === 'Backspace' && items[idx] === '' && items.length > 1) {
      e.preventDefault()
      setItems(prev => prev.filter((_, i) => i !== idx))
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-item-input]')
        inputs[Math.max(0, idx - 1)]?.focus()
      }, 10)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (!isReminder && parentId) {
        const parent = parentNotes.find(n => n.id === parentId)
        if (!parent) return

        if (parent.format === 'TEXT') {
          const existing = parent.body ?? ''
          const addition = body.trim()
          if (addition) {
            const combined = existing ? `${existing}\n${addition}` : addition
            await fetch(`/api/parchemin/notes/${parentId}`, {
              method:  'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ body: combined }),
            })
          }
        } else {
          const labels   = items.filter(s => s.trim())
          const maxOrder = parent.items.reduce((m, i) => Math.max(m, i.order), -1)
          for (let i = 0; i < labels.length; i++) {
            await fetch(`/api/parchemin/notes/${parentId}/items`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ label: labels[i], order: maxOrder + 1 + i }),
            })
          }
        }
        onClose()
        onSaved()
        router.push(`/parchemin/${parentId}`)
        return
      }

      const autoTitle = isReminder
        ? (body.trim().slice(0, 60) || 'Rappel')
        : title.trim()

      if (!autoTitle) return

      const res = await fetch('/api/parchemin/notes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:    autoTitle,
          format,
          body:     format === 'TEXT' || isReminder ? (body || null) : null,
          items:    format !== 'TEXT' && !isReminder ? items.filter(s => s.trim()) : undefined,
          dueDate:  showDueDate && dueDate && !isReminder ? dueDate : null,
          parentId: isReminder ? parentId : undefined,
        }),
      })

      if (!res.ok) return
      const { data: note } = await res.json() as { data: NoteWithRelations }

      if (showNotif && notifAt) {
        await fetch(`/api/parchemin/notes/${note.id}/notif`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            notifAt,
            notifTo,
            notifBody: isReminder ? (body.trim() || null) : null,
          }),
        })
      }

      onClose()
      onSaved()
      router.push(isReminder && parentId ? `/parchemin/${parentId}` : `/parchemin/${note.id}`)
    } finally {
      setSaving(false)
    }
  }

  const canSave = parentId
    ? (format === 'TEXT' ? body.trim().length > 0 : items.some(i => i.trim()))
    : isReminder
      ? body.trim().length > 0
      : title.trim().length > 0

  const lockedFormat = parentId
    ? parentNotes.find(n => n.id === parentId)?.format
    : undefined

  return (
    <div className="flex flex-col gap-4">

      {/* Sélecteur de format */}
      <div className="flex gap-2">
        {FORMAT_OPTIONS.map(opt => {
          const Icon     = opt.icon
          const isActive = format === opt.id
          const isLocked = !!lockedFormat && lockedFormat !== opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleFormatClick(opt.id)}
              disabled={isLocked}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] transition-colors"
              style={
                isActive
                  ? { backgroundColor: 'var(--accent)', color: '#fff' }
                  : isLocked
                    ? { backgroundColor: 'var(--surface2)', color: 'var(--text2)', opacity: 0.35 }
                    : { backgroundColor: 'var(--surface2)', color: 'var(--text2)' }
              }
            >
              <Icon size={16} />
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Titre */}
      {!parentId && !isReminder && (
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre de la note…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none font-medium"
          style={{
            backgroundColor: 'var(--surface2)',
            color:           'var(--text)',
            border:          '1px solid var(--border)',
          }}
        />
      )}

      {/* Zone de contenu */}
      {format === 'TEXT' || isReminder ? (
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => { setBody(e.target.value); adjustTextarea(e.target) }}
          placeholder={isReminder ? 'Acheter du pain…' : 'Écris ici…'}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
          style={{
            backgroundColor: 'var(--surface2)',
            color:           'var(--text)',
            border:          '1px solid var(--border)',
            minHeight:       '100px',
          }}
        />
      ) : (
        <div
          className="flex flex-col gap-1 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm shrink-0 w-5 text-center" style={{ color: 'var(--accent)' }}>
                {itemMarker(format, idx)}
              </span>
              <input
                ref={idx === 0 ? firstItemRef : undefined}
                data-item-input
                type="text"
                value={item}
                onChange={e => handleItemChange(idx, e.target.value)}
                onKeyDown={e => handleItemKeyDown(e, idx)}
                placeholder={idx === 0 ? 'Premier élément…' : 'Élément…'}
                className="flex-1 bg-transparent outline-none text-sm py-1"
                style={{ color: 'var(--text)' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <ToggleRow
          label="Rattacher à une note"
          open={showParent}
          onToggle={() => {
            if (showParent) setParentId(undefined)
            setShowParent(v => !v)
          }}
        />
        {showParent && (
          <div
            className="px-4 pb-3 pt-2 flex flex-col gap-2"
            style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <div className="relative">
              <select
                value={parentId ?? ''}
                onChange={e => setParentId(e.target.value || undefined)}
                className="w-full px-3 py-2.5 rounded-lg text-sm appearance-none outline-none pr-8"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                <option value="">— Aucune —</option>
                {parentNotes.map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text2)' }} />
            </div>
            {parentId && (
              <p className="text-xs" style={{ color: 'var(--text2)' }}>
                Le contenu sera ajouté directement à cette note.
              </p>
            )}
          </div>
        )}

        {isReminder ? (
          <div className="px-4 pb-4 pt-3 flex flex-col gap-3" style={{ backgroundColor: 'var(--surface)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Envoyer à</p>
            <div className="flex gap-2">
              {RECIPIENTS.map(r => (
                <button key={r.id} type="button" onClick={() => setNotifTo(r.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={notifTo === r.id
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Quand</p>
            <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              <DatePickerFR value={notifAt} onChange={setNotifAt} showTime />
            </div>
          </div>
        ) : (
          <>
            <ToggleRow label="Notification" open={showNotif} onToggle={() => setShowNotif(v => !v)} borderTop />
            {showNotif && (
              <div className="px-4 pb-4 pt-3 flex flex-col gap-3"
                style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
              >
                <div className="flex gap-2">
                  {RECIPIENTS.map(r => (
                    <button key={r.id} type="button" onClick={() => setNotifTo(r.id)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium"
                      style={notifTo === r.id
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { backgroundColor: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <DatePickerFR value={notifAt} onChange={setNotifAt} showTime />
                </div>
              </div>
            )}

            <ToggleRow label="Échéance" open={showDueDate} onToggle={() => setShowDueDate(v => !v)} borderTop />
            {showDueDate && (
              <div className="px-4 pb-4 pt-3"
                style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
              >
                <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <DatePickerFR value={dueDate} onChange={setDueDate} showTime={false} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bouton */}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !canSave}
        className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide transition-opacity"
        style={{
          backgroundColor: 'var(--accent)',
          color:           '#fff',
          opacity:         saving || !canSave ? 0.45 : 1,
        }}
      >
        {saving ? 'Enregistrement…' : parentId ? 'Ajouter à la note' : isReminder ? 'Programmer le rappel' : 'Enregistrer'}
      </button>
    </div>
  )
}

function ToggleRow({
  label, open, onToggle, borderTop,
}: {
  label:      string
  open:       boolean
  onToggle:   () => void
  borderTop?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between px-4 py-3 text-sm"
      style={{
        backgroundColor: 'var(--surface)',
        color:           'var(--text)',
        borderTop:       borderTop ? '1px solid var(--border)' : undefined,
      }}
    >
      <span>{label}</span>
      <div className="w-10 h-5 rounded-full relative transition-colors" style={{ backgroundColor: open ? 'var(--accent)' : 'var(--border)' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: open ? '22px' : '2px' }} />
      </div>
    </button>
  )
}

// ─── Wrapper avec searchParams (Suspense boundary requis) ──────────────────────

function NoteFormWithParams({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const searchParams    = useSearchParams()
  const initialParentId = searchParams.get('parentId') ?? undefined
  return <NoteFormInner onClose={onClose} onSaved={onSaved} initialParentId={initialParentId} />
}

// ─── Modal exportée ───────────────────────────────────────────────────────────

interface NewNoteModalProps {
  isOpen:   boolean
  onClose:  () => void
  onSaved?: () => void
}

export function NewNoteModal({ isOpen, onClose, onSaved }: NewNoteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle note"
      size="lg"
      zIndex={210}
    >
      <Suspense>
        <NoteFormWithParams onClose={onClose} onSaved={onSaved ?? (() => {})} />
      </Suspense>
    </Modal>
  )
}
