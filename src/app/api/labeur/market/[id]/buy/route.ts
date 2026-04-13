import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { sumInflation, applyInflationCap, applyInflationToPrice, isCursed } from '@/lib/labeur/inflation'
import { debitEcu } from '@/lib/labeur/ecu'
import type { ApiResponse } from '@/lib/labeur/types'

type Params = { params: Promise<{ id: string }> }

// ─── POST /api/labeur/market/[id]/buy ─────────────────────────────────────────
// Achat d'un article du Marché.
//
// Articles INDIVIDUAL :
//   - Prix gonflé débité immédiatement sur le solde du membre
//   - Stock décrémenté, article désactivé si stock atteint 0
//
// Articles COLLECTIVE :
//   - Chaque membre contribue exactement la moitié du prix gonflé (ceil)
//   - Première contribution → enregistrée, item en attente
//   - Deuxième contribution → toutes les contributions passent isComplete=true,
//     stock décrémenté
//   - Un membre ne peut pas contribuer deux fois au même achat en cours
export async function POST(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params
  const userId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Récupérer l'article avec les contributions en cours ────────────────
      const item = await tx.labeurMarketItem.findUnique({
        where: { id },
        include: {
          purchases: {
            where: { isComplete: false },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      })

      if (!item) throw new Error('NOT_FOUND')
      if (!item.isActive) throw new Error('INACTIVE')

      // ── 2. Vérifier le stock (avant toute contribution) ──────────────────────
      if (item.stock !== null && item.stock <= 0) throw new Error('OUT_OF_STOCK')

      // ── 3. Calculer l'inflation et le prix gonflé ─────────────────────────────
      const settings = await getLabeurSettings(tx)
      const inflationStates = await tx.labeurInflationState.findMany()
      const globalInflation = applyInflationCap(
        sumInflation(inflationStates),
        settings.inflationCap
      )
      const inflatedPrice = applyInflationToPrice(item.ecuPrice, globalInflation)

      // ── 4. Vérifier la malédiction ────────────────────────────────────────────
      if (item.isSealable && isCursed(globalInflation, settings.curseSeuil)) {
        throw new Error('SEALED')
      }

      // ── 5. Logique d'achat selon le type ──────────────────────────────────────
      if (item.type === 'INDIVIDUAL') {
        // ── Achat individuel ────────────────────────────────────────────────────
        await debitEcu(tx, userId, inflatedPrice)

        const purchase = await tx.labeurPurchase.create({
          data: {
            itemId:     item.id,
            userId,
            type:       'INDIVIDUAL',
            ecuSpent:   inflatedPrice,
            isComplete: true,
          },
        })

        // Décrémenter le stock si limité
        if (item.stock !== null) {
          const newStock = item.stock - 1
          await tx.labeurMarketItem.update({
            where: { id },
            data: {
              stock:    newStock,
              // Désactiver si le stock est épuisé
              isActive: newStock > 0,
            },
          })
        }

        return { type: 'INDIVIDUAL' as const, purchase, ecuSpent: inflatedPrice }

      } else {
        // ── Achat collectif ─────────────────────────────────────────────────────

        // Vérifier que ce membre n'a pas déjà contribué à l'achat en cours
        const existingContrib = item.purchases.find((p) => p.userId === userId)
        if (existingContrib) throw new Error('ALREADY_CONTRIBUTED')

        // Chaque membre paye exactement la moitié arrondie au supérieur
        const memberShare = Math.ceil(inflatedPrice / 2)
        await debitEcu(tx, userId, memberShare)

        await tx.labeurPurchase.create({
          data: {
            itemId:     item.id,
            userId,
            type:       'COLLECTIVE_CONTRIBUTION',
            ecuSpent:   memberShare,
            isComplete: false,
          },
        })

        // Vérifier si l'autre membre avait déjà contribué → finaliser l'achat
        const otherContrib = item.purchases.find((p) => p.userId !== userId)

        if (otherContrib) {
          // Les deux membres ont contribué : marquer toutes les contributions comme complètes
          await tx.labeurPurchase.updateMany({
            where: { itemId: item.id, isComplete: false },
            data:  { isComplete: true },
          })

          // Décrémenter le stock
          if (item.stock !== null) {
            const newStock = item.stock - 1
            await tx.labeurMarketItem.update({
              where: { id },
              data: {
                stock:    newStock,
                isActive: newStock > 0,
              },
            })
          }

          return { type: 'COLLECTIVE_COMPLETE' as const, ecuSpent: memberShare }
        }

        // Premier contributeur : en attente de l'autre membre
        return { type: 'COLLECTIVE_PENDING' as const, ecuSpent: memberShare }
      }
    })

    return Response.json({ success: true, data: result } satisfies ApiResponse<typeof result>)
  } catch (e) {
    if (e instanceof Error) {
      const errorMap: Record<string, [string, number]> = {
        NOT_FOUND:           ['Article introuvable', 404],
        INACTIVE:            ["Cet article n'est plus disponible", 410],
        OUT_OF_STOCK:        ['Stock épuisé', 409],
        SEALED:              ['Cet article est scellé par la malédiction — réalise tes tâches en retard !', 403],
        ALREADY_CONTRIBUTED: ['Tu as déjà contribué à cet achat, en attente de l\'autre membre', 409],
      }
      const mapped = errorMap[e.message]
      if (mapped) {
        return Response.json(
          { success: false, error: mapped[0] } satisfies ApiResponse<never>,
          { status: mapped[1] }
        )
      }
      // Solde insuffisant (lancé par debitEcu)
      if (e.message.startsWith('Solde insuffisant')) {
        return Response.json(
          { success: false, error: e.message } satisfies ApiResponse<never>,
          { status: 402 }
        )
      }
    }
    console.error('[POST /api/labeur/market/[id]/buy]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
