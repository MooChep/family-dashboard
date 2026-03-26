'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Archive, Bell, Pin, MessageCircle, Bookmark, ShoppingCart, MoreHorizontal } from 'lucide-react'
import { EntryContextMenu } from '@/components/cerveau/EntryContextMenu'
import type { DashboardSectionData } from '@/lib/cerveau/hooks/useDashboard'
import { useEntryActions, type ToastFn } from '@/lib/cerveau/hooks/useEntryActions'
import type { EntryWithRelations } from '@/lib/cerveau/types'
import { SwipeableCard } from '@/components/cerveau/SwipeableCard'
import { SaveAsTemplateSheet } from '@/components/cerveau/SaveAsTemplateSheet'
import { TodoCard } from './cards/TodoCard'
import { ReminderCard } from './cards/ReminderCard'
import { NoteCard } from './cards/NoteCard'
import { ListCard } from './cards/ListCard'
import { ProjectCard } from './cards/ProjectCard'
import { DiscussionCard } from './cards/DiscussionCard'
import { EventCard } from './cards/EventCard'

// ── Action button ──────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{
        backgroundColor: 'var(--surface2)',
        color: danger ? 'var(--danger)' : 'var(--muted)',
      }}
    >
      <Icon size={13} strokeWidth={2} />
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}

// ── Swipe + inline actions per type ───────────────────────────────────────────

interface EntryCardProps {
  entry:          EntryWithRelations
  actions:        ReturnType<typeof useEntryActions>
  showToast:      ToastFn
  onOpenDetail:   (entry: EntryWithRelations) => void
}

function WrappedEntryCard({ entry, actions, showToast, onOpenDetail }: EntryCardProps) {
  const router = useRouter()
  const { markDone, archive, snooze1h, togglePin, markTalked } = actions
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const [contextMenuOpen,   setContextMenuOpen]   = useState(false)
  const [menuPosition,      setMenuPosition]      = useState({ x: 0, y: 0 })

  // Shared inline actions
  const archiveBtn = (
    <ActionBtn icon={Archive} label="Archiver" onClick={() => void archive(entry.id)} danger />
  )
  const templateBtn = (
    <ActionBtn icon={Bookmark} label="Template" onClick={() => setTemplateSheetOpen(true)} />
  )
  const moreBtn = (
    <>
      <button
        type="button"
        aria-label="Plus"
        title="Plus"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
        onClick={e => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          setMenuPosition({ x: rect.right, y: rect.bottom + 4 })
          setContextMenuOpen(v => !v)
        }}
      >
        <MoreHorizontal size={13} strokeWidth={2} />
        <span className="hidden md:inline">Plus</span>
      </button>
      {contextMenuOpen && (
        <EntryContextMenu
          entry={entry}
          position={menuPosition}
          onClose={() => setContextMenuOpen(false)}
          actions={{ snooze1h, togglePin }}
          showToast={showToast}
          onOpenDetail={onOpenDetail}
        />
      )}
    </>
  )

  const sheet = templateSheetOpen && (
    <SaveAsTemplateSheet
      entry={entry}
      onClose={() => setTemplateSheetOpen(false)}
      showToast={showToast}
    />
  )

  switch (entry.type) {
    case 'TODO':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            onSwipeRight={() => void markDone(entry.id)}
            leftLabel="Archiver"
            rightLabel="Terminé"
            leftColor="bg-red-600"
            rightColor="bg-green-500"
          >
            <TodoCard
              entry={entry}
              onOpenDetail={onOpenDetail}
              actions={<>
                <ActionBtn icon={Check} label="Terminé" onClick={() => void markDone(entry.id)} />
                {archiveBtn}
                {templateBtn}
                {moreBtn}
              </>}
            />
          </SwipeableCard>
        </>
      )

    case 'REMINDER':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            onSwipeRight={() => void snooze1h(entry.id)}
            leftLabel="Archiver"
            rightLabel="Snooze 1h"
            leftColor="bg-red-600"
            rightColor="bg-orange-500"
          >
            <ReminderCard
              entry={entry}
              onOpenDetail={onOpenDetail}
              actions={<>
                <ActionBtn icon={Bell} label="Snooze 1h" onClick={() => void snooze1h(entry.id)} />
                {archiveBtn}
                {templateBtn}
                {moreBtn}
              </>}
            />
          </SwipeableCard>
        </>
      )

    case 'DISCUSSION':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            onSwipeRight={() => void markTalked(entry.id)}
            leftLabel="Archiver"
            rightLabel="On en a parlé"
            leftColor="bg-red-600"
            rightColor="bg-pink-500"
          >
            <DiscussionCard
              entry={entry}
              onOpenDetail={onOpenDetail}
              actions={<>
                <ActionBtn icon={MessageCircle} label="On en a parlé" onClick={() => void markTalked(entry.id)} />
                {archiveBtn}
                {templateBtn}
                {moreBtn}
              </>}
            />
          </SwipeableCard>
        </>
      )

    case 'NOTE':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            onSwipeRight={() => void togglePin(entry.id, !entry.pinned)}
            leftLabel="Archiver"
            rightLabel={entry.pinned ? 'Désépingler' : 'Épingler'}
            leftColor="bg-red-600"
            rightColor="bg-gray-500"
          >
            <NoteCard
              entry={entry}
              onOpenDetail={onOpenDetail}
              actions={<>
                <ActionBtn
                  icon={Pin}
                  label={entry.pinned ? 'Désépingler' : 'Épingler'}
                  onClick={() => void togglePin(entry.id, !entry.pinned)}
                />
                {archiveBtn}
                {templateBtn}
                {moreBtn}
              </>}
            />
          </SwipeableCard>
        </>
      )

    case 'LIST': {
      const shopBtn = (
        <Link
          href={`/cerveau/lists/${entry.id}/detail`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
          title="Détail"
          onClick={e => e.stopPropagation()}
        >
          <ShoppingCart size={13} strokeWidth={2} />
          <span className="hidden md:inline">Détail</span>
        </Link>
      )
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            onSwipeRight={() => router.push(`/cerveau/lists/${entry.id}/detail`)}
            leftLabel="Archiver"
            rightLabel="Détail"
            leftColor="bg-red-600"
            rightColor="bg-[var(--accent)]"
          >
            <ListCard entry={entry} onOpenDetail={onOpenDetail} actions={<>{shopBtn}{archiveBtn}{templateBtn}{moreBtn}</>} />
          </SwipeableCard>
        </>
      )
    }

    case 'PROJECT':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            leftLabel="Archiver"
            leftColor="bg-red-600"
          >
            <ProjectCard entry={entry} onOpenDetail={onOpenDetail} actions={<>{archiveBtn}{templateBtn}{moreBtn}</>} />
          </SwipeableCard>
        </>
      )

    case 'EVENT':
      return (
        <>
          {sheet}
          <SwipeableCard
            onSwipeLeft={() => void archive(entry.id)}
            leftLabel="Archiver"
            leftColor="bg-red-600"
          >
            <EventCard entry={entry} onOpenDetail={onOpenDetail} actions={<>{archiveBtn}{templateBtn}{moreBtn}</>} />
          </SwipeableCard>
        </>
      )
  }
}

// ── Section component ──────────────────────────────────────────────────────────

interface DashboardSectionProps {
  section:          DashboardSectionData
  refetch:          () => void
  showToast:        ToastFn
  onOpenDetail?:    (entry: EntryWithRelations) => void
  showOverdueBars?: boolean
}

export function DashboardSection({ section, refetch, showToast, onOpenDetail, showOverdueBars }: DashboardSectionProps) {
  const actions = useEntryActions(refetch, showToast)
  const openDetail = onOpenDetail ?? (() => {})

  if (section.entries.length === 0) return null

  return (
    <div
      className={section.isOverdue ? 'rounded-xl p-3' : undefined}
      style={section.isOverdue
        ? { backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--bg))' }
        : undefined
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <h2
          className="font-headline text-sm uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          {section.label}
        </h2>
        <span
          className="font-mono text-xs rounded-full px-2 py-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {section.entries.length}
        </span>
      </div>
      <div className="space-y-3">
        {section.entries.map(entry => (
          showOverdueBars ? (
            <div key={entry.id} className="flex gap-3 items-stretch">
              <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--danger)' }} />
              <div className="flex-1">
                <WrappedEntryCard entry={entry} actions={actions} showToast={showToast} onOpenDetail={openDetail} />
              </div>
            </div>
          ) : (
            <WrappedEntryCard key={entry.id} entry={entry} actions={actions} showToast={showToast} onOpenDetail={openDetail} />
          )
        ))}
      </div>
    </div>
  )
}
