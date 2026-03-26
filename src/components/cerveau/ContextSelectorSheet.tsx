'use client'

import { useState, useEffect } from 'react'
import { Inbox, FolderOpen, List } from 'lucide-react'
import type { EntryWithRelations, ApiResponse } from '@/lib/cerveau/types'

interface ContextSelectorSheetProps {
  isOpen:   boolean
  onClose:  () => void
  onSelect: (id: string | null, type: 'inbox' | 'project' | 'list', label: string) => void
}

export function ContextSelectorSheet({ isOpen, onClose, onSelect }: ContextSelectorSheetProps) {
  const [projects, setProjects] = useState<EntryWithRelations[]>([])
  const [lists,    setLists]    = useState<EntryWithRelations[]>([])

  useEffect(() => {
    if (!isOpen) return
    void Promise.all([
      fetch('/api/cerveau/entries?type=PROJECT').then(r => r.json()) as Promise<ApiResponse<EntryWithRelations[]>>,
      fetch('/api/cerveau/entries?type=LIST').then(r => r.json())    as Promise<ApiResponse<EntryWithRelations[]>>,
    ]).then(([projData, listData]) => {
      if (projData.success && projData.data) setProjects(projData.data)
      if (listData.success && listData.data) setLists(listData.data)
    })
  }, [isOpen])

  if (!isOpen) return null

  function pick(id: string | null, type: 'inbox' | 'project' | 'list', label: string) {
    onSelect(id, type, label)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg)', maxHeight: '70dvh' }}
      >
        {/* Handle */}
        <div className="shrink-0 pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        <p
          className="shrink-0 px-4 pb-3 font-headline text-base"
          style={{ color: 'var(--text)' }}
        >
          Ajouter dans…
        </p>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* Inbox */}
          <button
            type="button"
            onClick={() => pick(null, 'inbox', 'Boîte de réception')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
          >
            <Inbox size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-body text-sm" style={{ color: 'var(--text)' }}>
              Boîte de réception
            </span>
          </button>

          {/* Divider */}
          <div className="mx-4 my-1 border-t" style={{ borderColor: 'var(--border)' }} />

          {/* Projects */}
          {projects.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Projets
              </p>
              {projects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id, 'project', p.title)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <FolderOpen size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span className="font-body text-sm truncate" style={{ color: 'var(--text)' }}>{p.title}</span>
                  </span>
                  {p.children.length > 0 && (
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>
                      {p.children.length}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Divider */}
          {projects.length > 0 && lists.length > 0 && (
            <div className="mx-4 my-1 border-t" style={{ borderColor: 'var(--border)' }} />
          )}

          {/* Lists */}
          {lists.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Listes
              </p>
              {lists.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pick(l.id, 'list', l.title)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <List size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span className="font-body text-sm truncate" style={{ color: 'var(--text)' }}>{l.title}</span>
                  </span>
                  {l.listItems.length > 0 && (
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>
                      {l.listItems.length}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
