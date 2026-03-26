'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { Priority, AssignedTo } from '@prisma/client'
import { X, ShoppingCart, Pin, PinOff, MessageCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { DatePickerFR } from '@/components/cerveau/DatePickerFR'
import type { EntryWithRelations, UpdateEntryPayload } from '@/lib/cerveau/types'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'

// ── Shared input style (mirrors CaptureSheet) ──────────────────────────────

const inputClass =
  'w-full bg-transparent border-b-2 px-0 py-2 text-sm outline-none transition-colors cerveau-input'

// ── Props ─────────────────────────────────────────────────────────────────

interface EntryDetailSheetProps {
  entry:     EntryWithRelations
  onClose:   () => void
  refetch:   () => void
  showToast: ToastFn
}

// ── Component ─────────────────────────────────────────────────────────────

export function EntryDetailSheet({ entry, onClose, refetch, showToast }: EntryDetailSheetProps) {
  const meta = TYPE_CONFIG[entry.type]

  const [title,      setTitle]      = useState(entry.title)
  const [body,       setBody]       = useState(entry.body ?? '')
  const [assignedTo, setAssignedTo] = useState<AssignedTo>(entry.assignedTo)
  const [priority,   setPriority]   = useState<Priority>(entry.priority ?? 'MEDIUM')
  const [dueDate,    setDueDate]    = useState(
    entry.dueDate
      ? new Date(entry.dueDate).toISOString().slice(0, entry.type === 'EVENT' ? 16 : 10)
      : '',
  )
  const [remindAt,   setRemindAt]   = useState(
    entry.remindAt ? new Date(entry.remindAt).toISOString().slice(0, 16) : '',
  )
  const [endDate,    setEndDate]    = useState('')
  const [tags,       setTags]       = useState<string[]>(entry.tags ?? [])
  const [tagInput,   setTagInput]   = useState('')
  const [recurrence, setRecurrence] = useState(entry.recurrence ?? '')
  const [isSaving,   setIsSaving]   = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  // Parse end date from body for EVENT type
  useEffect(() => {
    if (entry.type === 'EVENT' && entry.body?.startsWith('Fin : ')) {
      setEndDate(entry.body.replace('Fin : ', ''))
    }
  }, [entry.type, entry.body])

  // Lock scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Auto-focus title
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 120)
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    try {
      const payload: UpdateEntryPayload = {
        title:      title.trim(),
        assignedTo,
        tags,
        recurrence: recurrence || undefined,
      }

      // body — only for types that use it
      if (entry.type === 'NOTE' || entry.type === 'PROJECT' || entry.type === 'DISCUSSION') {
        payload.body = body || undefined
      }

      // Type-specific date/priority
      if (entry.type === 'TODO') {
        payload.priority = priority
        if (dueDate) payload.dueDate = new Date(dueDate).toISOString()
      }
      if (entry.type === 'REMINDER') {
        if (remindAt) payload.remindAt = new Date(remindAt).toISOString()
      }
      if (entry.type === 'EVENT') {
        if (dueDate) payload.dueDate  = new Date(dueDate).toISOString()
        payload.body = endDate ? `Fin : ${endDate}` : undefined
      }
      if (entry.type === 'NOTE' || entry.type === 'PROJECT') {
        if (dueDate) payload.dueDate = new Date(dueDate).toISOString()
      }

      const res = await fetch(`/api/cerveau/entries/${entry.id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
      })
      if (res.ok) {
        showToast('Modifié ✓', 'success')
        refetch()
        onClose()
      } else {
        showToast('Erreur lors de la sauvegarde', 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }, [title, body, assignedTo, priority, dueDate, remindAt, endDate, tags, recurrence,
      isSaving, entry, showToast, refetch, onClose])

  // ── Quick actions ────────────────────────────────────────────────────────

  const handleArchive = useCallback(async () => {
    const res = await fetch(`/api/cerveau/entries/${entry.id}`, {
      method: 'DELETE', credentials: 'include',
    })
    if (res.ok) { showToast('Archivé', 'success'); refetch(); onClose() }
    else          showToast('Erreur', 'error')
  }, [entry.id, showToast, refetch, onClose])

  const handleMarkDone = useCallback(async () => {
    const res = await fetch(`/api/cerveau/entries/${entry.id}/done`, {
      method: 'POST', credentials: 'include',
    })
    if (res.ok) { showToast('✓ Terminé', 'success'); refetch(); onClose() }
    else          showToast('Erreur', 'error')
  }, [entry.id, showToast, refetch, onClose])

  const handleTogglePin = useCallback(async () => {
    const res = await fetch(`/api/cerveau/entries/${entry.id}`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ pinned: !entry.pinned }),
    })
    if (res.ok) { showToast(entry.pinned ? 'Désépinglé' : '📌 Épinglé', 'success'); refetch(); onClose() }
    else          showToast('Erreur', 'error')
  }, [entry.id, entry.pinned, showToast, refetch, onClose])

  const handleMarkTalked = useCallback(async () => {
    const res = await fetch(`/api/cerveau/entries/${entry.id}`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ status: 'DONE' }),
    })
    if (res.ok) { showToast('✓ On en a parlé', 'success'); refetch(); onClose() }
    else          showToast('Erreur', 'error')
  }, [entry.id, showToast, refetch, onClose])

  // ── Tag helpers ──────────────────────────────────────────────────────────

  const addTag = useCallback(() => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Sheet — bottom on mobile, right panel on desktop */}
      <div
        className={cn(
          'fixed z-50 flex flex-col',
          'bottom-0 left-0 right-0 rounded-t-2xl max-h-[92dvh]',
          'md:bottom-0 md:top-0 md:left-auto md:right-0 md:w-[480px]',
          'md:rounded-none md:rounded-l-2xl md:max-h-screen',
        )}
        style={{ backgroundColor: 'var(--bg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">

          {/* Header: type badge + assignation + close */}
          <div className="flex items-center gap-2 py-4">
            <span className={cn('shrink-0 px-2 py-0.5 rounded text-[10px] font-mono text-white', meta.color)}>
              {meta.label}
            </span>
            <div className="flex-1" />
            <div className="flex gap-1">
              {(['ILAN', 'CAMILLE', 'BOTH'] as AssignedTo[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAssignedTo(v)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono transition-colors"
                  style={{
                    backgroundColor: assignedTo === v ? 'var(--accent)'   : 'var(--surface2)',
                    color:           assignedTo === v ? '#ffffff'          : 'var(--muted)',
                  }}
                >
                  {v === 'ILAN' ? 'Ilan' : v === 'CAMILLE' ? 'Camille' : 'Tous'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Title — editable, large */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder="Titre"
            className="w-full bg-transparent font-headline text-xl outline-none border-b-2 py-1 mb-5 transition-colors"
            style={{ color: 'var(--text)', borderBottomColor: 'transparent' }}
            onFocus={e  => { (e.target as HTMLInputElement).style.borderBottomColor = 'var(--accent)' }}
            onBlur={e   => { (e.target as HTMLInputElement).style.borderBottomColor = 'transparent'   }}
          />

          {/* Body — NOTE, PROJECT, DISCUSSION */}
          {(entry.type === 'NOTE' || entry.type === 'PROJECT' || entry.type === 'DISCUSSION') && (
            <div className="mb-5">
              <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                {entry.type === 'PROJECT' ? 'Description' : 'Contenu'}
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
                className={cn(inputClass, 'resize-none')}
                placeholder={entry.type === 'PROJECT' ? 'Description du projet…' : 'Développe ici…'}
              />
            </div>
          )}

          {/* ── Metadata ── */}
          <div className="h-px my-3" style={{ backgroundColor: 'var(--border)' }} />

          {/* Priority — TODO */}
          {entry.type === 'TODO' && (
            <div className="mb-5">
              <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Priorité
              </label>
              <div className="flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => {
                  const label = p === 'LOW' ? 'Faible' : p === 'MEDIUM' ? 'Normale' : 'Haute'
                  const activeStyle =
                    p === 'HIGH'   ? { backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)',  color: 'var(--danger)'  } :
                    p === 'MEDIUM' ? { backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)' } :
                                     { backgroundColor: 'var(--border)', color: 'var(--muted)' }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={priority === p ? activeStyle : { backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Due date — all types except REMINDER and EVENT */}
          {entry.type !== 'REMINDER' && entry.type !== 'EVENT' && (
            <div className="mb-5">
              <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Échéance
              </label>
              <DatePickerFR value={dueDate} onChange={setDueDate} showTime={false} className={inputClass} />
            </div>
          )}

          {/* REMINDER — datetime */}
          {entry.type === 'REMINDER' && (
            <div className="mb-5">
              <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Me rappeler le
              </label>
              <DatePickerFR value={remindAt} onChange={setRemindAt} showTime className={inputClass} />
            </div>
          )}

          {/* EVENT — start + end dates */}
          {entry.type === 'EVENT' && (
            <>
              <div className="mb-5">
                <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                  Date et heure de début
                </label>
                <DatePickerFR value={dueDate} onChange={setDueDate} showTime className={inputClass} />
              </div>
              <div className="mb-5">
                <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                  Date de fin (optionnel)
                </label>
                <DatePickerFR value={endDate} onChange={setEndDate} showTime={false} className={inputClass} />
              </div>
            </>
          )}

          {/* Tags */}
          <div className="mb-5">
            <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Tags
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                      color: 'var(--accent)',
                    }}
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
              }}
              placeholder="Ajouter un tag (Entrée pour valider)…"
              className={inputClass}
            />
          </div>

          {/* Recurrence */}
          <div className="mb-5">
            <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Récurrence
            </label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value)}
              className={cn(inputClass, 'cursor-pointer')}
              style={{ backgroundColor: 'transparent', color: 'var(--text)' }}
            >
              <option value="">Aucune</option>
              <option value="quotidien">Quotidien</option>
              <option value="hebdo">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
            </select>
          </div>

          {/* ── Type-specific actions ── */}
          <div className="h-px my-3" style={{ backgroundColor: 'var(--border)' }} />

          {entry.type === 'TODO' && (
            <button
              type="button"
              onClick={() => void handleMarkDone()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'color-mix(in srgb, #22c55e 10%, transparent)', color: '#22c55e' }}
            >
              <Check size={16} />
              Marquer comme fait
            </button>
          )}

          {entry.type === 'NOTE' && (
            <button
              type="button"
              onClick={() => void handleTogglePin()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
            >
              {entry.pinned ? <PinOff size={16} /> : <Pin size={16} />}
              {entry.pinned ? 'Désépingler' : 'Épingler'}
            </button>
          )}

          {entry.type === 'DISCUSSION' && (
            <button
              type="button"
              onClick={() => void handleMarkTalked()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
            >
              <MessageCircle size={16} />
              On en a parlé
            </button>
          )}

          {entry.type === 'LIST' && (
            <Link
              href={`/cerveau/lists/${entry.id}/detail`}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
              onClick={onClose}
            >
              <ShoppingCart size={16} />
              Voir le détail
            </Link>
          )}

          {entry.type === 'PROJECT' && entry.children.length > 0 && (
            <div className="mb-3 px-1">
              <label className="font-mono text-xs uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Progression
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(entry.children.filter(c => c.status === 'DONE').length / entry.children.length) * 100}%`,
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                </div>
                <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                  {entry.children.filter(c => c.status === 'DONE').length}/{entry.children.length}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div
          className="shrink-0 flex gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => void handleArchive()}
            className="py-3 px-4 text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
            style={{
              color: 'var(--danger)',
              backgroundColor: 'color-mix(in srgb, var(--danger) 8%, transparent)',
            }}
          >
            Archiver
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!title.trim() || isSaving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))',
              color: '#ffffff',
            }}
          >
            {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </>
  )
}
