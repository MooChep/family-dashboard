import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PATCH /api/user/profile
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json() as {
    name?: string
    email?: string
    currentPassword?: string
    newPassword?: string
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  // Si changement de mot de passe → vérifier l'ancien
  if (body.newPassword) {
    if (!body.currentPassword) return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 })
    const valid = await bcrypt.compare(body.currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    if (body.newPassword.length < 8) return NextResponse.json({ error: 'Minimum 8 caractères' }, { status: 400 })
  }

  // Si changement d'email → vérifier unicité
  if (body.email && body.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: body.email } })
    if (exists) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.email ? { email: body.email.trim() } : {}),
      ...(body.newPassword ? { password: await bcrypt.hash(body.newPassword, 10) } : {}),
    },
    select: { id: true, name: true, email: true },
  })

  return NextResponse.json(updated)
}

// GET /api/user/profile
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  })
  return NextResponse.json(user)
}