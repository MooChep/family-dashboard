import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'
import type { ApiResponse } from '@/lib/cerveau/types'

webpush.setVapidDetails(
  'mailto:admin@family-dashboard.local',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// POST /api/cerveau/push/test — envoie une notification de test à l'appareil courant
export async function POST(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const sub = await prisma.pushSubscription.findFirst({
    where: { userId: session.user.id },
  })

  if (!sub) {
    return Response.json(
      { success: false, error: 'Aucune subscription — active les notifications d\'abord' } satisfies ApiResponse<never>,
      { status: 404 },
    )
  }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: '✅ Notifications opérationnelles',
        body: 'Family Dashboard peut t\'envoyer des rappels.',
        url: '/cerveau/preferences',
      }),
    )
    return Response.json({ success: true, data: null } satisfies ApiResponse<null>)
  } catch (err) {
    console.error('[push/test]', err)
    return Response.json({ success: false, error: 'Envoi échoué' } satisfies ApiResponse<never>, { status: 500 })
  }
}
