'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCaptureBar } from '@/lib/cerveau/hooks/useCaptureBar'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import { TypeSelector } from '@/components/cerveau/TypeSelector'
import { CaptureSheet } from '@/components/cerveau/CaptureSheet'
import { SuggestionDropdown } from '@/components/cerveau/SuggestionDropdown'
import { TemplateDropdown } from '@/components/cerveau/TemplateDropdown'
import type { ToastFn } from '@/lib/cerveau/hooks/useEntryActions'
import type { EntryType } from '@prisma/client'

// ── CaptureBar ────────────────────────────────────────────────────────────────

interface CaptureBarProps {
  onEntryCreated?: () => void
  refetch?:        () => void
  showToast?:      ToastFn
  parentId?:       string
}

export function CaptureBar({ onEntryCreated, refetch, showToast, parentId }: CaptureBarProps) {
  const {
    text,
    parsed,
    effectiveType,
    overriddenType,
    listSuggestions,
    projectSuggestions,
    templateSuggestions,
    resolvedProjectId,
    isSheetOpen,
    onChange,
    onTypeOverride,
    onOpenSheet,
    onCloseSheet,
    onSelectListSuggestion,
    onSelectProjectSuggestion,
    onCreateNewProject,
    onSubmit,
    onReset,
  } = useCaptureBar(parentId)

  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for programmatic open (e.g. from BottomNav Capture button or FAB)
  useEffect(() => {
    function handleOpen() { onOpenSheet() }
    window.addEventListener('cerveau:openCapture', handleOpen)
    return () => window.removeEventListener('cerveau:openCapture', handleOpen)
  }, [onOpenSheet])

  const showBadge = text.length > 2
  const meta = TYPE_CONFIG[effectiveType]
  const hasOverride = overriddenType !== null

  function handleTypeSelect(type: EntryType) {
    onTypeOverride(type)
    setTypeSelectorOpen(false)
  }

  function handleSheetClose() {
    onCloseSheet()
    onEntryCreated?.()
  }

  return (
    <>
      {typeSelectorOpen && (
        <TypeSelector
          selected={effectiveType}
          onSelect={handleTypeSelect}
          onClose={() => setTypeSelectorOpen(false)}
        />
      )}

      <CaptureSheet
        isOpen={isSheetOpen}
        rawText={text}
        effectiveType={effectiveType}
        parsed={parsed}
        resolvedProjectId={resolvedProjectId}
        parentId={parentId}
        onClose={handleSheetClose}
        onSubmit={onSubmit}
        refetch={refetch}
        showToast={showToast}
      />

      {/* Bar wrapper — mobile pleine largeur, desktop centré avec offset sidebar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-40 md:bottom-6 md:left-[calc(50%+120px)] md:right-auto md:-translate-x-1/2 md:w-full md:max-w-2xl md:pb-0">
        <div className="relative">
          <SuggestionDropdown
            listSuggestions={listSuggestions}
            projectSuggestions={projectSuggestions}
            onSelectList={s => { onSelectListSuggestion(s) }}
            onSelectProject={s => { onSelectProjectSuggestion(s); setTimeout(() => inputRef.current?.focus(), 50) }}
            onClose={() => { /* cleared automatically on selection */ }}
            newProjectTitle={parsed.targetProject ?? undefined}
            onCreateProject={parsed.targetProject ? onCreateNewProject : undefined}
          />
          {parsed.templateShortcut !== undefined && (
            <TemplateDropdown
              suggestions={templateSuggestions}
              isLibraryShortcut={text.trim() === '*'}
              onSelect={onReset}
              refetch={refetch ?? (() => {})}
              showToast={showToast ?? (() => {})}
            />
          )}
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-3 backdrop-blur-xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 95%, transparent)' }}
        >
          {/* Type badge */}
          <button
            type="button"
            onClick={() => setTypeSelectorOpen(true)}
            className={cn(
              'shrink-0 px-2.5 py-1.5 rounded-lg font-mono text-xs text-white transition-all',
              meta.color,
              showBadge ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
              hasOverride && 'ring-2 ring-white/30',
            )}
            style={{ transitionProperty: 'opacity, transform' }}
            aria-label="Changer le type"
          >
            {meta.label}
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onOpenSheet() } }}
            placeholder="Qu'est-ce qui occupe ton esprit ?"
            title="Raccourcis : /demain /lundi /15mar · @ilan @camille · ! !! !!! · #tag · +liste · .projet-name (tirets pour les espaces) · ~récurrence"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/60"
            style={{ color: '#ffffff' }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Submit button */}
          <button
            type="button"
            onClick={onOpenSheet}
            disabled={!text.trim()}
            className={cn(
              'shrink-0 w-9 h-9 rounded-md flex items-center justify-center transition-all',
              text.trim() ? 'opacity-100 scale-100' : 'opacity-30 scale-90 pointer-events-none',
            )}
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))' }}
            aria-label="Ouvrir le formulaire"
          >
            <ArrowRight size={17} strokeWidth={2.5} style={{ color: '#ffffff' }} />
          </button>
        </div>
      </div>
    </>
  )
}
