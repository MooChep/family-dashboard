'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AssignedTo, EntryType, Priority } from '@prisma/client'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TypeSelector } from '@/components/cerveau/TypeSelector'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { TemplateSummary } from '@/app/api/cerveau/templates/route'

// ── Chip ──────────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)' }}
    >
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 rounded-full" style={{ color: 'var(--muted)' }}>
        <X size={11} />
      </button>
    </span>
  )
}

const inputClass = 'w-full bg-surface border-b-2 rounded-none px-0 py-2.5 text-sm outline-none transition-colors cerveau-input'
const labelClass = 'font-mono text-xs uppercase tracking-wider mb-1.5 block'

// ── Props ─────────────────────────────────────────────────────────────────

interface CreateTemplateSheetProps {
  isOpen:    boolean
  onClose:   () => void
  onCreated: (template: TemplateSummary) => void
  onToast:   (message: string, kind: 'success' | 'error') => void
}

// ── Component ─────────────────────────────────────────────────────────────

export function CreateTemplateSheet({ isOpen, onClose, onCreated, onToast }: CreateTemplateSheetProps) {
  const [type,         setType]         = useState<EntryType>('TODO')
  const [name,         setName]         = useState('')
  const [shortcut,     setShortcut]     = useState('')
  const [titlePattern, setTitlePattern] = useState('')
  const [assignedTo,   setAssignedTo]   = useState<AssignedTo>('BOTH')
  const [priority,     setPriority]     = useState<Priority>('MEDIUM')
  const [listItems,    setListItems]    = useState<string[]>([])
  const [newItem,      setNewItem]      = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setType('TODO')
    setName('')
    setShortcut('')
    setTitlePattern('')
    setAssignedTo('BOTH')
    setPriority('MEDIUM')
    setListItems([])
    setNewItem('')
    setTimeout(() => nameRef.current?.focus(), 100)
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const addItem = useCallback(() => {
    const t = newItem.trim()
    if (!t) return
    setListItems(prev => [...prev, t])
    setNewItem('')
  }, [newItem])

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !titlePattern.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const payload = {
        name:         name.trim(),
        shortcut:     shortcut.trim() || undefined,
        type,
        titlePattern: titlePattern.trim(),
        assignedTo,
        ...(type === 'TODO' || type === 'REMINDER' ? { priority } : {}),
        ...(type === 'LIST' && listItems.length > 0 ? { items: listItems } : {}),
      }
      const res = await fetch('/api/cerveau/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as ApiResponse<TemplateSummary>
      if (data.success && data.data) {
        onCreated(data.data)
        onToast('Template créé ✓', 'success')
        onClose()
      } else {
        onToast('Erreur lors de la création', 'error')
      }
    } catch {
      onToast('Erreur réseau', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [name, shortcut, type, titlePattern, assignedTo, priority, listItems, isSubmitting, onCreated, onToast, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg)', maxHeight: '92dvh' }}
      >
        {/* Drag handle */}
        <div className="shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">

          {/* Header */}
          <div className="flex items-center justify-between py-3 mb-2">
            <h2 className="font-headline text-base" style={{ color: 'var(--text)' }}>
              Nouveau template
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Type */}
          <fieldset className="mb-5">
            <legend className={labelClass} style={{ color: 'var(--muted)' }}>Type</legend>
            <TypeSelector selected={type} onSelect={setType} inline />
          </fieldset>

          {/* Nom */}
          <div className="mb-5">
            <label className={labelClass} style={{ color: 'var(--muted)' }}>Nom</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Courses hebdo"
              className={inputClass}
            />
          </div>

          {/* Shortcut */}
          <div className="mb-5">
            <label className={labelClass} style={{ color: 'var(--muted)' }}>
              Shortcut <span style={{ color: 'var(--text2)' }}>(optionnel)</span>
            </label>
            <div className="flex items-end gap-1">
              <span className="pb-2.5 text-sm font-mono" style={{ color: 'var(--muted)' }}>*</span>
              <input
                type="text"
                value={shortcut}
                onChange={e => setShortcut(e.target.value.replace(/\s/g, ''))}
                placeholder="courses"
                className={cn(inputClass, 'flex-1')}
              />
            </div>
          </div>

          {/* Titre pattern */}
          <div className="mb-2">
            <label className={labelClass} style={{ color: 'var(--muted)' }}>Titre pattern</label>
            <input
              type="text"
              value={titlePattern}
              onChange={e => setTitlePattern(e.target.value)}
              placeholder="ex: Courses du {date}"
              className={inputClass}
            />
          </div>
          <p className="mb-5 font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            Tokens : <span style={{ color: 'var(--accent)' }}>{'{date}'}</span>{' '}
            <span style={{ color: 'var(--accent)' }}>{'{semaine}'}</span>{' '}
            <span style={{ color: 'var(--accent)' }}>{'{mois}'}</span>
          </p>

          {/* Assignation */}
          <div className="mb-5">
            <label className={labelClass} style={{ color: 'var(--muted)' }}>Pour</label>
            <div className="flex gap-2">
              {(['ILAN', 'CAMILLE', 'BOTH'] as AssignedTo[]).map(v => {
                const label = v === 'ILAN' ? 'Ilan' : v === 'CAMILLE' ? 'Camille' : 'Les deux'
                const active = assignedTo === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAssignedTo(v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--surface2)',
                      color: active ? '#ffffff' : 'var(--text2)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priorité — TODO / REMINDER uniquement */}
          {(type === 'TODO' || type === 'REMINDER') && (
            <div className="mb-5">
              <label className={labelClass} style={{ color: 'var(--muted)' }}>Priorité</label>
              <div className="flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => {
                  const label = p === 'LOW' ? 'Faible' : p === 'MEDIUM' ? 'Normale' : 'Haute'
                  const active = priority === p
                  const activeStyle =
                    p === 'HIGH'   ? { backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' } :
                    p === 'MEDIUM' ? { backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)' } :
                                     { backgroundColor: 'var(--border)', color: 'var(--muted)' }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={active ? activeStyle : { backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items — LIST uniquement */}
          {type === 'LIST' && (
            <div className="mb-5">
              <label className={labelClass} style={{ color: 'var(--muted)' }}>Articles</label>
              {listItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {listItems.map((item, i) => (
                    <Chip
                      key={i}
                      label={item}
                      onRemove={() => setListItems(prev => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input
                  type="text"
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                  placeholder="Ajouter un article…"
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="pb-2.5 text-xl font-light"
                  style={{ color: 'var(--accent)' }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-3 px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 text-sm underline underline-offset-2"
            style={{ color: 'var(--accent)' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || !titlePattern.trim() || isSubmitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))',
              color: '#ffffff',
            }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Créer le template
          </button>
        </div>
      </div>
    </>
  )
}
