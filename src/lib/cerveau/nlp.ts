import { type EntryType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ── Types ──

export interface TypeScores {
  NOTE:       number
  TODO:       number
  REMINDER:   number
  LIST:       number
  PROJECT:    number
  DISCUSSION: number
  EVENT:      number
}

/**
 * Matrice de correction apprise depuis NlpFeedback.
 * Pour chaque type prédit, un delta à appliquer sur les scores si ce type ressort fort.
 */
type UserWeights = Partial<Record<EntryType, Partial<Record<EntryType, number>>>>

// ── Dictionnaire de features ──

/**
 * Table de mots-clés pondérés par type.
 * Chaque entrée : [pattern (regex), poids (0-1)]
 * Inspiré d'un bag-of-words linéaire — remplacera un vrai modèle TF.js plus tard.
 */
const KEYWORD_WEIGHTS: Record<EntryType, Array<[RegExp, number]>> = {
  NOTE: [
    [/\b(note|idée|info|mémo|retenir|important|rappelle-toi|remember)\b/i, 0.7],
    [/\b(code|mot de passe|adresse|numéro|pin|login|identifiant)\b/i, 0.8],
    [/\b(réflexion|pensée|observation|constat|remarque)\b/i, 0.6],
    [/\b(cf\.|voir aussi|source|lien|url|https?:\/\/)\b/i, 0.5],
  ],
  TODO: [
    [/\b(faire|acheter|appeler|envoyer|préparer|commander|réserver)\b/i, 0.8],
    [/\b(nettoyer|payer|vérifier|finir|terminer|compléter|corriger|rédiger)\b/i, 0.7],
    [/\b(penser à|ne pas oublier|ne pas oublie)\b/i, 0.6],
    // "acheter" exclu ici pour laisser le signal LIST prendre le dessus sur "acheter X et Y"
    [/^(faire|appeler|envoyer|préparer|commander|réserver|payer)/i, 0.9],
    [/\b(doit|dois|faut|il faut|faudra|devra|devrait)\b/i, 0.5],
  ],
  REMINDER: [
    [/\b(rappel|rappelle|rappeler|n'oublie pas|n'oublions pas)\b/i, 0.9],
    [/\b(vitamines?|médicaments?|pilules?|comprimés?)\b/i, 0.7],
    [/\b(rdv|rendez-vous|consultation|dentiste|médecin|docteur)\b/i, 0.6],
    [/\b(demain|ce soir|ce matin|dans \d+|à \d+h|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i, 0.4],
  ],
  LIST: [
    [/\b(liste|courses|ingrédients?|fournitures?|produits?)\b/i, 0.9],
    [/\b(acheter|ramener|prendre)(\s+\w+,)+/i, 0.8],
    // acheter X et Y → liste implicite de 2 items (signal fort)
    [/\b(acheter|ramener|prendre)\s+\w[\wÀ-ÿ-]*\s+et\s+\w/i, 0.9],
    [/(\w+,\s*){2,}/i, 0.6],
    [/\b(et\b.*\bet\b|,.*,)/i, 0.5],
    [/\b(épicerie|supermarché|marché|drive)\b/i, 0.7],
  ],
  PROJECT: [
    [/\b(projet|mise en place|refonte|refaire|aménager|organiser|planifier)\b/i, 0.8],
    [/\b(développement|création|conception|réalisation|déploiement)\b/i, 0.7],
    [/\b(gérer|piloter|coordonner|superviser|suivre)\b/i, 0.6],
    [/\b(phase|étape|milestone|livrable|sprint)\b/i, 0.8],
    [/\b(budget|délai|planning|rétro|rétroplanning)\b/i, 0.7],
  ],
  DISCUSSION: [
    [/\b(parler|discuter|dire|aborder|mentionner|évoquer|soulever)\b/i, 0.8],
    [/\b(voir avec|demander à|en parler|à discuter|sujet à aborder)\b/i, 0.9],
    [/\b(dire à (ilan|camille)|parler (à|avec) (ilan|camille))\b/i, 0.9],
    [/\b(décision|question|accord|avis|opinion|point de vue)\b/i, 0.5],
    [/^(parler|discuter|dire|demander)/i, 0.8],
  ],
  EVENT: [
    [/\b(anniversaire|fête|célébration|cérémonie)\b/i, 0.9],
    [/\b(réunion|meeting|conférence|séminaire|formation)\b/i, 0.8],
    [/\b(concert|spectacle|théâtre|cinéma|expo|exposition)\b/i, 0.8],
    [/\b(dîner|déjeuner|brunch|apéro|soirée|repas)\b/i, 0.6],
    [/\b(sortie|voyage|week-end|vacances|escapade)\b/i, 0.6],
    [/\b(le \d{1,2}|du \d{1,2}|au \d{1,2}|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i, 0.4],
  ],
}

// ── Scoring de base ──

/**
 * Calcule un score brut pour chaque type à partir des mots-clés.
 * Chaque pattern matché contribue son poids, les contributions sont sommées puis plafonnées à 1.
 */
function computeBaseScores(input: string): TypeScores {
  const lower = input.toLowerCase()
  const scores: TypeScores = {
    NOTE: 0.1, TODO: 0.1, REMINDER: 0.1,
    LIST: 0.1, PROJECT: 0.1, DISCUSSION: 0.1, EVENT: 0.1,
  }

  for (const [type, patterns] of Object.entries(KEYWORD_WEIGHTS) as Array<[EntryType, Array<[RegExp, number]>]>) {
    let score = scores[type]
    for (const [pattern, weight] of patterns) {
      if (pattern.test(lower)) score += weight
    }
    // Plafonnement à 1 avant normalisation
    scores[type] = Math.min(score, 1)
  }

  return scores
}

// ── Normalisation softmax ──

/**
 * Applique une softmax avec température sur les scores bruts.
 * Température basse (0.5) → distribution plus tranchée.
 */
function softmax(scores: TypeScores, temperature = 0.5): TypeScores {
  const types = Object.keys(scores) as EntryType[]
  const logits = types.map(t => scores[t] / temperature)
  const maxLogit = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - maxLogit))
  const sum = exps.reduce((a, b) => a + b, 0)

  const result = { ...scores }
  types.forEach((t, i) => { result[t] = exps[i] / sum })
  return result
}

// ── Apprentissage passif ──

/**
 * Construit la matrice de correction depuis un tableau de feedbacks.
 * Pour chaque correction (predicted → corrected), augmente le poids du type correct
 * et diminue légèrement le type prédit de façon erronée.
 */
function buildUserWeights(
  feedbacks: Array<{ predicted: EntryType; corrected: EntryType }>,
): UserWeights {
  const weights: UserWeights = {}
  const BOOST = 0.15
  const PENALTY = 0.05

  for (const { predicted, corrected } of feedbacks) {
    if (predicted === corrected) continue

    if (!weights[predicted]) weights[predicted] = {}
    // Boost du type correct quand on s'est trompé vers `predicted`
    weights[predicted][corrected] = (weights[predicted][corrected] ?? 0) + BOOST
    // Pénalité légère du type incorrect
    weights[predicted][predicted] = (weights[predicted][predicted] ?? 0) - PENALTY
  }

  return weights
}

/**
 * Applique les poids utilisateur sur les scores normalisés.
 * Si un type ressort fort (> 0.3), on applique ses corrections apprises.
 */
function applyUserWeights(scores: TypeScores, weights: UserWeights): TypeScores {
  const adjusted = { ...scores }
  const types = Object.keys(scores) as EntryType[]

  for (const type of types) {
    if (scores[type] > 0.3 && weights[type]) {
      for (const [targetType, delta] of Object.entries(weights[type]) as Array<[EntryType, number]>) {
        adjusted[targetType] = Math.max(0, Math.min(1, adjusted[targetType] + delta * scores[type]))
      }
    }
  }

  // Renormaliser après ajustement
  const sum = types.reduce((a, t) => a + adjusted[t], 0)
  if (sum > 0) types.forEach(t => { adjusted[t] /= sum })

  return adjusted
}

// ── Cache des poids utilisateur ──

const weightsCache = new Map<string, { weights: UserWeights; cachedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Charge et met en cache les corrections NlpFeedback d'un utilisateur.
 * Limite aux 200 derniers feedbacks pour garder les corrections récentes pertinentes.
 */
export async function loadUserWeights(userId: string): Promise<UserWeights> {
  const cached = weightsCache.get(userId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.weights

  const feedbacks = await prisma.nlpFeedback.findMany({
    where: { userId },
    select: { predicted: true, corrected: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const weights = buildUserWeights(feedbacks)
  weightsCache.set(userId, { weights, cachedAt: Date.now() })
  return weights
}

/** Invalide le cache pour un utilisateur (à appeler après un nouveau feedback). */
export function invalidateUserWeightsCache(userId: string): void {
  weightsCache.delete(userId)
}

// ── API principale ──

const FALLBACK_THRESHOLD = 0.4

/**
 * Classifie une saisie de capture en distribuant des probabilités sur les 7 types.
 *
 * Pipeline :
 * 1. Score par mots-clés pondérés (base model)
 * 2. Softmax → distribution normalisée
 * 3. Correction par poids utilisateur (apprentissage passif)
 * 4. Fallback NOTE si aucun type ne dépasse le seuil
 *
 * @param input  - Texte brut (raccourcis inline déjà parsés ou non)
 * @param userId - Si fourni, applique les corrections apprises de cet utilisateur
 */
export async function classifyEntry(input: string, userId?: string): Promise<TypeScores> {
  const base = computeBaseScores(input)
  let scores = softmax(base)

  if (userId) {
    const userWeights = await loadUserWeights(userId)
    scores = applyUserWeights(scores, userWeights)
  }

  // Fallback : si aucun type n'est assez confiant, booster NOTE
  const maxScore = Math.max(...(Object.values(scores) as number[]))
  if (maxScore < FALLBACK_THRESHOLD) {
    scores.NOTE += 0.3
    // Renormaliser
    const sum = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0)
    const types = Object.keys(scores) as EntryType[];
    types.forEach(t => { scores[t] /= sum })
  }

  return scores
}

// ── Helpers de lecture ──

/**
 * Retourne le type avec le score le plus élevé.
 */
export function getTopType(scores: TypeScores): EntryType {
  return (Object.entries(scores) as Array<[EntryType, number]>)
    .reduce((best, [type, score]) => score > best[1] ? [type, score] : best, ['NOTE', 0] as [EntryType, number])[0]
}

/**
 * Retourne le deuxième type en termes de score (affiché en badge secondaire dans le sheet).
 */
export function getSecondType(scores: TypeScores): EntryType {
  const sorted = (Object.entries(scores) as Array<[EntryType, number]>)
    .sort(([, a], [, b]) => b - a)
  return sorted[1]?.[0] ?? 'NOTE'
}
