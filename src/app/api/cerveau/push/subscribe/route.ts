import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── POST /api/cerveau/push/subscribe ──

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = (await request.json()) as {
    endpoint:  string
    keys:      { p256dh: string; auth: string }
    userAgent?: string
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Données de souscription invalides' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') ?? body.userAgent ?? null

  // Upsert manuel — @@unique sur (userId, endpoint(length:255)) ne supporte
  // pas directement le upsert Prisma avec un champ @db.Text
  const existing = await prisma.pushSubscription.findFirst({
    where: { userId: session.user.id, endpoint: body.endpoint },
  })

  const sub = existing
    ? await prisma.pushSubscription.update({
        where: { id: existing.id },
        data:  { p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent },
      })
    : await prisma.pushSubscription.create({
        data: {
          userId:    session.user.id,
          endpoint:  body.endpoint,
          p256dh:    body.keys.p256dh,
          auth:      body.keys.auth,
          userAgent,
        },
      })

  return NextResponse.json(sub, { status: 201 })
}

// ── DELETE /api/cerveau/push/subscribe ──

export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = (await request.json()) as { endpoint: string }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'endpoint manquant' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint: body.endpoint },
  })

  return NextResponse.json({ ok: true })
}
