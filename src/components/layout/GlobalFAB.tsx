'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, CalendarClock, CheckCircle, PenLine, UtensilsCrossed, ListTodo, ArrowLeftRight } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { TransactionForm } from '@/components/butin/TransactionForm'
import { NewNoteModal } from '@/components/parchemin/NewNoteModal'
import { type Category } from '@prisma/client'

// ─── Actions disponibles ──────────────────────────────────────────────────────

const FAB_ACTIONS = [
  {
    id:    'labeur',
    label: 'Tâche rapide',
    icon:  ListTodo,
    type:  'sheet' as const,
  },
  {
    id:    'parchemin',
    label: 'Nouvelle note',
    icon:  PenLine,
    type:  'sheet' as const,
  },
  {
    id:    'gamelle',
    label: 'Voir le menu',
    icon:  UtensilsCrossed,
    type:  'navigate' as const,
    href:  '/gamelle/menu',
  },
  {
    id:    'butin',
    label: 'Nouvelle transaction',
    icon:  ArrowLeftRight,
    type:  'sheet' as const,
  },
] as const

type ActionId = (typeof FAB_ACTIONS)[number]['id']

// Pages où le FAB est inutile (déjà une page de création)
const HIDDEN_PATHS = ['/labeur/taches/nouvelle']

// ─── Composant principal ──────────────────────────────────────────────────────

export function GlobalFAB() {
  const pathname = usePathname()
  const router   = useRouter()

  const [menuOpen,        setMenuOpen]        = useState(false)
  const [activeSheet,     setActiveSheet]     = useState<ActionId | null>(null)

  if (HIDDEN_PATHS.includes(pathname)) return null

  function handleAction(action: typeof FAB_ACTIONS[number]) {
    setMenuOpen(false)
    if (action.type === 'navigate') {
      router.push(action.href)
    } else {
      setActiveSheet(action.id)
    }
  }

  return (
    <>
      {/* ── Backdrop menu ── */}
      {menuOpen && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 190, backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Actions speed-dial ── */}
      <div
        className="fixed flex flex-col items-end gap-3"
        style={{
          zIndex: 200,
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 68px)',
          right:  16,
          pointerEvents: menuOpen ? 'auto' : 'none',
        }}
      >
        {FAB_ACTIONS.map((action, i) => {
          const Icon = action.icon
          const delay = i * 40
          return (
            <div
              key={action.id}
              className="flex items-center gap-3"
              style={{
                opacity:    menuOpen ? 1 : 0,
                transform:  menuOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)',
                transition: `opacity 0.2s ease ${delay}ms, transform 0.2s ease ${delay}ms`,
              }}
            >
              {/* Label */}
              <span
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--surface)',
                  color:           'var(--text)',
                  border:          '1px solid var(--border)',
                  boxShadow:       '0 2px 8px rgba(0,0,0,0.12)',
                  whiteSpace:      'nowrap',
                }}
              >
                {action.label}
              </span>

              {/* Mini FAB */}
              <button
                onClick={() => handleAction(action)}
                className="flex items-center justify-center w-11 h-11 rounded-full transition-transform active:scale-95"
                style={{
                  backgroundColor: 'var(--surface)',
                  color:           'var(--accent)',
                  border:          '1px solid var(--border)',
                  boxShadow:       '0 2px 10px rgba(0,0,0,0.15)',
                }}
              >
                <Icon size={18} strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── FAB principal ── */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Actions rapides"
        className="fixed flex items-center justify-center w-14 h-14 rounded-full transition-transform active:scale-95"
        style={{
          zIndex: 200,
          bottom:          'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
          right:           16,
          backgroundColor: 'var(--accent)',
          color:           'var(--bg)',
          boxShadow:       '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <Plus
          size={22}
          strokeWidth={2.5}
          style={{
            transform:  menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s ease',
          }}
        />
      </button>

      {/* ── Bottom sheet Labeur ── */}
      {activeSheet === 'labeur' && (
        <LabeurQuickAddSheet
          onClose={() => setActiveSheet(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {/* ── Modal Parchemin ── */}
      <NewNoteModal
        isOpen={activeSheet === 'parchemin'}
        onClose={() => setActiveSheet(null)}
        onSaved={() => router.refresh()}
      />

      {/* ── Bottom sheet Butin ── */}
      {activeSheet === 'butin' && (
        <ButinTransactionSheet
          onClose={() => setActiveSheet(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  )
}

// ─── Bottom sheet quick-add tâche ────────────────────────────────────────────

function LabeurQuickAddSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title,   setTitle]   = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [toast,   setToast]   = useState<string | null>(null)

  const titleRef   = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)

    const res = await fetch('/api/labeur/tasks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:                trimmed,
        type:                 'ONESHOT',
        ecuValue:             1,
        isShared:             false,
        inflationContribRate: 0.01,
        ...(dueDate ? { dueDate } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.json() as { error?: string }
      setError(body.error ?? 'Erreur lors de la création')
      setSaving(false)
      return
    }

    const savedTitle = trimmed
    setSaving(false)
    onClose()
    onSaved()

    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(savedTitle)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  return (
    <>
      {/* Toast (rendu hors sheet pour survivre à la fermeture) */}
      {toast !== null && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium pointer-events-none"
          style={{
            zIndex:          210,
            bottom:          'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 68px)',
            backgroundColor: 'var(--surface)',
            color:           'var(--text)',
            border:          '1px solid var(--border)',
            boxShadow:       '0 4px 16px rgba(0,0,0,0.12)',
            whiteSpace:      'nowrap',
          }}
        >
          <CheckCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>«&nbsp;{toast}&nbsp;» ajoutée</span>
        </div>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 195, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 rounded-t-2xl px-5 pt-5 pb-8 flex flex-col gap-4"
        style={{
          zIndex:          205,
          bottom:          0,
          backgroundColor: 'var(--surface)',
          boxShadow:       '0 -8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drag handle */}
        <div
          className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            Tâche rapide
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{ color: 'var(--muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Titre */}
        <input
          ref={titleRef}
          type="text"
          placeholder="Nom de la tâche…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: 'var(--surface2)',
            color:           'var(--text)',
            border:          '1px solid var(--border)',
            outline:         'none',
          }}
        />

        {/* Date limite optionnelle */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <CalendarClock size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: dueDate ? 'var(--text)' : 'var(--muted)' }}
          />
          {dueDate && (
            <button onClick={() => setDueDate('')} style={{ color: 'var(--muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <p className="text-xs px-1" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
            {saving ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Bottom sheet Butin : nouvelle transaction ──────────────────────────────

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function ButinTransactionSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    fetch('/api/butin/categories')
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(f: {
    categoryId: string
    amount: number
    tags: string[]
    pointed: boolean
  }): Promise<void> {
    const res = await fetch('/api/butin/transactions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, month: getCurrentMonth() }),
    })
    if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
    onSaved()
  }

  if (loading) return null

  return (
    <TransactionForm
      isOpen
      onClose={onClose}
      onSave={handleSave}
      categories={categories}
    />
  )
}
