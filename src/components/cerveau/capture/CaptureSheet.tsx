'use client'

import { useEffect, useState, useCallback, type ReactElement, type CSSProperties } from 'react'
import { type EntryType, type EntryAssignee } from '@prisma/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ENTRY_TYPE_META } from '@/lib/cerveau/types'
import { parseInlineShortcuts, type ParsedCapture } from '@/lib/cerveau/parser'

// ── Constants ──

const ALL_TYPES: EntryType[] = ['NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT']

const ASSIGNEES: Array<{ value: EntryAssignee; label: string; initials: string }> = [
  { value: 'SHARED',  label: 'Partagé', initials: '◈' },
  { value: 'ILAN',    label: 'Ilan',    initials: 'IL' },
  { value: 'CAMILLE', label: 'Camille', initials: 'CA' },
]

const TEMPORAL_TYPES: Set<EntryType> = new Set(['REMINDER', 'EVENT'])

// ── Props ──

export interface CaptureSheetProps {
  isOpen:        boolean
  onClose:       () => void
  /** Texte complet saisi dans la CaptureBar (raccourcis inclus). */
  rawText:       string
  /** Type prédit par le NLP avant interaction utilisateur. */
  predictedType: EntryType | null
  /** Appelé après sauvegarde réussie — la page peut rafraîchir / afficher un toast. */
  onConfirmed:   (entry: { type: EntryType; content: string }) => void
}

// ── Form state ──

interface FormState {
  selectedType: EntryType
  assignedTo:   EntryAssignee
  dueDate:      string   // "YYYY-MM-DD"
  dueTime:      string   // "HH:MM"
  startDate:    string
  startTime:    string
  allDay:       boolean
  showDate:     boolean
}

// ── Helpers ──

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildInitialState(parsed: ParsedCapture, predictedType: EntryType | null): FormState {
  const selectedType = parsed.detectedType ?? predictedType ?? 'NOTE'
  const showDate = TEMPORAL_TYPES.has(selectedType) || !!parsed.forcedDate

  let dueDate = '', dueTime = '', startDate = '', startTime = ''
  if (parsed.forcedDate) {
    const d = parsed.forcedDate
    dueDate = startDate = toDateString(d)
    dueTime = startTime = toTimeString(d)
  }

  return {
    selectedType,
    assignedTo: parsed.assignedTo ?? 'SHARED',
    dueDate, dueTime, startDate, startTime,
    allDay: false,
    showDate,
  }
}

/** Construit le corps de la requête POST /api/cerveau/entries. */
function buildPostBody(
  parsed:        ParsedCapture,
  rawText:       string,
  form:          FormState,
  predictedType: EntryType | null,
) {
  const content = parsed.rawText.trim() || rawText.trim()

  const makeISODate = (date: string, time: string, allDay: boolean): string =>
    allDay
      ? `${date}T00:00:00.000Z`
      : new Date(`${date}T${time || '09:00'}:00`).toISOString()

  const dueDate =
    (form.selectedType === 'REMINDER' || form.selectedType === 'TODO') && form.dueDate
      ? makeISODate(form.dueDate, form.dueTime, form.allDay)
      : undefined

  const startDate =
    form.selectedType === 'EVENT' && form.startDate
      ? makeISODate(form.startDate, form.startTime, form.allDay)
      : undefined

  return {
    type:             form.selectedType,
    content,
    predicted:        predictedType ?? form.selectedType,
    assignedTo:       form.assignedTo,
    tags:             parsed.tags,
    dueDate,
    startDate,
    allDay:           form.allDay || undefined,
    recurrenceRule:   parsed.recurrence,
    projectRef:       parsed.projectRef,
    listRef:          parsed.listRef,
    isUrgent:         form.selectedType === 'DISCUSSION' ? false : undefined,
    source:           'CAPTURE' as const,
  }
}

// ── Sub-components ──

interface SectionLabelProps { children: string }

function SectionLabel({ children }: SectionLabelProps): ReactElement {
  return (
    <p
      style={{
        fontFamily:    'var(--font-mono)',
        fontSize:      '10px',
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         'var(--muted)',
        marginBottom:  '8px',
      }}
    >
      {children}
    </p>
  )
}

// ── Composant principal ──

/**
 * Bottom sheet de confirmation de capture.
 *
 * - Pré-remplit type / assigné / date depuis les raccourcis parsés
 * - Permet de changer le type (TypeSelector) et l'assigné
 * - Affiche la section date si type temporel ou date forcée
 * - Valide et POST vers /api/cerveau/entries
 */
export function CaptureSheet({
  isOpen,
  onClose,
  rawText,
  predictedType,
  onConfirmed,
}: CaptureSheetProps): ReactElement {
  const [parsed, setParsed]         = useState<ParsedCapture>({ rawText: '', tags: [] })
  const [form,   setForm]           = useState<FormState>(() =>
    buildInitialState({ rawText: '', tags: [] }, null)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ── Reset state lorsque le sheet s'ouvre ──
  useEffect(() => {
    if (!isOpen) return
    const p = parseInlineShortcuts(rawText)
    setParsed(p)
    setForm(buildInitialState(p, predictedType))
    setError(null)
  }, [isOpen, rawText, predictedType])

  // ── Sync showDate quand le type change ──
  const handleTypeChange = useCallback((type: EntryType): void => {
    setForm(f => ({
      ...f,
      selectedType: type,
      showDate: TEMPORAL_TYPES.has(type) || !!parsed.forcedDate,
    }))
  }, [parsed.forcedDate])

  // ── Validation ──
  function getValidationError(): string | null {
    const content = parsed.rawText.trim() || rawText.trim()
    if (!content) return 'Le contenu ne peut pas être vide'
    if (form.selectedType === 'REMINDER' && !form.dueDate) return 'Date requise pour un Rappel'
    if (form.selectedType === 'EVENT'    && !form.startDate) return 'Date requise pour un Événement'
    if (form.selectedType === 'PROJECT'  && content.length < 2) return 'Le nom du projet doit faire au moins 2 caractères'
    return null
  }

  // ── Soumission ──
  async function handleConfirm(): Promise<void> {
    const validErr = getValidationError()
    if (validErr) { setError(validErr); return }

    setIsSubmitting(true)
    setError(null)

    try {
      const body = buildPostBody(parsed, rawText, form, predictedType)
      const res  = await fetch('/api/cerveau/entries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur lors de la sauvegarde')
        return
      }

      onClose()
      onConfirmed({ type: form.selectedType, content: parsed.rawText.trim() || rawText.trim() })
    } catch {
      setError('Erreur réseau')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Styles partagés ──
  const fieldStyle: CSSProperties = {
    background:   'var(--surface2)',
    border:       '1px solid var(--border)',
    borderRadius: '8px',
    padding:      '8px 12px',
    fontFamily:   'var(--font-body)',
    fontSize:     '14px',
    color:        'var(--text)',
    width:        '100%',
    outline:      'none',
    boxSizing:    'border-box',
  }

  const isDateField = form.selectedType === 'EVENT'
  const dateLabel   = isDateField ? 'DATE DE DÉBUT' : 'DATE'
  const dateValue   = isDateField ? form.startDate : form.dueDate
  const timeValue   = isDateField ? form.startTime : form.dueTime

  function setDate(v: string): void {
    setForm(f => isDateField ? { ...f, startDate: v } : { ...f, dueDate: v })
  }
  function setTime(v: string): void {
    setForm(f => isDateField ? { ...f, startTime: v } : { ...f, dueTime: v })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-6" style={{ paddingTop: '4px' }}>

        {/* ── Aperçu du texte saisi ── */}
        <p
          style={{
            fontFamily:    'var(--font-body)',
            fontSize:      '15px',
            color:         'var(--text)',
            marginBottom:  '20px',
            borderLeft:    '3px solid var(--accent)',
            paddingLeft:   '12px',
            lineHeight:    '1.5',
            wordBreak:     'break-word',
          }}
        >
          {rawText}
        </p>

        {/* ── TYPE ── */}
        <div style={{ marginBottom: '20px' }}>
          <SectionLabel>Type</SectionLabel>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
          >
            {ALL_TYPES.map(type => (
              <TypeButton
                key={type}
                type={type}
                selected={form.selectedType === type}
                onClick={() => handleTypeChange(type)}
              />
            ))}
          </div>
        </div>

        {/* ── POUR ── */}
        <div style={{ marginBottom: '20px' }}>
          <SectionLabel>Pour</SectionLabel>
          <div className="flex gap-2">
            {ASSIGNEES.map(({ value, label, initials }) => (
              <AssigneeButton
                key={value}
                label={label}
                initials={initials}
                selected={form.assignedTo === value}
                onClick={() => setForm(f => ({ ...f, assignedTo: value }))}
              />
            ))}
          </div>
        </div>

        {/* ── TAGS (si présents) ── */}
        {parsed.tags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {parsed.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    background:   'color-mix(in srgb, var(--cerveau-tag) 15%, transparent)',
                    color:        'var(--cerveau-tag)',
                    border:       '1px solid color-mix(in srgb, var(--cerveau-tag) 30%, transparent)',
                    borderRadius: '6px',
                    padding:      '2px 10px',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '12px',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── DATE & HEURE (si type temporel ou date forcée) ── */}
        {form.showDate && (
          <div style={{ marginBottom: '20px' }}>
            <SectionLabel>{dateLabel}</SectionLabel>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateValue}
                onChange={e => setDate(e.target.value)}
                style={{ ...fieldStyle, flex: 1 }}
              />
              {!form.allDay && (
                <input
                  type="time"
                  value={timeValue}
                  onChange={e => setTime(e.target.value)}
                  style={{ ...fieldStyle, width: '120px', flex: 'none' }}
                />
              )}
            </div>
            {/* Toggle journée entière */}
            <label
              className="flex items-center gap-2"
              style={{ marginTop: '8px', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                Journée entière
              </span>
            </label>
          </div>
        )}

        {/* ── Erreur de validation ── */}
        {error && (
          <p
            style={{
              color:        'var(--error)',
              fontFamily:   'var(--font-body)',
              fontSize:     '13px',
              marginBottom: '12px',
            }}
          >
            {error}
          </p>
        )}

        {/* ── Actions ── */}
        <div
          className="flex gap-3"
          style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}
        >
          <CancelButton onClick={onClose} />
          <ConfirmButton onClick={() => void handleConfirm()} disabled={isSubmitting} />
        </div>
      </div>
    </BottomSheet>
  )
}

// ── TypeButton ──

interface TypeButtonProps {
  type:     EntryType
  selected: boolean
  onClick:  () => void
}

function TypeButton({ type, selected, onClick }: TypeButtonProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  const meta = ENTRY_TYPE_META[type]
  const Icon = meta.icon

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background:   selected
          ? `color-mix(in srgb, ${meta.colorVar} 20%, transparent)`
          : isHovered
            ? 'var(--surface2)'
            : 'transparent',
        border:       selected
          ? `1px solid color-mix(in srgb, ${meta.colorVar} 50%, transparent)`
          : '1px solid var(--border)',
        borderRadius: '8px',
        padding:      '8px 6px',
        cursor:       'pointer',
        color:        selected ? meta.colorVar : 'var(--muted)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          '5px',
        fontFamily:   'var(--font-mono)',
        fontSize:     '11px',
        fontWeight:   selected ? 700 : 400,
        letterSpacing: '0.04em',
        transition:   'background 150ms ease, border-color 150ms ease, color 150ms ease',
        width:        '100%',
      }}
    >
      <Icon size={13} />
      {meta.label}
    </button>
  )
}

// ── AssigneeButton ──

interface AssigneeButtonProps {
  label:    string
  initials: string
  selected: boolean
  onClick:  () => void
}

function AssigneeButton({ label, initials, selected, onClick }: AssigneeButtonProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background:   selected ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : isHovered ? 'var(--surface2)' : 'transparent',
        border:       selected ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' : '1px solid var(--border)',
        borderRadius: '8px',
        padding:      '7px 14px',
        cursor:       'pointer',
        color:        selected ? 'var(--accent)' : 'var(--muted)',
        fontFamily:   'var(--font-mono)',
        fontSize:     '12px',
        fontWeight:   selected ? 700 : 400,
        display:      'flex',
        alignItems:   'center',
        gap:          '6px',
        transition:   'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      <span style={{ fontSize: '11px' }}>{initials}</span>
      {label}
    </button>
  )
}

// ── CancelButton ──

function CancelButton({ onClick }: { onClick: () => void }): ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex:         1,
        background:   isHovered ? 'var(--surface2)' : 'transparent',
        border:       '1px solid var(--border)',
        borderRadius: '10px',
        padding:      '12px',
        cursor:       'pointer',
        color:        'var(--muted)',
        fontFamily:   'var(--font-mono)',
        fontSize:     '13px',
        fontWeight:   700,
        letterSpacing: '0.05em',
        transition:   'background 150ms ease',
      }}
    >
      ANNULER
    </button>
  )
}

// ── ConfirmButton ──

function ConfirmButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }): ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex:         2,
        background:   disabled
          ? 'color-mix(in srgb, var(--accent) 40%, transparent)'
          : isHovered
            ? 'var(--accent)'
            : 'color-mix(in srgb, var(--accent) 80%, transparent)',
        border:       'none',
        borderRadius: '10px',
        padding:      '12px',
        cursor:       disabled ? 'default' : 'pointer',
        color:        'var(--bg)',
        fontFamily:   'var(--font-mono)',
        fontSize:     '13px',
        fontWeight:   700,
        letterSpacing: '0.05em',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          '6px',
        transition:   'background 150ms ease',
      }}
    >
      {disabled ? 'ENVOI…' : 'CONFIRMER ✓'}
    </button>
  )
}

