'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Archive, Settings } from 'lucide-react'
import { useDashboard } from '@/lib/cerveau/hooks/useDashboard'
import { useSearch } from '@/lib/cerveau/hooks/useSearch'
import { useCerveauToast, CerveauToast } from '@/components/cerveau/CerveauToast'
import { StatsStrip } from '@/components/cerveau/StatsStrip'
import { DashboardSection } from '@/components/cerveau/DashboardSection'
import { CaptureBar } from '@/components/cerveau/CaptureBar'
import { SearchBarDesktop, SearchButton, SearchOverlay } from '@/components/cerveau/SearchBar'
import { SearchResults } from '@/components/cerveau/SearchResults'
import { EntryDetailSheet } from '@/components/cerveau/EntryDetailSheet'
import { CategoryNav } from '@/components/cerveau/CategoryNav'
import { formatDateLongFR } from '@/lib/cerveau/formatDate'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import type { EntryType } from '@prisma/client'

function EmptyState() {
  return (
    <div className="px-4 mt-16 text-center">
      <p className="font-display text-3xl leading-tight" style={{ color: 'var(--text)', opacity: 0.3 }}>
        Tête vide.
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: 'var(--muted)' }}>
        Commence par capturer une pensée
      </p>
    </div>
  )
}

// ── Inner component (needs useSearchParams inside Suspense) ────────────────

function CerveauDashboardInner() {
  const searchParams   = useSearchParams()
  const activeCategory = (searchParams.get('cat') as EntryType | null) ?? 'ALL'

  const {
    entries,
    sections,
    urgentSection,
    todaySection,
    todoSection,
    reminderSection,
    notePinnedSection,
    noteSection,
    projectSection,
    discussionSection,
    listSection,
    isLoading,
    refetch,
  } = useDashboard(activeCategory === 'ALL' ? 'ALL' : activeCategory as EntryType)

  const { toast, showToast, dismiss } = useCerveauToast()
  const { query, setQuery, results, isSearching, clear } = useSearch(entries)
  const { data: session } = useSession()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<EntryWithRelations | null>(null)

  const firstName = session?.user?.name?.split(' ')[0] ?? ''
  const today     = formatDateLongFR()

  // Listen for search open from CerveauBottomNav
  useEffect(() => {
    function handleSearch() { setMobileSearchOpen(true) }
    window.addEventListener('cerveau:openSearch', handleSearch)
    return () => window.removeEventListener('cerveau:openSearch', handleSearch)
  }, [])

  return (
    <main className="min-h-screen pt-14 pb-16 md:pt-0" style={{ backgroundColor: 'var(--bg)' }}>

      <CerveauToast toast={toast} onDismiss={dismiss} />

      {/* ── Mobile search overlay ─────────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="md:hidden">
          <SearchOverlay query={query} onChange={setQuery} onClose={() => { setMobileSearchOpen(false); clear() }}>
            <SearchResults results={results} query={query} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
          </SearchOverlay>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-14 z-10 px-4 pt-5 pb-3 backdrop-blur-md md:top-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Title + date */}
          <div className="shrink-0">
            <h1 className="font-display text-3xl tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
              {firstName ? `Bonjour, ${firstName}` : 'Cerveau'}
            </h1>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {today}
            </p>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 items-center justify-center pt-1">
            <SearchBarDesktop query={query} onChange={setQuery} onClear={clear} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-1 shrink-0">
            <div className="md:hidden">
              <SearchButton onClick={() => setMobileSearchOpen(true)} active={mobileSearchOpen} />
            </div>
            <Link
              href="/cerveau/archive"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              title="Archive"
            >
              <Archive size={16} />
            </Link>
            <Link
              href="/cerveau/preferences"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              title="Préférences"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile CategoryNav (sticky below header) ─────────────────── */}
      <div className="md:hidden sticky top-36 z-10 backdrop-blur-md pb-1"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
      >
        <CategoryNav active={activeCategory === 'ALL' ? 'ALL' : activeCategory as EntryType} layout="horizontal" />
      </div>

      {/* ── Desktop search results ───────────────────────────────────── */}
      {isSearching && !isLoading && (
        <div className="hidden md:block px-4 mt-4">
          <SearchResults results={results} query={query} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
        </div>
      )}

      {/* ── Normal dashboard ─────────────────────────────────────────── */}
      {!isSearching && (
        <>
          {!isLoading && entries.length > 0 && (
            <div className="px-4 mt-4">
              <StatsStrip entries={entries} />
            </div>
          )}

          {!isLoading && entries.length === 0 && <EmptyState />}

          {/* Mobile layout */}
          <div className="md:hidden px-4 mt-6 space-y-8">
            {sections.map(section => (
              <DashboardSection
                key={section.id}
                section={section}
                refetch={refetch}
                showToast={showToast}
                onOpenDetail={setDetailEntry}
                showOverdueBars={section.isOverdue}
              />
            ))}
          </div>

          {/* Desktop Bento Grid */}
          <div className="hidden md:block px-8 mt-6">

            {/* EN RETARD — full width panel */}
            {urgentSection.entries.length > 0 && (
              <div
                className="rounded-3xl p-6 mb-6"
                style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--bg))' }}
              >
                <DashboardSection
                  section={urgentSection}
                  refetch={refetch}
                  showToast={showToast}
                  onOpenDetail={setDetailEntry}
                  showOverdueBars
                />
              </div>
            )}

            {/* Row 1: AUJOURD'HUI (col-4) + TODOS + RAPPELS (col-8) */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div
                className="col-span-4 rounded-3xl p-6"
                style={{ backgroundColor: 'var(--surface2)' }}
              >
                <DashboardSection section={todaySection} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                {todaySection.entries.length === 0 && (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    Rien pour aujourd&apos;hui
                  </p>
                )}
              </div>
              <div className="col-span-8 space-y-6">
                <DashboardSection section={todoSection}      refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                <DashboardSection section={reminderSection}  refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                <DashboardSection section={notePinnedSection} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
              </div>
            </div>

            {/* Row 2: PROJETS (col-5) + DISCUSSIONS + LISTES + NOTES (col-7) */}
            <div className="grid grid-cols-12 gap-6">
              <div
                className="col-span-5 rounded-3xl p-6"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <DashboardSection section={projectSection} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                {projectSection.entries.length === 0 && (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Aucun projet actif</p>
                )}
              </div>
              <div className="col-span-7 space-y-6">
                <DashboardSection section={discussionSection} refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                <DashboardSection section={listSection}       refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
                <DashboardSection section={noteSection}       refetch={refetch} showToast={showToast} onOpenDetail={setDetailEntry} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Capture bar ──────────────────────────────────────────────── */}
      <CaptureBar onEntryCreated={refetch} refetch={refetch} showToast={showToast} />

      {/* ── Entry detail sheet ───────────────────────────────────────── */}
      {detailEntry && (
        <EntryDetailSheet
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          refetch={refetch}
          showToast={showToast}
        />
      )}
    </main>
  )
}

// ── Public export wrapped in Suspense (required for useSearchParams) ────────

export function CerveauDashboard() {
  return (
    <Suspense>
      <CerveauDashboardInner />
    </Suspense>
  )
}
