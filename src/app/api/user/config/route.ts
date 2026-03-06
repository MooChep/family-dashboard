import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parsePreferences(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>)
  } catch {
    return {}
  }
}

// GET /api/user/config
// Retourne la UserConfig de l'utilisateur connecté
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    )
  }

  const config = await prisma.userConfig.findUnique({
    where: { userId: session.user.id },
    include: { theme: true },
  })

  if (!config) {
    return NextResponse.json(
      { error: 'Configuration introuvable' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    theme: config.themeId,
    preferences: parsePreferences(config.preferences),
  })
}

// PATCH /api/user/config
// Met à jour theme ou preferences (merge partiel)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    )
  }

  let body: { theme?: string; preferences?: Record<string, unknown> }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Corps de requête invalide' },
      { status: 400 }
    )
  }

  // Vérifie que le thème existe en BDD avant de l'appliquer
  if (body.theme) {
    const themeExists = await prisma.theme.findUnique({
      where: { name: body.theme },
    })

    if (!themeExists) {
      return NextResponse.json(
        { error: `Thème "${body.theme}" introuvable` },
        { status: 400 }
      )
    }
  }

  // Récupère la config existante pour le merge des préférences
  const existingConfig = await prisma.userConfig.findUnique({
    where: { userId: session.user.id },
  })

  // Merge des préférences : on fusionne l'existant avec le nouveau
  // sans écraser les clés non mentionnées dans la requête
  const mergedPreferences = {
    ...parsePreferences(existingConfig?.preferences),
    ...(body.preferences ?? {}),
  }

  const updatedConfig = await prisma.userConfig.upsert({
    where: { userId: session.user.id },
    update: {
      ...(body.theme && { themeId: body.theme }),
      preferences: JSON.stringify(mergedPreferences),
    },
    create: {
      userId: session.user.id,
      themeId: body.theme ?? 'dark',
      preferences: JSON.stringify(mergedPreferences),
    },
    include: { theme: true },
  })

  return NextResponse.json({
    theme: updatedConfig.themeId,
    preferences: parsePreferences(updatedConfig.preferences),
  })
}