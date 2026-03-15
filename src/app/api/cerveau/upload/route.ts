import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'

// ── POST /api/cerveau/upload ──

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const uploadDir = process.env.UPLOAD_DIR
  if (!uploadDir) {
    return NextResponse.json({ error: 'UPLOAD_DIR non configuré' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Champ "file" requis' }, { status: 400 })
  }

  const ext = extname(file.name) || ''
  const uniqueName = `${crypto.randomUUID()}${ext}`
  const destPath = join(uploadDir, uniqueName)

  try {
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(destPath, buffer)
  } catch (err) {
    console.error('[POST /api/cerveau/upload]', err)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde du fichier' }, { status: 500 })
  }

  return NextResponse.json(
    {
      path:     uniqueName,
      name:     file.name,
      mimeType: file.type,
      size:     file.size,
    },
    { status: 201 },
  )
}
