import type { PrismaClient, EcuBalance } from '@prisma/client'

// ─── Type transaction Prisma ───────────────────────────────────────────────────
// On accepte le client complet ou un client de transaction interactif
type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Helpers de gestion des soldes d'écu ──────────────────────────────────────

/**
 * Récupère l'EcuBalance d'un utilisateur, ou la crée à zéro si elle n'existe pas.
 * Utilise upsert pour être atomique et éviter les erreurs de contrainte unique
 * en cas de transactions concurrentes (ex: deux tâches complétées simultanément).
 */
export async function getOrCreateBalance(
  tx: PrismaTx,
  userId: string
): Promise<EcuBalance> {
  return tx.ecuBalance.upsert({
    where:  { userId },
    create: { userId, balance: 0, totalEcuEarned: 0 },
    update: {},
  })
}

/**
 * Crédite des écu sur le solde d'un utilisateur et incrémente totalEcuEarned.
 * totalEcuEarned ne diminue jamais — c'est la base de calcul des titres.
 *
 * @returns L'EcuBalance mise à jour
 */
export async function creditEcu(
  tx: PrismaTx,
  userId: string,
  amount: number
): Promise<EcuBalance> {
  await getOrCreateBalance(tx, userId)

  return tx.ecuBalance.update({
    where: { userId },
    data: {
      balance:        { increment: amount },
      totalEcuEarned: { increment: amount },
    },
  })
}

/**
 * Débite des écu du solde courant d'un utilisateur.
 * Lance une erreur si le solde est insuffisant.
 * totalEcuEarned n'est pas modifié (dépenser des écu ne fait pas régresser le titre).
 *
 * @returns L'EcuBalance mise à jour
 */
export async function debitEcu(
  tx: PrismaTx,
  userId: string,
  amount: number
): Promise<EcuBalance> {
  const balance = await getOrCreateBalance(tx, userId)

  if (balance.balance < amount) {
    throw new Error(
      `Solde insuffisant : ${balance.balance} écu disponibles, ${amount} écu requis.`
    )
  }

  return tx.ecuBalance.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  })
}
