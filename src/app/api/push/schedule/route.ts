import { runNotificationScheduler } from '@/lib/notificationScheduler'

// GET /api/cerveau/push/schedule — déclenchable par un cron externe (curl, crontab)
// Pas de session requise intentionnellement — protéger via token d'env si besoin
export async function GET(): Promise<Response> {
  try {
    const result = await runNotificationScheduler()
    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error('[push/schedule]', error)
    return Response.json({ success: false, error: 'Erreur scheduler' }, { status: 500 })
  }
}
