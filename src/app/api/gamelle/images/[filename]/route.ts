import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.GAMELLE_UPLOAD_DIR ?? '/uploads/gamelle'

/**
 * GET /api/gamelle/images/[filename]
 * Sert les images recettes stockées localement (WebP compressé via sharp).
 * En production avec Nginx, cette route n'est pas atteinte — Nginx sert
 * directement le volume monté. Elle sert de fallback pour les envs sans Nginx.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } },
): Promise<Response> {
  // Sanitize — empêche les path traversal
  const filename = path.basename(params.filename)
  const filePath = path.join(UPLOAD_DIR, filename)

  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  const ext    = path.extname(filename).toLowerCase()
  const mime   = ext === '.webp' ? 'image/webp'
               : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
               : ext === '.png' ? 'image/png'
               : 'application/octet-stream'

  return new Response(buffer, {
    headers: {
      'Content-Type':  mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
