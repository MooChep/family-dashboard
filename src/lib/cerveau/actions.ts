'use server'

import { classifyEntry, getTopType, getSecondType } from './nlp'

// ── Server actions exposées aux composants client ──

/**
 * Classifie une saisie de capture côté serveur.
 * Retourne le type le plus probable et le second type (badge secondaire dans le sheet).
 */
export async function classifyEntryAction(
  input:   string,
  userId?: string,
): Promise<{ topType: import('@prisma/client').EntryType; secondType: import('@prisma/client').EntryType }> {
  const scores = await classifyEntry(input, userId)
  return { topType: getTopType(scores), secondType: getSecondType(scores) }
}
