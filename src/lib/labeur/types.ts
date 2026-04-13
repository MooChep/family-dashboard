import type {
  LabeurTask,
  LabeurRecurrence,
  LabeurCompletion,
  LabeurInflationState,
  LabeurMarketItem,
  LabeurPurchase,
  EcuBalance,
  LabeurSettings,
  User,
  Gender,
  LabeurTaskType,
  LabeurTaskStatus,
  LabeurTaskFrequency,
  LabeurMarketItemType,
  LabeurPurchaseType,
  LabeurMarketResetFrequency,
} from '@prisma/client'

// ─── Re-exports des enums Prisma ──────────────────────────────────────────────
export type {
  Gender,
  LabeurTaskType,
  LabeurTaskStatus,
  LabeurTaskFrequency,
  LabeurMarketItemType,
  LabeurPurchaseType,
  LabeurMarketResetFrequency,
}

// ─── Réponse API générique ─────────────────────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

// ─── Tâche enrichie avec ses relations ────────────────────────────────────────
export type LabeurTaskWithRelations = LabeurTask & {
  recurrence: LabeurRecurrence | null
  completions: LabeurCompletion[]
  inflationStates: LabeurInflationState[]
  createdBy: Pick<User, 'id' | 'name'>
}

// ─── Tâche en retard avec calcul d'inflation ──────────────────────────────────
export type LabeurOverdueTask = LabeurTaskWithRelations & {
  daysOverdue: number
  currentInflationPercent: number
}

// ─── Entrée résumée pour l'affichage inflation ────────────────────────────────
export type InflationTaskEntry = {
  id: string
  title: string
  daysOverdue: number
  inflationPercent: number
}

// ─── État global d'inflation du Marché ────────────────────────────────────────
export type InflationSummary = {
  globalPercent: number       // somme plafonnée (≤ inflationCap)
  isAboveCurse: boolean       // true = malédiction active (≥ curseSeuil)
  isAboveAlert: boolean       // true = alerte push déclenchée (≥ inflationAlertThreshold)
  tasks: InflationTaskEntry[] // tâches responsables, triées par contribution desc
}

// ─── Solde écu avec titre et progression ──────────────────────────────────────
export type EcuBalanceWithTitle = EcuBalance & {
  user: Pick<User, 'id' | 'name' | 'gender'>
  honorTitle: string          // titre calculé depuis totalEcuEarned + gender
  nextTitleThreshold: number | null  // écu cumulés requis pour le palier suivant
  progressPercent: number     // progression vers le prochain palier (0–100)
}

// ─── Article du Marché avec achats en cours ───────────────────────────────────
export type LabeurMarketItemWithPurchases = LabeurMarketItem & {
  purchases: (LabeurPurchase & { user: Pick<User, 'id' | 'name'> })[]
  displayPrice: number        // prix gonflé avec inflation courante
  isSealed: boolean           // article scellé par malédiction active
  collectiveFunded: number    // total déjà financé (pour les articles COLLECTIVE)
}

// ─── Données du tableau de bord ───────────────────────────────────────────────
export type DashboardData = {
  inflation: InflationSummary
  tasksDueToday: LabeurTaskWithRelations[]
  balances: EcuBalanceWithTitle[]
  recentCompletions: (LabeurCompletion & {
    task: Pick<LabeurTask, 'id' | 'title'>
    user: Pick<User, 'id' | 'name'>
  })[]
  marketPreview: LabeurMarketItemWithPurchases[]
}

// ─── Payloads de création / mise à jour ──────────────────────────────────────

export type CreateTaskPayload = {
  title: string
  description?: string
  type: LabeurTaskType
  isShared?: boolean
  ecuValue: number
  inflationContribRate?: number
  dueDate?: string            // ISO string — ONESHOT uniquement
  // présent si type = RECURRING
  recurrence?: {
    frequency: LabeurTaskFrequency
    intervalDays?: number     // requis si frequency = CUSTOM
    nextDueAt: string         // ISO string UTC
  }
}

export type UpdateTaskPayload = Partial<
  Pick<LabeurTask, 'title' | 'description' | 'ecuValue' | 'isShared' | 'dueDate' | 'inflationContribRate'>
>

export type CreateMarketItemPayload = {
  title: string
  description?: string
  ecuPrice: number
  type: LabeurMarketItemType
  stock?: number
  resetFrequency?: LabeurMarketResetFrequency
  isSealable?: boolean
}

export type UpdateMarketItemPayload = Partial<CreateMarketItemPayload>

export type BuyPayload = {
  // Pour les articles COLLECTIVE, amount = montant que ce membre souhaite contribuer
  // Pour les articles INDIVIDUAL, ignoré (prix plein gonflé)
  amount?: number
}

// ─── Titre de seigneur ────────────────────────────────────────────────────────

// Palier de titre honorifique basé sur totalEcuEarned
export type HonorTierConfig = {
  minEcu: number
  maxEcu: number | null   // null = pas de plafond (dernier palier)
  titleMale: string
  titleFemale: string
}
