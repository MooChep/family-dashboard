import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/epargne/tags — liste tous les tags uniques avec leur nb d'utilisations
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const transactions = await prisma.transaction.findMany({ select: { tags: true } })

  const tagCount: Record<string, number> = {}
  for (const tx of transactions) {
    let parsed: string[] = []
    try { parsed = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : [] } catch { parsed = [] }
    for (const tag of parsed) {
      if (tag) tagCount[tag] = (tagCount[tag] ?? 0) + 1
    }
  }

  const tags = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(tags)
}

// PATCH /api/epargne/tags — renommer un tag sur toutes les transactions
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { oldTag: string; newTag: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  if (!body.oldTag || !body.newTag) {
    return NextResponse.json({ error: 'oldTag et newTag requis' }, { status: 400 })
  }

  const oldTag = body.oldTag.trim()
  const newTag = body.newTag.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

  if (!newTag) return NextResponse.json({ error: 'newTag invalide' }, { status: 400 })

  // Récupère toutes les transactions qui ont ce tag
  const transactions = await prisma.transaction.findMany({ select: { id: true, tags: true } })

  let updated = 0
  for (const tx of transactions) {
    let parsed: string[] = []
    try { parsed = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : [] } catch { continue }

    if (!parsed.includes(oldTag)) continue

    const newTags = [...new Set(parsed.map((t) => (t === oldTag ? newTag : t)))]
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { tags: JSON.stringify(newTags) },
    })
    updated++
  }

  return NextResponse.json({ updated, oldTag, newTag })
}

// DELETE /api/epargne/tags — supprimer un tag de toutes les transactions
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { tag: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  if (!body.tag) return NextResponse.json({ error: 'tag requis' }, { status: 400 })

  const transactions = await prisma.transaction.findMany({ select: { id: true, tags: true } })

  let updated = 0
  for (const tx of transactions) {
    let parsed: string[] = []
    try { parsed = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : [] } catch { continue }

    if (!parsed.includes(body.tag)) continue

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { tags: JSON.stringify(parsed.filter((t) => t !== body.tag)) },
    })
    updated++
  }

  return NextResponse.json({ updated, tag: body.tag })
}