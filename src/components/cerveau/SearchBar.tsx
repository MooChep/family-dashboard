'use client'

import { useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Desktop inline search bar ──────────────────────────────────────────────

interface SearchBarDesktopProps {
  query: string
  onChange: (q: string) => void
  onClear: () => void
}

export function SearchBarDesktop({ query, onChange, onClear }: SearchBarDesktopProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 h-9 flex-1 max-w-xs"
      style={{ backgroundColor: 'var(--surface2)' }}
    >
      <Search size={14} style={{ color: 'var(--muted)' }} />
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Chercher…"
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: 'var(--text)' }}
        autoComplete="off"
        spellCheck={false}
      />
      {query && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Effacer"
          className="min-w-11 min-h-11 flex items-center justify-center -mr-2"
        >
          <X size={14} style={{ color: 'var(--muted)' }} />
        </button>
      )}
    </div>
  )
}

// ── Mobile overlay search ──────────────────────────────────────────────────

interface SearchOverlayProps {
  query: string
  onChange: (q: string) => void
  onClose: () => void
  children?: React.ReactNode
}

export function SearchOverlay({ query, onChange, onClose, children }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed top-14 left-0 right-0 bottom-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Input row */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <Search size={18} style={{ color: 'var(--muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chercher dans Cerveau…"
          className="flex-1 bg-transparent text-base outline-none"
          style={{ color: 'var(--text)' }}
          autoComplete="off"
          spellCheck={false}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Effacer"
            className="min-w-11 min-h-11 flex items-center justify-center"
            style={{ color: 'var(--text2)' }}
          >
            <X size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium shrink-0"
          style={{ color: 'var(--accent)' }}
        >
          Annuler
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ── Mobile trigger button ──────────────────────────────────────────────────

interface SearchButtonProps {
  onClick: () => void
  active?: boolean
}

export function SearchButton({ onClick, active }: SearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
        active && 'ring-2',
      )}
      style={{
        backgroundColor: 'var(--surface2)',
        color: active ? 'var(--accent)' : 'var(--muted)',
      }}
      aria-label="Rechercher"
    >
      <Search size={16} />
    </button>
  )
}
