'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { EntryType, Priority, AssignedTo } from '@prisma/client'
import { X, ChevronDown, Flag, Users, Calendar, Bell, Inbox, FolderOpen, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatePickerFR, type DatePickerFRHandle } from '@/components/cerveau/DatePickerFR'
import { ContextSelectorSheet } from '@/components/cerveau/ContextSelectorSheet'
import { TypeSelector } from '@/components/cerveau/TypeSelector'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { formatCountdown, formatAbsolute } from '@/lib/cerveau/formatDate'
import type { ParsedInput } from '@/lib/cerveau/parser'
import type { CreateEntryPayload } from '@/lib/cerveau/types'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CaptureSheetProps {
  isOpen:             boolean
  onClose:            () => void
  rawText:            string
  parsed?:            ParsedInput
  effectiveType:      EntryType
  resolvedProjectId?: string | null
  parentId?:          string
  onSubmit:           (payload: CreateEntryPayload) => Promise<{ success: boolean; message: string }>
  refetch?:           () => void
  showToast?:         ToastFn
}

// ── ChipBtn ───────────────────────────────────────────────────────────────────

interface ChipBtnProps {
  icon:      React.ReactNode
  label:     string
  active:    boolean
  color?:    string
  onClick:   () => void
  onClear?:  () => void
}

function ChipBtn({ icon, label, active, color, onClick, onClear }: ChipBtnProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer select-none transition-colors"
      style={{
        backgroundColor: active
          ? `color-mix(in srgb, ${color ?? 'var(--accent)'} 15%, var(--surface2))`
          : 'var(--surface2)',
        color: active ? (color ?? 'var(--accent)') : 'var(--text2)',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
      {active && onClear && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onClear() }}
          className="ml-0.5 rounded-full"
          style={{ color: 'var(--muted)' }}
          aria-label="Effacer"
        >
          <X size={11} />
        </button>
      )}
    </span>
  )
}

// ── Priority helpers ──────────────────────────────────────────────────────────

const PRIORITY_CYCLE: (Priority | undefined)[] = [undefined, 'LOW', 'MEDIUM', 'HIGH']
const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   'var(--danger)',
  MEDIUM: 'var(--warning, #b5860d)',
  LOW:    'var(--muted)',
}
const PRIORITY_LABEL: Record<string, string> = {
  HIGH: 'Haute', MEDIUM: 'Normale', LOW: 'Faible',
}

// ── Context icon helper ───────────────────────────────────────────────────────

function ContextIcon({ type }: { type: 'inbox' | 'project' | 'list' }) {
  if (type === 'project') return <FolderOpen size={14} />
  if (type === 'list')    return <List size={14} />
  return <Inbox size={14} />
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CaptureSheet({
  isOpen,
  onClose,
  rawText,
  parsed,
  effectiveType,
  resolvedProjectId,
  parentId,
  onSubmit,
  refetch,
  showToast,
}: CaptureSheetProps) {
  const [title,          setTitle]          = useState('')
  const [body,           setBody]           = useState('')
  const [dueDate,        setDueDate]        = useState('')
  const [remindAt,       setRemindAt]       = useState('')
  const [priority,       setPriority]       = useState<Priority | undefined>(undefined)
  const [assignedTo,     setAssignedTo]     = useState<AssignedTo>('BOTH')
  const [contextId,      setContextId]      = useState<string | undefined>(undefined)
  const [contextType,    setContextType]    = useState<'inbox' | 'project' | 'list'>('inbox')
  const [contextLabel,   setContextLabel]   = useState('Boîte de réception')
  const [isContextOpen,  setIsContextOpen]  = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [localType,      setLocalType]      = useState<EntryType>(effectiveType)
  const [showTypeSelect, setShowTypeSelect] = useState(false)

  const titleRef    = useRef<HTMLInputElement>(null)
  const dateRef     = useRef<DatePickerFRHandle>(null)
  const remindRef   = useRef<DatePickerFRHandle>(null)

  // ── Init on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    // Title
    setTitle(
      parsed?.isListShortcut
        ? (parsed.targetList ?? parsed.cleanText ?? rawText)
        : (parsed?.forcedType === 'PROJECT' && parsed.targetProject && !resolvedProjectId)
        ? parsed.targetProject.replace(/-/g, ' ')
        : (parsed?.cleanText ?? rawText),
    )

    // Dates
    const dateStr = parsed?.dueDate ? parsed.dueDate.toISOString().slice(0, 10) : ''
    setDueDate(effectiveType === 'EVENT' && dateStr ? `${dateStr}T09:00` : dateStr)
    setRemindAt(dateStr ? `${dateStr}T09:00` : '')

    // Fields
    setBody('')
    setAssignedTo(parsed?.assignedTo ?? 'BOTH')
    setPriority(parsed?.priority ?? undefined)
    setLocalType(effectiveType)
    setShowTypeSelect(false)

    // Context
    if (parentId) {
      setContextType('project')
      setContextId(parentId)
      setContextLabel('Ce projet')
    } else if (resolvedProjectId) {
      setContextType('project')
      setContextId(resolvedProjectId)
      setContextLabel('Projet sélectionné')
    } else {
      setContextType('inbox')
      setContextId(undefined)
      setContextLabel('Boîte de réception')
    }

    setIsContextOpen(false)
    setTimeout(() => titleRef.current?.focus(), 80)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)

    try {
      // List item shortcut: directly add to existing list
      if (contextType === 'list' && contextId) {
        const res = await fetch(`/api/cerveau/lists/${contextId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: trimmed, order: 0 }),
        })
        if (res.ok) {
          showToast?.('Item ajouté ✓', 'success')
          refetch?.()
          onClose()
        } else {
          showToast?.('Erreur lors de la sauvegarde', 'error')
        }
        return
      }

      // Regular entry
      const type: EntryType = localType

      const payload: CreateEntryPayload = {
        type,
        title: trimmed,
        assignedTo,
        ...(priority              && { priority }),
        ...(body.trim()           && { body: body.trim() }),
        ...(parsed?.tags?.length  && { tags: parsed.tags }),
        ...(parsed?.recurrence    && { recurrence: parsed.recurrence }),
        ...(contextType === 'project' && contextId ? { parentId: contextId } : {}),
      }

      if (type !== 'REMINDER' && dueDate)  payload.dueDate  = new Date(dueDate).toISOString()
      if (type === 'REMINDER' && remindAt) payload.remindAt = new Date(remindAt).toISOString()

      const result = await onSubmit(payload)
      showToast?.(result.message, result.success ? 'success' : 'error')
      if (result.success) {
        refetch?.()
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [title, isSubmitting, contextType, contextId, localType, assignedTo, priority, body, parsed, dueDate, remindAt, onSubmit, showToast, refetch, onClose])

  if (!isOpen) return null

  // ── Derived ──────────────────────────────────────────────────────────────────
  const typeMeta      = TYPE_CONFIG[localType]
  const prioColor     = priority ? PRIORITY_COLOR[priority] : 'var(--muted)'
  const prioLabel     = priority ? PRIORITY_LABEL[priority] : 'Priorité'
  const dateLabel     = dueDate   ? formatCountdown(new Date(dueDate))   : 'Date'
  const remindLabel   = remindAt  ? formatAbsolute(new Date(remindAt))   : 'Rappel'
  const assignLabel   = assignedTo === 'ILAN' ? 'Ilan' : assignedTo === 'CAMILLE' ? 'Camille' : 'Les deux'

  function cyclePriority() {
    setPriority(p => {
      const idx = PRIORITY_CYCLE.indexOf(p)
      return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    })
  }

  function cycleAssign() {
    setAssignedTo(a => a === 'BOTH' ? 'ILAN' : a === 'ILAN' ? 'CAMILLE' : 'BOTH')
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg)', maxHeight: '92dvh' }}
      >
        {/* Handle */}
        <div className="shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSubmit() } }}
            placeholder="Ajouter une entrée…"
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:opacity-40"
            style={{ color: 'var(--text)' }}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Description */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Description (optionnel)"
            rows={2}
            className="w-full mt-2 bg-transparent text-sm outline-none resize-none placeholder:opacity-30"
            style={{ color: 'var(--text2)' }}
          />

          {/* Hidden DatePickerFR pickers (triggered by chips) */}
          <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <DatePickerFR
              ref={dateRef}
              value={dueDate}
              onChange={setDueDate}
              showTime={effectiveType === 'EVENT'}
            />
            <DatePickerFR
              ref={remindRef}
              value={remindAt}
              onChange={setRemindAt}
              showTime
            />
          </div>

          {/* Chips row */}
  <div className="flex flex-wrap gap-2 md:mt-4">
  {localType !== 'REMINDER' && (
    <div className="w-[48%] md:w-auto">
      <ChipBtn
        icon={<Calendar size={12} />}
        label={dateLabel}
        active={!!dueDate}
        color="var(--accent)"
        onClick={() => dateRef.current?.openPicker()}
        onClear={() => setDueDate('')}
      />
    </div>
  )}

  <div className="w-[48%] md:w-auto">
    <ChipBtn
      icon={<Bell size={12} />}
      label={remindLabel}
      active={!!remindAt}
      color="var(--warning, #b5860d)"
      onClick={() => remindRef.current?.openPicker()}
      onClear={() => setRemindAt('')}
    />
  </div>

  <div className="w-[48%] md:w-auto">
    <ChipBtn
      icon={<Flag size={12} style={{ color: priority ? prioColor : undefined }} />}
      label={prioLabel}
      active={!!priority}
      color={prioColor}
      onClick={cyclePriority}
      onClear={() => setPriority(undefined)}
    />
  </div>

  <div className="w-[48%] md:w-auto">
    <ChipBtn
      icon={<Users size={12} />}
      label={assignLabel}
      active={assignedTo !== 'BOTH'}
      color="var(--accent)"
      onClick={cycleAssign}
    />
  </div>
</div>
          {/* NLP type badge (clickable) + tags */}
          {(title.length > 1 || (parsed?.tags && parsed.tags.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {title.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowTypeSelect(v => !v)}
                  className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-white', typeMeta.color)}
                  title="Changer le type"
                >
                  {typeMeta.label}
                </button>
              )}
              {parsed?.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Inline type selector */}
          {showTypeSelect && (
            <div className="mt-3">
              <TypeSelector
                selected={localType}
                onSelect={t => { setLocalType(t); setShowTypeSelect(false) }}
                inline
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Context selector */}
          <button
            type="button"
            onClick={() => setIsContextOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 min-w-0 transition-colors"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
          >
            <ContextIcon type={contextType} />
            <span className="truncate max-w-30">{contextLabel}</span>
            <ChevronDown size={12} className="shrink-0" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg"
              style={{ color: 'var(--muted)' }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))',
                color: '#ffffff',
              }}
            >
              {isSubmitting ? '…' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>

      {/* Context selector bottom sheet */}
      <ContextSelectorSheet
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
        onSelect={(id, type, label) => {
          setContextId(id ?? undefined)
          setContextType(type)
          setContextLabel(label)
        }}
      />
    </>
  )
}
