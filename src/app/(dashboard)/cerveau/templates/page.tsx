'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Pencil, Trash2, Check, X } from 'lucide-react'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import type { TemplateSummary } from '@/app/api/cerveau/templates/route'
import type { ApiResponse } from '@/lib/cerveau/types'
import { CreateTemplateSheet } from '@/components/cerveau/CreateTemplateSheet'

// ── Toast (local) ──────────────────────────────────────────────────────────

type ToastState = { message: string; kind: 'success' | 'error' } | null

function useLocalToast() {
  const [toast, setToast] = useState<ToastState>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])
  return { toast, show: (message: string, kind: 'success' | 'error') => setToast({ message, kind }) }
}

function LocalToast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-float text-sm font-medium text-white flex items-center gap-2"
      style={{ backgroundColor: toast.kind === 'success' ? 'var(--accent)' : 'var(--danger)' }}
    >
      {toast.message}
    </div>
  )
}

// ── Inline edit row ────────────────────────────────────────────────────────

interface EditRowProps {
  template:  TemplateSummary
  onSave:    (id: string, name: string, shortcut: string) => Promise<void>
  onCancel:  () => void
}

function EditRow({ template, onSave, onCancel }: EditRowProps) {
  const [name,     setName]     = useState(template.name)
  const [shortcut, setShortcut] = useState(template.shortcut ?? '')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(template.id, name, shortcut)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none border-b"
        style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
        autoFocus
      />
      <input
        type="text"
        value={shortcut}
        onChange={e => setShortcut(e.target.value.replace(/\s/g, ''))}
        placeholder="shortcut"
        className="w-28 bg-transparent text-xs outline-none border-b font-mono"
        style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
      />
      <button type="button" onClick={() => void handleSave()} disabled={saving} aria-label="Enregistrer">
        <Check size={15} style={{ color: 'var(--accent)' }} />
      </button>
      <button type="button" onClick={onCancel} aria-label="Annuler">
        <X size={15} style={{ color: 'var(--muted)' }} />
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates,    setTemplates]    = useState<TemplateSummary[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { toast, show } = useLocalToast()

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/cerveau/templates')
      const data = await res.json() as ApiResponse<TemplateSummary[]>
      if (data.success && data.data) setTemplates(data.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void fetchTemplates() }, [fetchTemplates])

  async function handleUse(id: string) {
    try {
      const res = await fetch(`/api/cerveau/templates/${id}/use`, { method: 'POST' })
      const data = await res.json() as ApiResponse<unknown>
      if (data.success) {
        show('Entry créée ✓', 'success')
      } else {
        show('Erreur lors de l\'instanciation', 'error')
      }
    } catch {
      show('Erreur réseau', 'error')
    }
  }

  async function handleSaveEdit(id: string, name: string, shortcut: string) {
    try {
      const res = await fetch(`/api/cerveau/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, shortcut: shortcut || null }),
      })
      const data = await res.json() as ApiResponse<unknown>
      if (data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === id ? { ...t, name, shortcut: shortcut || null } : t,
        ))
        show('Template mis à jour', 'success')
        setEditingId(null)
      } else {
        show('Erreur lors de la mise à jour', 'error')
      }
    } catch {
      show('Erreur réseau', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/cerveau/templates/${id}`, { method: 'DELETE' })
      const data = await res.json() as ApiResponse<unknown>
      if (data.success) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        show('Template supprimé', 'success')
      } else {
        show('Erreur lors de la suppression', 'error')
      }
    } catch {
      show('Erreur réseau', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg)' }}>
      <LocalToast toast={toast} />

      <CreateTemplateSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={t => setTemplates(prev => [t, ...prev])}
        onToast={show}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 pt-6 pb-4 backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Link
              href="/cerveau"
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="font-display text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
                Templates
              </h1>
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                patterns réutilisables
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))',
              color: '#ffffff',
            }}
          >
            + Nouveau
          </button>
        </div>
      </header>

      {/* Content */}
      {isLoading && (
        <div className="px-4 mt-8">
          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Chargement…</p>
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <div className="px-4 mt-16 text-center">
          <p className="font-display text-2xl" style={{ color: 'var(--text)', opacity: 0.3 }}>
            Aucun template
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: 'var(--muted)' }}>
            Survole une carte et clique sur ❐ pour en créer un
          </p>
        </div>
      )}

      {!isLoading && templates.length > 0 && (
        <div className="px-4 mt-6 space-y-2">
          {templates.map(t => {
            const meta = TYPE_CONFIG[t.type]
            const isEditing  = editingId  === t.id
            const isDeleting = deletingId === t.id

            return (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                {/* Type badge */}
                <div className={`self-stretch w-1.5 shrink-0 ${meta.borderClass.replace('border-', 'bg-')}`} />

                {isEditing ? (
                  <EditRow
                    template={t}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex-1 min-w-0 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-white ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {t.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {t.shortcut && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
                          *{t.shortcut}
                        </span>
                      )}
                      {t.items.length > 0 && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                          × {t.items.length} élément{t.items.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {t.recurrence && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                          ↻ {t.recurrence}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 pr-3 shrink-0">
                    {isDeleting ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleDelete(t.id)}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}
                        >
                          Supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1.5 rounded-lg text-xs"
                          style={{ color: 'var(--muted)' }}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleUse(t.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
                          style={{ backgroundColor: 'var(--surface2)', color: 'var(--accent)' }}
                          aria-label="Instancier"
                          title="Créer une entry depuis ce template"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(t.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
                          style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                          aria-label="Modifier"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(t.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
                          style={{ backgroundColor: 'var(--surface2)', color: 'var(--danger)' }}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
