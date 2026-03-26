'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import type { CerveauListItem } from '@prisma/client'

// ── Types ──────────────────────────────────────────────────────────────────

type Item = Pick<CerveauListItem, 'id' | 'label' | 'checked' | 'order'>

// ── ItemRow ────────────────────────────────────────────────────────────────

function ItemRow({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-4 min-h-[72px] px-3 text-left transition-opacity duration-300"
      style={{ opacity: item.checked ? 0.6 : 1 }}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200"
        style={{
          borderColor:     item.checked ? 'var(--accent)' : 'var(--border2)',
          backgroundColor: item.checked ? 'var(--accent)' : 'transparent',
        }}
      >
        {item.checked && <Check size={15} strokeWidth={3} style={{ color: '#ffffff' }} />}
      </span>
      <span
        className={`font-body flex-1 transition-all duration-300 ${item.checked ? 'text-xl line-through' : 'text-2xl'}`}
        style={{ color: item.checked ? 'var(--muted)' : 'var(--text)' }}
      >
        {item.label}
      </span>
    </button>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────

function ErrorToast({ message }: { message: string }) {
  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-float z-[300] whitespace-nowrap"
      style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
    >
      {message}
    </div>
  )
}

// ── AllDoneDialog ──────────────────────────────────────────────────────────

function AllDoneDialog({
  onArchive,
  onKeep,
}: {
  onArchive: () => void
  onKeep: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6"
      onClick={onKeep}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-float text-center"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-4xl mb-3">🎉</p>
        <p className="font-headline text-xl mb-1" style={{ color: 'var(--text)' }}>
          Tout est coché !
        </p>
        <p className="font-body text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Archiver la liste ?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onKeep}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
          >
            Garder active
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#ffffff' }}
          >
            Archiver
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ShopPage ───────────────────────────────────────────────────────────────

export default function ShopPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [title, setTitle]             = useState('Liste')
  const [items, setItems]             = useState<Item[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [addingItem, setAddingItem]   = useState(false)
  const [newLabel, setNewLabel]       = useState('')
  const [showAllDone, setShowAllDone] = useState(false)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  const newInputRef  = useRef<HTMLInputElement>(null)
  const errorTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allDoneShown = useRef(false)   // évite de re-déclencher le dialog

  // ── WakeLock ────────────────────────────────────────────────────────────
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    async function acquire() {
      if ('wakeLock' in navigator) {
        try { lock = await navigator.wakeLock.request('screen') } catch { /* ignore */ }
      }
    }
    void acquire()
    return () => { void lock?.release() }
  }, [])

  // ── Fetch liste ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cerveau/entries/${id}`)
        if (!res.ok) return
        const data = await res.json() as { success: boolean; data: { title: string; listItems: Item[] } }
        if (data.success) {
          setTitle(data.data.title)
          setItems([...data.data.listItems].sort((a, b) => a.order - b.order))
        }
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [id])

  // ── Show error toast ─────────────────────────────────────────────────────
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setErrorMsg(null), 3000)
  }, [])

  // ── Check/uncheck ────────────────────────────────────────────────────────
  const toggleItem = useCallback(async (item: Item) => {
    const next = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i))

    const res = await fetch(`/api/cerveau/lists/${id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, checked: next }),
    })

    if (!res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i))
      showError('Erreur réseau — modification annulée')
    }
  }, [id, showError])

  // ── Add item ─────────────────────────────────────────────────────────────
  const addItem = useCallback(async () => {
    const label = newLabel.trim()
    if (!label) return
    setNewLabel('')
    setAddingItem(false)

    const tempId = `temp-${Date.now()}`
    setItems(prev => [{ id: tempId, label, checked: false, order: -1 }, ...prev])

    const res = await fetch(`/api/cerveau/lists/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, order: 0 }),
    })

    if (res.ok) {
      const data = await res.json() as { success: boolean; data: Item }
      setItems(prev => prev.map(i => i.id === tempId ? data.data : i))
    } else {
      setItems(prev => prev.filter(i => i.id !== tempId))
      showError('Erreur — item non ajouté')
    }
  }, [id, newLabel, showError])

  // ── All done dialog ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && items.length > 0 && items.every(i => i.checked) && !allDoneShown.current) {
      allDoneShown.current = true
      setShowAllDone(true)
    }
    if (items.some(i => !i.checked)) {
      allDoneShown.current = false
    }
  }, [items, isLoading])

  // ── Archive ───────────────────────────────────────────────────────────────
  const archiveList = useCallback(async () => {
    await fetch(`/api/cerveau/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
    router.push('/cerveau')
  }, [id, router])

  // ── Sorted views ─────────────────────────────────────────────────────────
  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i => i.checked)
  const total     = items.length
  const doneCount = checked.length

  return (
    /* Overlay plein écran — masque sidebar, bottomnav, tout le reste */
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center gap-3 px-4 pt-safe pt-5 pb-3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 95%, transparent)' }}
      >
        <button
          type="button"
          onClick={() => router.push('/cerveau')}
          className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)' }}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <h1
          className="flex-1 font-headline text-lg truncate"
          style={{ color: 'var(--text)' }}
        >
          {title}
        </h1>
        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--muted)' }}>
          {doneCount}/{total} ✓
        </span>
      </header>

      {/* ── Items list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>Chargement…</span>
          </div>
        ) : (
          <>
            {unchecked.map(item => (
              <ItemRow key={item.id} item={item} onToggle={() => void toggleItem(item)} />
            ))}

            {unchecked.length > 0 && checked.length > 0 && (
              <div className="my-2 mx-3 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />
            )}

            {checked.map(item => (
              <ItemRow key={item.id} item={item} onToggle={() => void toggleItem(item)} />
            ))}

            {items.length === 0 && (
              <p
                className="text-center font-body text-lg mt-16"
                style={{ color: 'var(--muted)' }}
              >
                Liste vide — ajoute un article ↓
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Error toast ──────────────────────────────────────────────── */}
      {errorMsg && <ErrorToast message={errorMsg} />}

      {/* ── Add item input ───────────────────────────────────────────── */}
      {addingItem && (
        <div
          className="fixed bottom-20 left-4 right-4 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-float z-[110]"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <input
            ref={newInputRef}
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); void addItem() }
              if (e.key === 'Escape') { setAddingItem(false); setNewLabel('') }
            }}
            placeholder="Ajouter un article…"
            className="flex-1 bg-transparent outline-none text-base cerveau-input border-b-2"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void addItem()}
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            OK
          </button>
        </div>
      )}

      {/* ── FAB + ───────────────────────────────────────────────────── */}
      {!addingItem && (
        <div className="fixed bottom-6 right-6 z-[110]">
          <button
            type="button"
            onClick={() => setAddingItem(true)}
            className="w-14 h-14 rounded-full text-3xl flex items-center justify-center shadow-float"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#ffffff' }}
            aria-label="Ajouter un article"
          >
            +
          </button>
        </div>
      )}

      {/* ── All done dialog ──────────────────────────────────────────── */}
      {showAllDone && (
        <AllDoneDialog
          onArchive={() => void archiveList()}
          onKeep={() => setShowAllDone(false)}
        />
      )}
    </div>
  )
}
