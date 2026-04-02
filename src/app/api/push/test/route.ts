import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'
import type { ApiResponse } from '@/lib/parchemin/types'

// POST /api/cerveau/push/test — envoie une notification de test à l'appareil courant
export async function POST(): Promise<Response> {
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr'

  if (!vapidPublic || !vapidPrivate) {
    return Response.json(
      { success: false, error: 'VAPID non configuré sur le serveur' } satisfies ApiResponse<never>,
      { status: 500 },
    )
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

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
        url: '/parchemin',
      }),
    )
    return Response.json({ success: true, data: null } satisfies ApiResponse<null>)
  } catch (err) {
    console.error('[push/test]', err)
    return Response.json({ success: false, error: 'Envoi échoué' } satisfies ApiResponse<never>, { status: 500 })
  }
}
