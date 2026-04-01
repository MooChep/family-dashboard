import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const UPLOAD_DIR = process.env.GAMELLE_UPLOAD_DIR ?? '/uploads/gamelle'
const MAX_WIDTH = 800
const WEBP_QUALITY = 80

/**
 * Télécharge une image depuis une URL distante, la compresse en WebP
 * et la stocke dans GAMELLE_UPLOAD_DIR.
 *
 * @returns Chemin relatif du fichier stocké (ex: "abc123.webp"), utilisé
 *          comme valeur de `Recipe.imageLocal`.
 */
export async function downloadAndCompressImage(
  sourceUrl: string,
  filename: string,
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${sourceUrl}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const outputName = `${filename}.webp`
  const outputPath = path.join(UPLOAD_DIR, outputName)

  await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath)

  return outputName
}

/**
 * Reçoit un fichier uploadé (Buffer), le compresse en WebP
 * et le stocke dans GAMELLE_UPLOAD_DIR.
 *
 * @returns Chemin relatif du fichier stocké (ex: "abc123.webp").
 */
export async function compressAndStoreImage(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  const outputName = `${filename}.webp`
  const outputPath = path.join(UPLOAD_DIR, outputName)

  await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath)

  return outputName
}

/**
 * Supprime un fichier image du répertoire uploads.
 * Ne lance pas d'erreur si le fichier n'existe pas.
 */
export async function deleteImage(filename: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, filename)
  await fs.unlink(filePath).catch(() => undefined)
}

/**
 * Génère un nom de fichier unique basé sur un slug et un timestamp.
 *
 * @example generateImageFilename('poulet-roti') → "poulet-roti-1711234567890"
 */
export function generateImageFilename(slug: string): string {
  const clean = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
  return `${clean}-${Date.now()}`
}
