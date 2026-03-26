import type { AssignedTo, EntryType, Priority } from '@prisma/client'
import { normalize } from '@/lib/cerveau/normalize'

export type ParsedInput = {
  cleanText:          string
  targetList?:        string
  targetProject?:     string
  assignedTo?:        AssignedTo
  priority?:          Priority
  dueDate?:           Date
  recurrence?:        string
  tags:               string[]
  forcedType?:        EntryType
  forcedConfidence:   number
  detectedShortcuts:  string[]
  templateShortcut?:  string   // defined when input starts with *
  isListShortcut?:    boolean  // true when +listname was used
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const MONTH_ABBRS = ['jan','fev','mar','avr','mai','juin','juil','aout','sep','oct','nov','dec']

function parseDate(token: string): Date | undefined {
  const now = new Date()
  const t = normalize(token)

  if (t === 'demain')                        return addDays(now, 1)
  if (t === 'apres-demain' || t === 'apres demain') return addDays(now, 2)
  if (t === 'semaine')                       return addDays(now, 7)
  if (t === 'mois')                          return addDays(now, 30)

  // Jours de la semaine → prochaine occurrence
  const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
  const jourIdx = jours.indexOf(t)
  if (jourIdx !== -1) {
    const diff = (jourIdx - now.getDay() + 7) % 7 || 7
    return addDays(now, diff)
  }

  // "15" / "15jan" / "15mar" / "15mars" / "15juin" / "15juil" / "15juillet"
  // Explicit alternation + prefix fallback to handle abbreviated and full month names
  const matchNamed = t.match(/^(\d{1,2})([a-z]*)$/)
  if (matchNamed) {
    const day      = parseInt(matchNamed[1], 10)
    const raw      = matchNamed[2]  // "" | "mar" | "mars" | "juin" | "juillet" …
    let   month: number

    if (!raw) {
      month = now.getMonth()
    } else {
      // "mars".startsWith("mar") → 2; "juin".startsWith("juin") → 5; "juillet".startsWith("juil") → 6
      month = MONTH_ABBRS.findIndex(m => raw.startsWith(m) || m.startsWith(raw))
      if (month === -1) return undefined
    }

    const candidate = new Date(now.getFullYear(), month, day)
    if (candidate < now) candidate.setFullYear(now.getFullYear() + 1)
    return candidate
  }

  // "15/03"
  const matchSlash = t.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (matchSlash) {
    const day       = parseInt(matchSlash[1], 10)
    const month     = parseInt(matchSlash[2], 10) - 1
    const candidate = new Date(now.getFullYear(), month, day)
    if (candidate < now) candidate.setFullYear(now.getFullYear() + 1)
    return candidate
  }

  return undefined
}

// ─── Parser ─────────────────────────────────────────────────────────────────

export function parseInput(raw: string): ParsedInput {
  let text = raw
  const shortcuts: string[] = []

  let targetList:       string | undefined
  let targetProject:    string | undefined
  let assignedTo:       AssignedTo | undefined
  let priority:         Priority | undefined
  let dueDate:          Date | undefined
  let recurrence:       string | undefined
  const tags:           string[] = []
  let forcedType:       EntryType | undefined
  let forcedConfidence  = 0
  let templateShortcut: string | undefined
  let isListShortcut    = false

  // *shortcut — must be at start; * alone = open library
  const templateMatch = text.match(/^\*(\S*)/)
  if (templateMatch) {
    templateShortcut = templateMatch[1]
    shortcuts.push(`*${templateShortcut}`)
    text = text.slice(templateMatch[0].length).trim()
    return {
      cleanText: text.replace(/\s+/g, ' ').trim(),
      tags,
      forcedConfidence: 1.0,
      detectedShortcuts: shortcuts,
      templateShortcut,
    }
  }

  // +listname — must be at start
  const listMatch = text.match(/^\+(\S+)/)
  if (listMatch) {
    targetList       = listMatch[1]
    forcedType       = 'LIST'
    forcedConfidence = 1.0
    isListShortcut   = true
    shortcuts.push(`+${targetList}`)
    text = text.slice(listMatch[0].length).trim()
  }

  // .projectname — must be at start (only if no list match)
  if (!forcedType) {
    const projMatch = text.match(/^\.(\S+)/)
    if (projMatch) {
      targetProject    = projMatch[1]
      forcedType       = 'PROJECT'
      forcedConfidence = 1.0
      shortcuts.push(`.${targetProject}`)
      text = text.slice(projMatch[0].length).trim()
    }
  }

  // @ilan / @camille
  text = text.replace(/@(ilan|camille)/gi, (match, name: string) => {
    assignedTo = name.toLowerCase() === 'ilan' ? 'ILAN' : 'CAMILLE'
    shortcuts.push(match)
    return ''
  })

  // !/!!/!!! — priority (! = LOW, !! = MEDIUM, !!! = HIGH)
  // (?=\s|$) prevents matching ! inside words like "!important"
  text = text.replace(/(!{1,3})(?=\s|$)\s*/g, (match) => {
    const bangs = match.trim().length
    priority = bangs === 1 ? 'LOW' : bangs === 2 ? 'MEDIUM' : 'HIGH'
    shortcuts.push(match.trim())
    return ''
  })

  // /date
  text = text.replace(/\/(\S+)/g, (match, token: string) => {
    const resolved = parseDate(token)
    if (resolved) {
      dueDate = resolved
      shortcuts.push(match)
      return ''
    }
    return match
  })

  // ~recurrence
  text = text.replace(/~(\S+)/g, (match, rec: string) => {
    recurrence = rec
    shortcuts.push(match)
    return ''
  })

  // #tag
  text = text.replace(/#(\S+)/g, (match, tag: string) => {
    tags.push(tag)
    shortcuts.push(match)
    return ''
  })

  const cleanText = text.replace(/\s+/g, ' ').trim()

  return {
    cleanText,
    targetList,
    targetProject,
    assignedTo,
    priority,
    dueDate,
    recurrence,
    tags,
    forcedType,
    forcedConfidence,
    detectedShortcuts: shortcuts,
    templateShortcut,
    isListShortcut,
  }
}
