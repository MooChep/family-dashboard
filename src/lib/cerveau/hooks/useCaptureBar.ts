'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { EntryType } from '@prisma/client'
import { parseInput, type ParsedInput } from '@/lib/cerveau/parser'
import { classifyInput, type ClassifierResult } from '@/lib/cerveau/classifier'
import { TYPE_CONFIG } from '@/lib/cerveau/typeConfig'
import type { CreateEntryPayload, ApiResponse, EntryWithRelations } from '@/lib/cerveau/types'
import type { ListSuggestion } from '@/app/api/cerveau/suggestions/lists/route'
import type { ProjectSuggestion } from '@/app/api/cerveau/suggestions/projects/route'
import type { TemplateSuggestion } from '@/app/api/cerveau/templates/suggestions/route'

const EMPTY_PARSED: ParsedInput = {
  cleanText: '', tags: [], forcedConfidence: 0, detectedShortcuts: [],
}
const DEFAULT_CLASSIFIED: ClassifierResult = { type: 'NOTE', confidence: 0.5, matchedRule: 6 }

export type CaptureState = {
  text:                string
  parsed:              ParsedInput
  classified:          ClassifierResult
  effectiveType:       EntryType
  overriddenType:      EntryType | null
  listSuggestions:     ListSuggestion[]
  projectSuggestions:  ProjectSuggestion[]
  templateSuggestions: TemplateSuggestion[]
  isSheetOpen:         boolean
  isSubmitting:        boolean
}

export function useCaptureBar(parentId?: string) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedInput>(EMPTY_PARSED)
  const [classified, setClassified] = useState<ClassifierResult>(DEFAULT_CLASSIFIED)
  const [overriddenType, setOverriddenType] = useState<EntryType | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [listSuggestions, setListSuggestions] = useState<ListSuggestion[]>([])
  const [projectSuggestions, setProjectSuggestions] = useState<ProjectSuggestion[]>([])
  const [templateSuggestions, setTemplateSuggestions] = useState<TemplateSuggestion[]>([])

  // Project shortcut resolution state
  // null  = unset (auto-resolve on submit if targetProject is present)
  // string = user explicitly selected this project id from dropdown
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(null)
  // true  = user clicked "Créer nouveau" → skip resolution
  const [forceNewProject, setForceNewProject] = useState(false)

  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for stable onSubmit closure (avoid re-creating on every keystroke)
  const parsedRef          = useRef(parsed)
  const overriddenTypeRef  = useRef(overriddenType)
  const classifiedRef      = useRef(classified)
  const resolvedIdRef      = useRef(resolvedProjectId)
  const forceNewRef        = useRef(forceNewProject)

  parsedRef.current         = parsed
  overriddenTypeRef.current = overriddenType
  classifiedRef.current     = classified
  resolvedIdRef.current     = resolvedProjectId
  forceNewRef.current       = forceNewProject

  const rawType: EntryType = overriddenType ?? (parsed.forcedType ?? classified.type)

  // When a project is resolved (existing project selected) and the raw type is PROJECT,
  // downgrade to TODO so CaptureSheet opens with the right type.
  const effectiveType: EntryType = (() => {
    const raw = overriddenType ?? (parsed.forcedType ?? classified.type)
    if (raw !== 'PROJECT') return raw
    if (parentId) return 'TODO'
    if (resolvedProjectId !== null) return 'TODO'
    return raw
  })()

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback((p: ParsedInput) => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    suggestDebounceRef.current = setTimeout(async () => {
      // Template suggestions — when * shortcut is typed
      if (p.templateShortcut !== undefined) {
        try {
          const res = await fetch(`/api/cerveau/templates/suggestions?q=${encodeURIComponent(p.templateShortcut)}`)
          const data = await res.json() as ApiResponse<TemplateSuggestion[]>
          setTemplateSuggestions(data.success && data.data ? data.data : [])
        } catch { setTemplateSuggestions([]) }
        setListSuggestions([])
        setProjectSuggestions([])
        return
      }
      setTemplateSuggestions([])

      if (p.targetList) {
        try {
          const res = await fetch(`/api/cerveau/suggestions/lists?q=${encodeURIComponent(p.targetList)}`)
          const data = await res.json() as ApiResponse<ListSuggestion[]>
          setListSuggestions(data.success && data.data ? data.data : [])
        } catch { setListSuggestions([]) }
      } else {
        setListSuggestions([])
      }

      if (p.targetProject) {
        try {
          const res = await fetch(`/api/cerveau/suggestions/projects?q=${encodeURIComponent(p.targetProject)}`)
          const data = await res.json() as ApiResponse<ProjectSuggestion[]>
          setProjectSuggestions(data.success && data.data ? data.data : [])
        } catch { setProjectSuggestions([]) }
      } else {
        setProjectSuggestions([])
      }
    }, 200)
  }, [])

  const onChange = useCallback((value: string) => {
    setText(value)
    // Reset project resolution when user modifies the text
    setResolvedProjectId(null)
    setForceNewProject(false)
    if (!value.trim()) {
      setParsed(EMPTY_PARSED)
      setClassified(DEFAULT_CLASSIFIED)
      setOverriddenType(null)
      setListSuggestions([])
      setProjectSuggestions([])
      setTemplateSuggestions([])
      return
    }
    const p = parseInput(value)
    const c = classifyInput(p.cleanText)
    setParsed(p)
    setClassified(c)
    fetchSuggestions(p)
  }, [fetchSuggestions])

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
  }, [])

  const onTypeOverride = useCallback((type: EntryType | null) => {
    setOverriddenType(type)
  }, [])

  const onOpenSheet = useCallback(() => {
    if (text.trim()) setIsSheetOpen(true)
  }, [text])

  const onCloseSheet = useCallback(() => {
    setIsSheetOpen(false)
  }, [])

  const onSelectListSuggestion = useCallback((s: ListSuggestion) => {
    const newText = `+${s.title} ${parsed.cleanText}`.trim()
    setText(newText)
    setListSuggestions([])
    const p = parseInput(newText)
    const c = classifyInput(p.cleanText)
    setParsed(p)
    setClassified(c)
  }, [parsed.cleanText])

  // Select an existing project from the dropdown → fill text + store its id
  const onSelectProjectSuggestion = useCallback((s: ProjectSuggestion) => {
    const newText = `.${s.title} ${parsed.cleanText}`.trim()
    setText(newText)
    setResolvedProjectId(s.id)
    setForceNewProject(false)
    setProjectSuggestions([])
    const p = parseInput(newText)
    const c = classifyInput(p.cleanText)
    setParsed(p)
    setClassified(c)
  }, [parsed.cleanText])

  // User explicitly wants to create a new project (clicked "Créer" in dropdown)
  const onCreateNewProject = useCallback(() => {
    setForceNewProject(true)
    setResolvedProjectId(null)
    setProjectSuggestions([])
  }, [])

  const onSubmit = useCallback(async (
    payload: CreateEntryPayload,
  ): Promise<{ success: boolean; message: string }> => {
    setIsSubmitting(true)

    // Determine final payload
    let finalPayload: CreateEntryPayload = parentId ? { ...payload, parentId } : payload

    // .project shortcut resolution (only outside of a nested project context)
    const currentParsed = parsedRef.current
    const resolvedId    = resolvedIdRef.current
    const forceNew      = forceNewRef.current
    const currentRawType = overriddenTypeRef.current ?? (currentParsed.forcedType ?? classifiedRef.current.type)

    if (currentParsed.targetProject && !parentId && !forceNew) {
      let projectId: string | null = resolvedId

      if (!projectId) {
        // Auto-resolve: take first matching project
        try {
          const res = await fetch(
            `/api/cerveau/suggestions/projects?q=${encodeURIComponent(currentParsed.targetProject)}`,
            { credentials: 'include' },
          )
          if (res.ok) {
            const data = await res.json() as ApiResponse<ProjectSuggestion[]>
            if (data.success && data.data && data.data.length > 0) {
              projectId = data.data[0].id
            }
          }
        } catch { /* fall through → create new project */ }
      }

      if (projectId) {
        const childType: EntryType = currentRawType === 'PROJECT' ? 'TODO' : currentRawType
        finalPayload = {
          type:      childType,
          title:     currentParsed.cleanText || 'Sans titre',
          parentId:  projectId,
          assignedTo: currentParsed.assignedTo ?? 'BOTH',
          ...(currentParsed.priority   && { priority: currentParsed.priority }),
          ...(currentParsed.dueDate    && { dueDate: currentParsed.dueDate.toISOString() }),
          ...(currentParsed.tags?.length && { tags: currentParsed.tags }),
        }
      }
      // if projectId is null → no match found → use payload from CaptureSheet (creates new PROJECT)
    }

    try {
      const res = await fetch('/api/cerveau/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      })
      const data = await res.json() as ApiResponse<EntryWithRelations>
      if (data.success) {
        setText('')
        setParsed(EMPTY_PARSED)
        setClassified(DEFAULT_CLASSIFIED)
        setOverriddenType(null)
        setIsSheetOpen(false)
        setListSuggestions([])
        setProjectSuggestions([])
        setTemplateSuggestions([])
        setResolvedProjectId(null)
        setForceNewProject(false)
        const meta = TYPE_CONFIG[finalPayload.type]
        return {
          success: true,
          message: `${meta.label} ajouté${meta.feminine ? 'e' : ''} ✓`,
        }
      }
      return { success: false, message: 'Erreur lors de la sauvegarde — réessaie' }
    } catch {
      return { success: false, message: 'Erreur lors de la sauvegarde — réessaie' }
    } finally {
      setIsSubmitting(false)
    }
  }, [parentId])

  const onReset = useCallback(() => {
    setText('')
    setParsed(EMPTY_PARSED)
    setClassified(DEFAULT_CLASSIFIED)
    setOverriddenType(null)
    setIsSheetOpen(false)
    setListSuggestions([])
    setProjectSuggestions([])
    setTemplateSuggestions([])
    setResolvedProjectId(null)
    setForceNewProject(false)
  }, [])

  return {
    text,
    parsed,
    classified,
    // backward-compat aliases used by CaptureBar / CaptureSheet
    classifierResult: classified,
    detectedType: classified.type,
    confidence: classified.confidence,
    overriddenType,
    effectiveType,
    rawType,
    listSuggestions,
    projectSuggestions,
    templateSuggestions,
    resolvedProjectId,
    isSheetOpen,
    isSubmitting,
    onChange,
    onTypeOverride,
    onOpenSheet,
    onCloseSheet,
    onSelectListSuggestion,
    onSelectProjectSuggestion,
    onCreateNewProject,
    onSubmit,
    onReset,
  }
}
