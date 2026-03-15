'use client'

import {
  useState,
  useEffect,
  useCallback,
  type ReactElement,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ProjectProgress } from './ProjectProgress'
import { ProjectSection } from './ProjectSection'
import { type ProjectEntry } from './ProjectCard'

// ── Types ──

interface ChildEntry {
  id:         string
  type:       string
  content:    string
  status:     string
  assignedTo: string
  priority:   string | null
  dueDate:    string | null
  isUrgent:   boolean
}

interface ProjectEntriesData {
  open:      ChildEntry[]
  notes:     ChildEntry[]
  completed: ChildEntry[]
}

interface ProjectDetailProps {
  entry:     ProjectEntry | null
  onClose:   () => void
  onDone:    (id: string) => void
  onPause:   (id: string) => void
}

// ── Helpers ──

/** Icône de type pour une entrée enfant. */
function typeIcon(type: string): string {
  switch (type) {
    case 'TODO':       return '◻'
    case 'REMINDER':   return '⏰'
    case 'DISCUSSION': return '◈'
    case 'NOTE':       return '◆'
    case 'EVENT':      return '◷'
    default:           return '·'
  }
}

/** Formate une date courte. */
function formatShort(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Retourne true si la date est dépassée. */
function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ── Sous-composant : ligne d'entrée enfant ──

interface ChildRowProps {
  entry:      ChildEntry
  onComplete: (id: string) => void
  isLast:     boolean
}

function ChildRow({ entry, onComplete, isLast }: ChildRowProps): ReactElement {
  const overdue = isPast(entry.dueDate) && entry.status === 'OPEN'
  const due     = formatShort(entry.dueDate)
  const done    = entry.status === 'DONE' || entry.status === 'CANCELLED'

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
        padding:      '10px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        opacity:      done ? 0.5 : 1,
      }}
    >
      {/* ── Case ou icône ── */}
      {entry.type === 'TODO' ? (
        <button
          onClick={() => { onComplete(entry.id) }}
          style={{
            width:        '16px',
            height:       '16px',
            borderRadius: '3px',
            border:       done ? 'none' : '1.5px solid var(--border)',
            background:   done ? 'var(--cerveau-project)' : 'transparent',
            cursor:       done ? 'default' : 'pointer',
            flexShrink:   0,
            padding:      0,
            fontSize:     '10px',
            color:        'var(--text-on-accent)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}
        >
          {done ? '✓' : ''}
        </button>
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   '12px',
            color:      done ? 'var(--muted)' : 'var(--cerveau-project)',
            flexShrink: 0,
            width:      '16px',
            textAlign:  'center',
          }}
        >
          {typeIcon(entry.type)}
        </span>
      )}

      {/* ── Contenu ── */}
      <span
        style={{
          flex:            1,
          fontFamily:      'var(--font-body)',
          fontSize:        '13px',
          color:           done ? 'var(--muted)' : 'var(--text)',
          textDecoration:  done ? 'line-through' : 'none',
          overflow:        'hidden',
          textOverflow:    'ellipsis',
          whiteSpace:      'nowrap',
        }}
      >
        {entry.isUrgent && !done && (
          <span style={{ color: 'var(--error)', marginRight: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            !!{' '}
          </span>
        )}
        {entry.content}
      </span>

      {/* ── Méta droite ── */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {entry.priority === 'HIGH' && !done && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cerveau-todo)' }}>!!!</span>
        )}
        {entry.priority === 'MEDIUM' && !done && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)' }}>!!</span>
        )}
        {due && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '10px',
              color:      overdue ? 'var(--error)' : 'var(--muted)',
              fontWeight: overdue ? 700 : 400,
            }}
          >
            {due}
          </span>
        )}
        {entry.assignedTo !== 'SHARED' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
            {entry.assignedTo === 'ILAN' ? 'Ilan' : 'Camille'}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ──

/**
 * Vue détail d'un Projet en bottom sheet.
 * 3 sections : À FAIRE · NOTES · COMPLÉTÉS (replié par défaut).
 * Champ de capture en bas pour ajouter une entrée au projet.
 */
export function ProjectDetail({ entry, onClose, onDone, onPause }: ProjectDetailProps): ReactElement {
  const [data,    setData]    = useState<ProjectEntriesData>({ open: [], notes: [], completed: [] })
  const [loading, setLoading] = useState(false)
  const [addText, setAddText] = useState('')
  const [adding,  setAdding]  = useState(false)

  // ── Chargement des entrées ──

  const loadEntries = useCallback((id: string) => {
    setLoading(true)
    void fetch(`/api/cerveau/projects/${id}/entries`)
      .then((r) => r.json() as Promise<ProjectEntriesData>)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (entry) {
      setAddText('')
      loadEntries(entry.id)
    }
  }, [entry, loadEntries])

  if (!entry) return <></>

  // ── Calcul progression pour l'en-tête ──
  const completable = [...data.open, ...data.completed].filter((e) => e.type !== 'NOTE')
  const doneCount   = completable.filter((e) => e.status === 'DONE' || e.status === 'CANCELLED').length
  const totalCount  = completable.length

  // ── Compléter une entrée (cocher un todo) ──

  function handleComplete(id: string): void {
    void fetch(`/api/cerveau/entries/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'DONE' }),
    }).then(() => {
      // déplace l'entrée de open vers completed
      setData((prev) => {
        const item = prev.open.find((e) => e.id === id)
        if (!item) return prev
        const updated: ChildEntry = { ...item, status: 'DONE' }
        return {
          ...prev,
          open:      prev.open.filter((e) => e.id !== id),
          completed: [updated, ...prev.completed],
        }
      })
    })
  }

  // ── Ajouter une entrée au projet ──

  function handleAdd(): void {
    const trimmed = addText.trim()
    if (!trimmed || adding) return
    setAdding(true)
    void fetch('/api/cerveau/entries', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'TODO', content: trimmed, projectId: entry!.id }),
    })
      .then((r) => r.json() as Promise<ChildEntry>)
      .then((newEntry) => {
        setData((prev) => ({
          ...prev,
          open: [...prev.open, newEntry],
        }))
        setAddText('')
        setAdding(false)
      })
      .catch(() => { setAdding(false) })
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <BottomSheet isOpen={!!entry} onClose={onClose}>
      <div style={{ padding: '16px 0 0' }}>

        {/* ── En-tête ── */}
        <div style={{ padding: '0 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--cerveau-project)' }}>
              ◈
            </span>
            <span
              style={{
                flex:       1,
                fontFamily: 'var(--font-body)',
                fontSize:   '16px',
                fontWeight: 600,
                color:      'var(--text)',
              }}
            >
              {entry.content}
            </span>
          </div>

          {/* ── Barre de progression ── */}
          {totalCount > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <ProjectProgress done={doneCount} total={totalCount} />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-2">
            <button
              onClick={() => { onPause(entry.id); onClose() }}
              style={{
                padding:      '4px 10px',
                borderRadius: '20px',
                border:       '1px solid var(--border)',
                background:   'transparent',
                color:        'var(--muted)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '11px',
                cursor:       'pointer',
              }}
            >
              {entry.status === 'PAUSED' ? 'reprendre' : 'pause'}
            </button>
            <button
              onClick={() => { onDone(entry.id); onClose() }}
              style={{
                padding:      '4px 10px',
                borderRadius: '20px',
                border:       '1px solid var(--cerveau-project)',
                background:   'transparent',
                color:        'var(--cerveau-project)',
                fontFamily:   'var(--font-mono)',
                fontSize:     '11px',
                cursor:       'pointer',
              }}
            >
              terminer
            </button>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ maxHeight: '55dvh', overflowY: 'auto' }}>
          {loading ? (
            <div
              style={{
                padding:    '24px',
                textAlign:  'center',
                fontFamily: 'var(--font-body)',
                fontSize:   '14px',
                color:      'var(--muted)',
              }}
            >
              Chargement…
            </div>
          ) : (
            <>
              {/* ── Section À FAIRE ── */}
              <ProjectSection title="À faire" count={data.open.length}>
                {data.open.length === 0 ? (
                  <div
                    style={{
                      padding:    '16px 20px',
                      fontFamily: 'var(--font-body)',
                      fontSize:   '13px',
                      color:      'var(--muted)',
                    }}
                  >
                    Aucune entrée ouverte.
                  </div>
                ) : (
                  data.open.map((child, i) => (
                    <ChildRow
                      key={child.id}
                      entry={child}
                      onComplete={handleComplete}
                      isLast={i === data.open.length - 1}
                    />
                  ))
                )}
              </ProjectSection>

              {/* ── Section NOTES ── */}
              <ProjectSection title="Notes" count={data.notes.length}>
                {data.notes.length === 0 ? (
                  <div
                    style={{
                      padding:    '16px 20px',
                      fontFamily: 'var(--font-body)',
                      fontSize:   '13px',
                      color:      'var(--muted)',
                    }}
                  >
                    Aucune note.
                  </div>
                ) : (
                  data.notes.map((note, i) => (
                    <ChildRow
                      key={note.id}
                      entry={note}
                      onComplete={handleComplete}
                      isLast={i === data.notes.length - 1}
                    />
                  ))
                )}
              </ProjectSection>

              {/* ── Section COMPLÉTÉS ── */}
              <ProjectSection title="Complétés" count={data.completed.length} collapsedByDefault>
                {data.completed.map((child, i) => (
                  <ChildRow
                    key={child.id}
                    entry={child}
                    onComplete={handleComplete}
                    isLast={i === data.completed.length - 1}
                  />
                ))}
              </ProjectSection>
            </>
          )}
        </div>

        {/* ── Champ d'ajout rapide ── */}
        <div
          style={{
            borderTop:  '1px solid var(--border)',
            padding:    '10px 14px 28px',
            background: 'var(--surface)',
            display:    'flex',
            gap:        '8px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>›</span>
          <input
            value={addText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setAddText(e.target.value) }}
            onKeyDown={handleAddKeyDown}
            placeholder="ajouter une entrée…"
            style={{
              flex:       1,
              border:     'none',
              background: 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize:   '14px',
              color:      'var(--text)',
              outline:    'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!addText.trim() || adding}
            style={{
              padding:      '6px 12px',
              borderRadius: '8px',
              border:       'none',
              background:   addText.trim() && !adding ? 'var(--cerveau-project)' : 'var(--surface2)',
              color:        addText.trim() && !adding ? 'var(--text-on-accent)' : 'var(--muted)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              cursor:       addText.trim() && !adding ? 'pointer' : 'not-allowed',
              transition:   'background 150ms',
              flexShrink:   0,
            }}
          >
            +
          </button>
        </div>

      </div>
    </BottomSheet>
  )
}
