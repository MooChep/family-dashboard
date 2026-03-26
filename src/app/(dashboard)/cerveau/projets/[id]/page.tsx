'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, ChevronDown, RotateCcw, Trash2 } from 'lucide-react'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { formatDateFR } from '@/lib/cerveau/formatDate'
import { groupEntries } from '@/lib/cerveau/groupEntries'
import { computeProjectHealth } from '@/lib/cerveau/projectHealth'
import { DashboardSection } from '@/components/cerveau/DashboardSection'
import { CaptureBar } from '@/components/cerveau/CaptureBar'
import { EntryDetailSheet } from '@/components/cerveau/EntryDetailSheet'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import type { EntryWithRelations, ApiResponse } from '@/lib/cerveau/types'

const HEALTH_COLOR: Record<string, string> = {
  green:  'var(--accent)',
  orange: 'var(--warning, #b5860d)',
  red:    'var(--danger, #c0392b)',
}

// ── SVG Progress Circle ────────────────────────────────────────────────────

const RADIUS       = 60
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ProgressCircle({ progress, healthColor }: { progress: number; healthColor: string }) {
  const offset = CIRCUMFERENCE * (1 - progress / 100)
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 140 140"
      className="shrink-0"
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden
    >
      <circle
        cx="70"
        cy="70"
        r={RADIUS}
        fill="none"
        strokeWidth="10"
        style={{ stroke: 'var(--surface2)' }}
      />
      <circle
        cx="70"
        cy="70"
        r={RADIUS}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ stroke: healthColor, transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProjetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast, showToast, dismiss } = useCerveauToast()

  const [project,      setProject]      = useState<EntryWithRelations | null>(null)
  const [children,     setChildren]     = useState<EntryWithRelations[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [description,  setDescription]  = useState('')
  const [detailEntry,  setDetailEntry]  = useState<EntryWithRelations | null>(null)
  const [showArchive,  setShowArchive]  = useState(false)
  const [confirmId,    setConfirmId]    = useState<string | null>(null)
  const descRef = useRef<HTMLDivElement>(null)

  const refetch = useCallback(async () => {
    try {
      const [projRes, childrenRes] = await Promise.all([
        fetch(`/api/cerveau/entries/${id}`),
        fetch(`/api/cerveau/entries?parentId=${id}`),
      ])
      if (projRes.ok) {
        const data = await projRes.json() as ApiResponse<EntryWithRelations>
        if (data.success && data.data) {
          setProject(data.data)
          setDescription(data.data.body ?? '')
          // Sync contentEditable text
          if (descRef.current && descRef.current.textContent !== (data.data.body ?? '')) {
            descRef.current.textContent = data.data.body ?? ''
          }
        }
      }
      if (childrenRes.ok) {
        const data = await childrenRes.json() as ApiResponse<EntryWithRelations[]>
        if (data.success && data.data) setChildren(data.data)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { void refetch() }, [refetch])

  const saveDescription = useCallback(async (text: string) => {
    await fetch(`/api/cerveau/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
  }, [id])

  const archivedChildren = children.filter(c => c.status === 'ARCHIVED' || c.status === 'DONE')

  async function handleRestore(entryId: string) {
    const res = await fetch(`/api/cerveau/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) { showToast('Restauré', 'success'); await refetch() }
    else showToast('Erreur', 'error')
  }

  async function handleDelete(entryId: string) {
    const res = await fetch(`/api/cerveau/entries/${entryId}?purge=true`, { method: 'DELETE' })
    const data = await res.json() as { success: boolean }
    if (data.success) { setConfirmId(null); showToast('Supprimé', 'success'); await refetch() }
    else showToast('Erreur', 'error')
  }

  const allSections    = groupEntries(children)
  // Split: discussions sidebar vs main content
  const mainSections   = allSections.filter(s => s.id !== 'discussion')
  const discSection    = allSections.find(s => s.id === 'discussion')

  const total    = children.filter(c => c.status !== 'ARCHIVED').length
  const done     = children.filter(c => c.status === 'DONE').length
  const progress = total > 0 ? (done / total) * 100 : 0
  const health   = project ? computeProjectHealth(project) : null
  const hColor   = health ? HEALTH_COLOR[health.status] : 'var(--accent)'

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 px-4 pt-5 pb-4 relative"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 95%, transparent)' }}
      >
        {/* Back + SVG circle row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <button
            type="button"
            onClick={() => router.push('/cerveau')}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 mt-1"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)' }}
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Title + health badge */}
          <div className="flex-1 min-w-0">
            {health && (
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
                style={{
                  backgroundColor: `color-mix(in srgb, ${hColor} 12%, transparent)`,
                  color: hColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hColor }} />
                {health.status === 'green' ? 'En bonne santé' : health.status === 'orange' ? 'À surveiller' : 'Attention'}
              </span>
            )}
            <h1
              className="font-display leading-tight"
              style={{
                color: 'var(--text)',
                fontSize: 'clamp(2rem, 6vw, 4.5rem)',
              }}
            >
              {project?.title ?? '…'}
            </h1>
          </div>

          {/* SVG progress circle — desktop only */}
          {total > 0 && (
            <div className="hidden md:flex shrink-0 flex-col items-center gap-1 mt-1">
              <ProgressCircle progress={progress} healthColor={hColor} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        {/* Description — contentEditable inline */}
        <div
          ref={descRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => {
            const text = e.currentTarget.textContent ?? ''
            setDescription(text)
            void saveDescription(text)
          }}
          className="font-body text-sm min-h-5 outline-none ml-13 cursor-text"
          style={{ color: description ? 'var(--text2)' : 'var(--muted)' }}
          data-placeholder="Ajouter une description…"
        >
          {description || ''}
        </div>

        {/* Mobile progress bar */}
        {total > 0 && (
          <div className="mt-3 ml-13 md:hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                {done}/{total} entrées
              </span>
              <span className="font-mono text-[10px]" style={{ color: hColor }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: hColor }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-44">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>Chargement…</span>
          </div>
        ) : allSections.length === 0 ? (
          <div className="mt-16 text-center px-4">
            <p className="text-4xl mb-3" style={{ opacity: 0.3 }}>📁</p>
            <p className="font-body text-base" style={{ color: 'var(--muted)' }}>Ce projet est vide.</p>
            <p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--muted)' }}>
              Ajoute une première entrée ci-dessous
            </p>
          </div>
        ) : (
          /* Desktop: col-8 main + col-4 discussions; Mobile: stacked */
          <div className="md:grid md:grid-cols-12 md:gap-6 px-4 md:px-8 mt-6">
            {/* Main sections */}
            <div className="md:col-span-8 space-y-8">
              {mainSections.map(section => (
                <DashboardSection
                  key={section.id}
                  section={section}
                  refetch={refetch}
                  showToast={showToast}
                  onOpenDetail={setDetailEntry}
                />
              ))}
            </div>

            {/* Discussions sidebar (desktop) / stacked (mobile) */}
            {discSection && discSection.entries.length > 0 && (
              <div className="md:col-span-4 mt-8 md:mt-0">
                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <DashboardSection
                    section={discSection}
                    refetch={refetch}
                    showToast={showToast}
                    onOpenDetail={setDetailEntry}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Archives du projet ──────────────────────────────────────── */}
        {!isLoading && archivedChildren.length > 0 && (
          <div className="px-4 md:px-8 mt-8 mb-4">
            <button
              type="button"
              onClick={() => setShowArchive(v => !v)}
              className="flex items-center gap-2 mb-3"
              style={{ color: 'var(--muted)' }}
            >
              <ChevronDown
                size={14}
                style={{ transform: showArchive ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              />
              <span className="font-mono text-[10px] uppercase tracking-widest">
                Archives · {archivedChildren.length}
              </span>
            </button>

            {showArchive && (
              <div className="space-y-1">
                {archivedChildren.map(entry => {
                  const meta = TYPE_CONFIG[entry.type]
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-headline text-sm truncate" style={{ color: 'var(--text)' }}>
                          {entry.title}
                        </p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                          {meta.label} · {entry.status === 'DONE' ? 'Terminé' : 'Archivé'} · {formatDateFR(new Date(entry.archivedAt ?? entry.doneAt ?? entry.createdAt))}
                        </p>
                      </div>

                      {confirmId === entry.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleDelete(entry.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: 'var(--danger, #e53e3e)', color: '#fff' }}
                          >
                            Supprimer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="px-2.5 py-1.5 rounded-lg text-xs"
                            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleRestore(entry.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'var(--surface2)', color: 'var(--accent)' }}
                            title="Restaurer"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(entry.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FAB + (mobile) ───────────────────────────────────────────────── */}
      <button
        type="button"
        className="md:hidden fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-float"
        style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
        aria-label="Ajouter une entrée"
        onClick={() => window.dispatchEvent(new Event('cerveau:openCapture'))}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* ── Capture bar ──────────────────────────────────────────────────── */}
      <CaptureBar
        parentId={id}
        onEntryCreated={refetch}
        refetch={refetch}
        showToast={showToast}
      />

      {/* ── Entry detail sheet ───────────────────────────────────────────── */}
      {detailEntry && (
        <EntryDetailSheet
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          refetch={refetch}
          showToast={showToast}
        />
      )}
    </div>
  )
}
