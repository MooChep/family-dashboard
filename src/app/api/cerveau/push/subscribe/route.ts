import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/cerveau/types'

interface PushSubscriptionBody {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// GET /api/cerveau/push/subscribe — vérifie si une subscription existe en DB
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }
  const sub = await prisma.pushSubscription.findFirst({ where: { userId: session.user.id } })
  return Response.json({ success: true, data: { subscribed: !!sub } } satisfies ApiResponse<{ subscribed: boolean }>)
}

// POST /api/cerveau/push/subscribe — enregistre une push subscription
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: PushSubscriptionBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json(
      { success: false, error: 'endpoint et keys (p256dh, auth) sont requis' } satisfies ApiResponse<never>,
      { status: 400 },
    )
  }

  try {
    // Upsert par userId + endpoint (premier 255 chars)
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId: session.user.id },
    })

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          lastActiveAt: new Date(),
        },
      })
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: session.user.id,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          lastActiveAt: new Date(),
        },
      })
    }

    return Response.json({ success: true, data: null } satisfies ApiResponse<null>)
  } catch (error) {
    console.error('[cerveau/push/subscribe]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
