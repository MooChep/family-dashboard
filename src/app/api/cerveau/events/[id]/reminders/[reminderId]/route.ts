import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── DELETE /api/cerveau/events/[id]/reminders/[reminderId] ──

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; reminderId: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { reminderId } = params

  try {
    await prisma.eventReminder.delete({ where: { id: reminderId } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/cerveau/events/[id]/reminders/[reminderId]]', err)
    return NextResponse.json({ error: 'Rappel introuvable ou erreur serveur' }, { status: 404 })
  }
}
