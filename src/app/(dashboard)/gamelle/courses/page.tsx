'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, CheckCircle2, ChevronLeft } from 'lucide-react'
import { CheckPlacard } from '@/components/gamelle/shopping/CheckPlacard'
import { ShoppingList }  from '@/components/gamelle/shopping/ShoppingList'
import { RecipeSelector } from '@/components/gamelle/shopping/RecipeSelector'
import type { ShoppingItem } from '@/components/gamelle/shopping/CheckPlacard'

type LinkedRecipe = {
  recipe: { id: string; title: string; imageLocal: string | null }
  portions: number
}

type ShoppingListData = {
  id:          string
  generatedAt: string
  status:      'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  items:       ShoppingItem[]
  recipes:     LinkedRecipe[]
}

const POLL_INTERVAL = 5_000

/**
 * Page principale des courses.
 * Workflow : génération → check placard (DRAFT) → liste Smart Swipe (ACTIVE) → archivage.
 * Le statut en base pilote la vue affichée — pas de state local volatile.
 */
export default function CoursesPage() {
  const [list,        setList]        = useState<ShoppingListData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [archiving,   setArchiving]   = useState(false)
  const [showSelector, setShowSelector] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { void loadCurrent() }, [])

  // Polling temps réel quand la liste est en cours (ACTIVE)
  useEffect(() => {
    if (list?.status === 'ACTIVE') {
      pollRef.current = setInterval(() => { void loadCurrent(true) }, POLL_INTERVAL)
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [list?.id, list?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCurrent(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/shopping/current', { cache: 'no-store' })
      const data = await res.json() as ShoppingListData | null
      setList(data)
    } catch { /* ignore */ } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleGenerate(slotIds: string[]) {
    setGenerating(true)
    try {
      const res  = await fetch('/api/gamelle/shopping/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slotIds }),
      })
      const data = await res.json() as ShoppingListData
      setList(data)
      setShowSelector(false)
    } catch { /* ignore */ } finally {
      setGenerating(false)
    }
  }

  async function handleActivate() {
    if (!list) return
    try {
      await fetch(`/api/gamelle/shopping/${list.id}/activate`, { method: 'PATCH' })
      setList(prev => prev ? { ...prev, status: 'ACTIVE' } : null)
    } catch { /* ignore */ }
  }

  async function handleArchive() {
    if (!list) return
    const unpurchased = list.items.filter(i => !i.skipped && !i.purchased)
    if (unpurchased.length > 0) {
      if (!confirm(`Il reste ${unpurchased.length} article(s) non acheté(s). Terminer quand même ?`)) return
    }
    setArchiving(true)
    try {
      await fetch(`/api/gamelle/shopping/${list.id}/archive`, { method: 'PATCH' })
      setList(null)
    } catch { /* ignore */ } finally {
      setArchiving(false)
    }
  }

  async function handlePurchase(id: string, quantity: number, unit: string) {
    if (!list) return
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
    } catch { await loadCurrent() }
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
    setList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, skipped: !i.skipped } : i),
    } : null)
    try {
      await fetch(`/api/gamelle/shopping/items/${id}/skip`, { method: 'PATCH' })
    } catch { await loadCurrent() }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <PageHeader />
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      </div>
    )
  }

  if (!list || showSelector) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <PageHeader showBack={showSelector} onBack={() => setShowSelector(false)} />
        <div className="flex-1 overflow-y-auto">
          <RecipeSelector
            onConfirm={slotIds => void handleGenerate(slotIds)}
            loading={generating}
          />
        </div>
      </div>
    )
  }

  const purchasedCount  = list.items.filter(i => i.purchased).length
  const totalCount      = list.items.filter(i => !i.skipped).length
  const allDone         = purchasedCount >= totalCount && totalCount > 0

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <PageHeader
        onRegenerate={list.status === 'DRAFT' ? () => setShowSelector(true) : undefined}
        generating={generating}
      />

      <div className="flex-1 overflow-y-auto">
        {/* DRAFT — check placard */}
        {list.status === 'DRAFT' && (
          <CheckPlacard
            items={list.items.filter(i => !i.purchased)}
            onToggleSkip={handleToggleSkip}
            onDone={() => void handleActivate()}
          />
        )}

        {/* ACTIVE — Smart Swipe */}
        {list.status === 'ACTIVE' && (
          <ShoppingList
            items={list.items.filter(i => !i.skipped)}
            onPurchase={handlePurchase}
            onAddManual={handleAddManual}
          />
        )}
      </div>

      {/* Footer sticky — bouton "J'ai fini mes courses" */}
      {list.status === 'ACTIVE' && (
        <div
          className="shrink-0 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          <button
            onClick={() => void handleArchive()}
            disabled={archiving}
            className="w-full py-3.5 rounded-xl font-mono text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: allDone ? 'var(--success)' : 'var(--surface2)',
              color:      allDone ? '#fff' : 'var(--muted)',
              border:     allDone ? 'none' : '1px solid var(--border)',
            }}
          >
            <CheckCircle2 size={16} />
            {archiving ? 'Validation…' : "J'ai fini mes courses"}
          </button>
        </div>
      )}
    </div>
  )
}

function PageHeader({
  onRegenerate,
  generating,
  showBack,
  onBack,
}: {
  onRegenerate?: () => void
  generating?:   boolean
  showBack?:     boolean
  onBack?:       () => void
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {showBack ? (
        <button onClick={onBack} className="p-1 rounded-lg" style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={20} />
        </button>
      ) : (
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Courses
        </h1>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
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
