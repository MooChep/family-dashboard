import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── DELETE /api/themes/[name] ─────────────────────────────────────────────────
/**
 * Supprime un thème custom.
 * Règles :
 *  - Authentification requise
 *  - Impossible de supprimer un thème système (isDefault = true ou createdBy = null)
 *  - Seul le créateur peut supprimer son thème
 *  - Si des UserConfig référencent ce thème → bascule sur 'light' (fallback)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { name: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { name } = params

  // Récupère le thème à supprimer
  const theme = await prisma.theme.findUnique({ where: { name } })
  if (!theme) {
    return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 })
  }

  // Interdit la suppression des thèmes système
  if (theme.isDefault || theme.createdBy === null) {
    return NextResponse.json({ error: 'Impossible de supprimer un thème système' }, { status: 403 })
  }

  // Seul le créateur peut supprimer (ou admin futur)
  if (theme.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // ── Transaction : reset des configs qui utilisent ce thème + suppression ──
  await prisma.$transaction([
    // Bascule tous les utilisateurs qui ont ce thème vers le fallback 'light'
    prisma.userConfig.updateMany({
      where: { themeId: name },
      data: { themeId: 'light' },
    }),
    // Suppression du thème
    prisma.theme.delete({ where: { name } }),
  ])

  return NextResponse.json({ success: true })
}