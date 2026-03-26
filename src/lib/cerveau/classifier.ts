import type { EntryType } from '@prisma/client'
import { normalize } from '@/lib/cerveau/normalize'

export type ClassifierResult = {
  type:         EntryType
  confidence:   number
  matchedRule:  number
  trigger?:     string
  // kept for backward-compat with CaptureSheet (reads detectedAssignee / detectedDate / detectedPriority)
  detectedShortcut?:  string
  detectedDate?:      string
  detectedPriority?:  'LOW' | 'MEDIUM' | 'HIGH'
  detectedAssignee?:  'ILAN' | 'CAMILLE'
}

type Rule = {
  id:         number
  type:       EntryType
  confidence: number
  triggers:   string[]
}

const RULES: Rule[] = [
  {
    id: 1, type: 'REMINDER', confidence: 0.95,
    triggers: ['rappelle', "n'oublie pas", 'pense a', 'ce soir',
               'demain matin', 'ce matin', 'cette nuit'],
  },
  {
    id: 2, type: 'LIST', confidence: 0.88,
    triggers: ['acheter', 'prendre', 'ramener', 'rapporter', 'courses'],
  },
  {
    id: 3, type: 'DISCUSSION', confidence: 0.82,
    triggers: ['parler de', 'discuter', 'aborder', 'te dire',
               'on doit voir', 'je voulais', 'faut qu on'],
  },
  {
    id: 4, type: 'EVENT', confidence: 0.80,
    triggers: ['rendez-vous', 'rdv', 'reservation', 'concert',
               'reunion', 'anniversaire', 'fete'],
  },
  {
    id: 5, type: 'TODO', confidence: 0.75,
    triggers: ['appeler', 'envoyer', 'payer', 'reparer', 'commander',
               'reserver', 'contacter', 'faire', 'finir', 'preparer',
               'verifier', 'ranger', 'nettoyer', 'installer'],
  },
  {
    id: 6, type: 'NOTE', confidence: 0.50,
    triggers: [],
  },
]

export function classifyInput(cleanText: string): ClassifierResult {
  const n = normalize(cleanText)

  for (const rule of RULES) {
    if (rule.triggers.length === 0) break
    for (const trigger of rule.triggers) {
      if (n.includes(trigger)) {
        return { type: rule.type, confidence: rule.confidence, matchedRule: rule.id, trigger }
      }
    }
  }

  return { type: 'NOTE', confidence: 0.50, matchedRule: 6 }
}
