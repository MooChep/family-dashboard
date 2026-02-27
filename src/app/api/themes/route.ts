import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/themes
// Retourne la liste des thèmes disponibles depuis la BDD
// Route publique — pas besoin d'authentification pour charger les thèmes
export async function GET(): Promise<NextResponse> {
  const themes = await prisma.theme.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(themes)
}