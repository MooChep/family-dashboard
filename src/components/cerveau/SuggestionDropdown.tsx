'use client'

import { useEffect, useRef } from 'react'
import type { ListSuggestion } from '@/app/api/cerveau/suggestions/lists/route'
import type { ProjectSuggestion } from '@/app/api/cerveau/suggestions/projects/route'

interface SuggestionDropdownProps {
  listSuggestions:      ListSuggestion[]
  projectSuggestions:   ProjectSuggestion[]
  onSelectList:         (s: ListSuggestion) => void
  onSelectProject:      (s: ProjectSuggestion) => void
  onClose:              () => void
  // When a .project shortcut is typed and existing projects match,
  // show a "Créer X" option so the user can explicitly create a new project.
  newProjectTitle?:     string
  onCreateProject?:     () => void
}

export function SuggestionDropdown({
  listSuggestions,
  projectSuggestions,
  onSelectList,
  onSelectProject,
  onClose,
  newProjectTitle,
  onCreateProject,
}: SuggestionDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  const hasLists    = listSuggestions.length > 0
  const hasProjects = projectSuggestions.length > 0

  if (!hasLists && !hasProjects) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-float z-50"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {hasLists && listSuggestions.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelectList(s)}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80 active:opacity-60"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            <span>📋</span>
            {s.title}
          </span>
          <span className="text-xs" style={{ color: 'var(--text2)' }}>
            {s.itemCount} article{s.itemCount !== 1 ? 's' : ''}
          </span>
        </button>
      ))}

      {hasProjects && projectSuggestions.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelectProject(s)}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80 active:opacity-60"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            <span>📁</span>
            {s.title}
          </span>
          <span className="text-xs" style={{ color: 'var(--text2)' }}>
            {s.childrenCount} tâche{s.childrenCount !== 1 ? 's' : ''}
          </span>
        </button>
      ))}

      {hasProjects && onCreateProject && newProjectTitle && (
        <button
          type="button"
          onClick={onCreateProject}
          className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:opacity-80 active:opacity-60"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>+</span>
          <span className="text-sm" style={{ color: 'var(--text2)' }}>
            Créer &ldquo;{newProjectTitle.replace(/-/g, ' ')}&rdquo;
          </span>
        </button>
      )}
    </div>
  )
}
