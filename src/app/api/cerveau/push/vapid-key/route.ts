import { NextResponse } from 'next/server'

// GET /api/cerveau/push/vapid-key — retourne la clé VAPID publique
export async function GET(): Promise<NextResponse> {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ success: false, error: 'VAPID non configuré' }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: key })
}
