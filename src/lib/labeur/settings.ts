import type { PrismaClient, LabeurSettings } from '@prisma/client'

// Type compatible avec un client Prisma complet ou un client de transaction
type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Récupère les réglages globaux du module Labeur.
 * Si le singleton n'existe pas encore en base, il est créé avec les valeurs
 * par défaut définies dans le schéma Prisma.
 */
export async function getLabeurSettings(tx: PrismaTx): Promise<LabeurSettings> {
  const settings = await tx.labeurSettings.findFirst()
  if (settings) return settings

  // Création du singleton lors du premier accès
  return tx.labeurSettings.create({ data: {} })
}
