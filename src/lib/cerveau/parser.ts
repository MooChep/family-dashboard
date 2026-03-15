import * as chrono from 'chrono-node'
import { type EntryType, type EntryAssignee } from '@prisma/client'

// EntryPriority n'est pas encore utilisé dans un modèle Prisma → défini localement
type EntryPriority = 'LOW' | 'MEDIUM' | 'HIGH'

// ── Recurrence mapping ──

const RECURRENCE_MAP: Record<string, string> = {
  quotidien:    'RRULE:FREQ=DAILY',
  quotidienne:  'RRULE:FREQ=DAILY',
  'chaque jour': 'RRULE:FREQ=DAILY',
  hebdo:        'RRULE:FREQ=WEEKLY',
  hebdomadaire: 'RRULE:FREQ=WEEKLY',
  mensuel:      'RRULE:FREQ=MONTHLY',
  mensuelle:    'RRULE:FREQ=MONTHLY',
  annuel:       'RRULE:FREQ=YEARLY',
  annuelle:     'RRULE:FREQ=YEARLY',
}

// ── Types ──

export interface ParsedCapture {
  /** Texte brut sans raccourcis */
  rawText:       string
  /** Type forcé par raccourci si présent */
  detectedType?: EntryType
  /** Tags extraits (#tag) */
  tags:          string[]
  /** Assignation extraite (@Ilan | @Camille → ILAN | CAMILLE) */
  assignedTo?:   EntryAssignee
  /** Priorité extraite (! → LOW, !! → MEDIUM, !!! → HIGH) */
  priority?:     EntryPriority
  /** Date forcée par raccourci /... parsée par chrono */
  forcedDate?:   Date
  /** Récurrence (~quotidien → RRULE string) */
  recurrence?:   string
  /** Lieu associé (^maison → slug) */
  placeSlug?:    string
  /** Référence projet (.Voyage → nom) */
  projectRef?:   string
  /** Référence liste (+liste:courses → nom) */
  listRef?:      string
  /** Nom de template (*arrosage → phase 2) */
  templateName?: string
}

// ── Helpers ──

/** Convertit un nom d'assigné en enum EntryAssignee. */
function parseAssignee(name: string): EntryAssignee | undefined {
  const normalized = name.toLowerCase()
  if (normalized === 'ilan')    return 'ILAN'
  if (normalized === 'camille') return 'CAMILLE'
  return undefined
}

/** Transforme un slug de récurrence en RRULE string. */
function parseRecurrence(value: string): string | undefined {
  const lower = value.toLowerCase()
  if (RECURRENCE_MAP[lower]) return RECURRENCE_MAP[lower]

  // ~lundi → RRULE:FREQ=WEEKLY;BYDAY=MO
  const dayMap: Record<string, string> = {
    lundi: 'MO', mardi: 'TU', mercredi: 'WE', jeudi: 'TH',
    vendredi: 'FR', samedi: 'SA', dimanche: 'SU',
  }
  if (dayMap[lower]) return `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[lower]}`

  // ~Nj / ~Ns / ~Nm → toutes les N jours/semaines/mois
  const match = /^(\d+)(j|s|m)$/.exec(lower)
  if (match) {
    const n = match[1]
    const freq = match[2] === 'j' ? 'DAILY' : match[2] === 's' ? 'WEEKLY' : 'MONTHLY'
    return `RRULE:FREQ=${freq};INTERVAL=${n}`
  }

  return undefined
}

// ── Parser principal ──

/**
 * Parse les raccourcis inline d'une saisie de capture.
 * Ordre de traitement : *, ., +, @, #, !, /, ~, ^
 * Retourne le texte résiduel (rawText) et les métadonnées extraites.
 */
export function parseInlineShortcuts(input: string): ParsedCapture {
  let text = input
  const result: ParsedCapture = { rawText: '', tags: [] }

  // ── * template (*arrosage) ──
  text = text.replace(/\*(\S+)/g, (_, name: string) => {
    result.templateName = name
    return ''
  })

  // ── . projet (.Voyage mai → "Voyage mai") ──
  text = text.replace(/\.([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][^\s!#@~/^.+*]*(?:\s+[^\s!#@~/^.+*]+)*)/g, (_, name: string) => {
    result.projectRef = name.trim()
    result.detectedType = 'PROJECT'
    return ''
  })

  // ── + liste (+liste:courses) ──
  text = text.replace(/\+liste:(\S+)/gi, (_, name: string) => {
    result.listRef = name
    result.detectedType = 'LIST'
    return ''
  })

  // ── @ assignation (@Ilan | @Camille) ──
  text = text.replace(/@(\w+)/g, (_, name: string) => {
    const assignee = parseAssignee(name)
    if (assignee) result.assignedTo = assignee
    return ''
  })

  // ── # tags (#courses #santé) ──
  text = text.replace(/#([\wÀ-ÿ]+)/g, (_, tag: string) => {
    result.tags.push(tag.toLowerCase())
    return ''
  })

  // ── ! priorité (!!! > !! > !) ──
  text = text.replace(/(!{1,3})(?!\w)/g, (_, bangs: string) => {
    if (bangs.length >= 3)     result.priority = 'HIGH'
    else if (bangs.length === 2) result.priority = 'MEDIUM'
    else                         result.priority = 'LOW'
    return ''
  })

  // ── / date forcée (/lundi /14h /demain) ──
  text = text.replace(/\/([^\s/][^\s]*)/g, (_, expr: string) => {
    // Utilise chrono en français pour parser l'expression
    const parsed = chrono.fr.parse(expr)
    if (parsed.length) {
      result.forcedDate = parsed[0].date()
      // Oriente vers REMINDER si pas de type forcé encore
      if (!result.detectedType) result.detectedType = 'REMINDER'
    }
    return ''
  })

  // ── ~ récurrence (~quotidien ~hebdo ~lundi) ──
  text = text.replace(/~(\S+)/g, (_, value: string) => {
    const rrule = parseRecurrence(value)
    if (rrule) result.recurrence = rrule
    return ''
  })

  // ── ^ lieu (^maison) ──
  text = text.replace(/\^(\S+)/g, (_, slug: string) => {
    result.placeSlug = slug
    return ''
  })

  // ── Nettoyage du texte résiduel ──
  result.rawText = text.replace(/\s+/g, ' ').trim()

  return result
}

// ── Couche 1 : parsing temporel ──

/**
 * Extrait la première expression temporelle en français via chrono-node.
 * Retourne la date détectée et le texte sans l'expression.
 */
export function parseDateTime(input: string): { date: Date | null; text: string } {
  const results = chrono.fr.parse(input)
  if (!results.length) return { date: null, text: input }

  const result = results[0]
  return {
    date: result.date(),
    text: input.slice(0, result.index) + input.slice(result.index + result.text.length),
  }
}
