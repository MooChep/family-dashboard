import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'

// PATCH /api/user/profile
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json() as {
    name?: string
    email?: string
    currentPassword?: string
    newPassword?: string
    themeId?: string // Ajout du thème
  }

  const user = await prisma.user.findUnique({ 
    where: { id: session.user.id },
    include: { config: true }
  })
  
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  // Validation Mot de passe
  let newHashedPassword = undefined;
  if (body.newPassword) {
    if (!body.currentPassword) return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 })
    const valid = await compare(body.currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    if (body.newPassword.length < 8) return NextResponse.json({ error: 'Minimum 8 caractères' }, { status: 400 })
    newHashedPassword = await hash(body.newPassword, 12)
  }

  // Validation Email
  if (body.email && body.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: body.email } })
    if (exists) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  // Update atomique
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.email ? { email: body.email.trim() } : {}),
      ...(newHashedPassword ? { password: newHashedPassword } : {}),
      // Mise à jour du thème dans la config liée
      ...(body.themeId ? {
        config: {
          upsert: { // Upsert au cas où la config n'existerait pas par erreur
            create: { themeId: body.themeId, preferences: "{}" },
            update: { themeId: body.themeId }
          }
        }
      } : {})
    },
    select: { 
      id: true, 
      name: true, 
      email: true,
      config: { select: { themeId: true } }
    },
  })

  return NextResponse.json(updated)
}

// GET /api/user/profile
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      id: true, 
      name: true, 
      email: true,
      config: {
        select: { themeId: true }
      }
    },
  })
  return NextResponse.json(user)
}