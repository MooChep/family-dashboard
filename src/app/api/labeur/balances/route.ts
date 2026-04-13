import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHonorTitle, getNextTitleThreshold, getTitleProgressPercent } from '@/lib/labeur/titles'
import type { ApiResponse, EcuBalanceWithTitle } from '@/lib/labeur/types'

// ─── GET /api/labeur/balances ─────────────────────────────────────────────────
// Retourne les soldes d'écu des deux membres du foyer avec leurs titres calculés.
// Les soldes sont visibles par tous (transparence totale — §3.5).
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  try {
    // Récupérer tous les utilisateurs du foyer
    const users = await prisma.user.findMany({
      select: { id: true, name: true, gender: true },
      orderBy: { name: 'asc' },
    })

    // Pour chaque membre, récupérer ou créer son solde
    const balances: EcuBalanceWithTitle[] = await Promise.all(
      users.map(async (user) => {
        // Upsert : crée le solde à zéro s'il n'existe pas encore
        const balance = await prisma.ecuBalance.upsert({
          where: { userId: user.id },
          create: { userId: user.id, balance: 0, totalEcuEarned: 0 },
          update: {},
        })

        return {
          ...balance,
          user,
          honorTitle:         getHonorTitle(balance.totalEcuEarned, user.gender),
          nextTitleThreshold: getNextTitleThreshold(balance.totalEcuEarned),
          progressPercent:    getTitleProgressPercent(balance.totalEcuEarned),
        }
      })
    )

    return Response.json({ success: true, data: balances } satisfies ApiResponse<typeof balances>)
  } catch (e) {
    console.error('[GET /api/labeur/balances]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
