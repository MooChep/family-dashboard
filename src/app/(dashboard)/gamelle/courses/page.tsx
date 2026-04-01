'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { CheckPlacard } from '@/components/gamelle/shopping/CheckPlacard'
import { ShoppingList }  from '@/components/gamelle/shopping/ShoppingList'
import type { ShoppingItem } from '@/components/gamelle/shopping/CheckPlacard'

type ShoppingListData = {
  id:          string
  generatedAt: string
  items:       ShoppingItem[]
}

type View = 'check-placard' | 'shopping-list'

const POLL_INTERVAL = 5_000

/**
 * Page principale des courses.
 * Enchaîne : génération → check placard → liste finale (S18).
 */
export default function CoursesPage() {
  const [list,        setList]        = useState<ShoppingListData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [view,        setView]        = useState<View>('check-placard')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { void loadCurrent() }, [])

  // Polling temps réel quand la liste est ouverte (shopping-list view)
  useEffect(() => {
    if (view === 'shopping-list' && list) {
      pollRef.current = setInterval(() => { void loadCurrent(/* silent */ true) }, POLL_INTERVAL)
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [view, list?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCurrent(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/shopping/current')
      const data = await res.json() as ShoppingListData | null
      setList(data)
    } catch { /* ignore */ } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res  = await fetch('/api/gamelle/shopping/generate', { method: 'POST' })
      const data = await res.json() as ShoppingListData
      setList(data)
      setView('check-placard')
    } catch { /* ignore */ } finally {
      setGenerating(false)
    }
  }

  async function handlePurchase(id: string, quantity: number, unit: string) {
    if (!list) return
    // Optimiste
    setList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, purchased: true } : i),
    } : null)
    try {
      await fetch(`/api/gamelle/shopping/items/${id}/purchase`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quantity, unit }),
      })
    } catch {
      await loadCurrent()  // rollback
    }
  }

  async function handleAddManual(label: string) {
    if (!list) return
    try {
      const res  = await fetch('/api/gamelle/shopping/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label }),
      })
      const item = await res.json() as ShoppingItem
      setList(prev => prev ? { ...prev, items: [...prev.items, item] } : null)
    } catch { /* ignore */ }
  }

  async function handleToggleSkip(id: string) {
    if (!list) return
    // Optimiste
    setList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, skipped: !i.skipped } : i),
    } : null)
    try {
      await fetch(`/api/gamelle/shopping/items/${id}/skip`, { method: 'PATCH' })
    } catch {
      await loadCurrent()   // rollback
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <Header onGenerate={handleGenerate} generating={generating} hasList={false} />
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <Header onGenerate={handleGenerate} generating={generating} hasList={false} />
        <div className="flex flex-col items-center justify-center gap-4 flex-1 px-8 text-center">
          <span className="text-4xl">🛒</span>
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Aucune liste de courses
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
            Génère une liste depuis les recettes de ton menu.
          </p>
          <button
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="px-5 py-3 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {generating ? 'Génération…' : 'Générer la liste'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header onGenerate={handleGenerate} generating={generating} hasList />

      <div className="flex-1 overflow-y-auto">
        {view === 'check-placard' ? (
          <CheckPlacard
            items={list.items.filter(i => !i.purchased)}
            onToggleSkip={handleToggleSkip}
            onDone={() => setView('shopping-list')}
          />
        ) : (
          <ShoppingList
            items={list.items.filter(i => !i.skipped)}
            onPurchase={handlePurchase}
            onAddManual={handleAddManual}
          />
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Header({ onGenerate, generating, hasList }: { onGenerate: () => void; generating: boolean; hasList: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Courses
      </h1>
      {hasList && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs disabled:opacity-40"
          style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
          Regénérer
        </button>
      )}
    </div>
  )
}

