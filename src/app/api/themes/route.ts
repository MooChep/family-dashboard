import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<NextResponse> {
  const themes = await prisma.theme.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(themes)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json() as {
    label: string
    base: 'dark' | 'light'
    accent: string   // hex
  }
  if (!body.label?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!body.accent?.match(/^#[0-9a-fA-F]{6}$/)) return NextResponse.json({ error: 'Couleur invalide' }, { status: 400 })

  // Génère un name unique slug
  const name = body.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()

  // Calcule les variables CSS depuis l'accent et la base
  const cssVars = computeCssVars(body.accent, body.base)

  try {
    const theme = await prisma.theme.create({
      data: {
        name,
        label: body.label.trim(),
        isDefault: false,
        cssVars: JSON.stringify(cssVars),
        createdBy: session.user.id,
      },
    })
    return NextResponse.json(theme, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Nom déjà pris' }, { status: 409 })
  }
}

// ── Calcul des variables CSS ──────────────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360, sNorm = s / 100, lNorm = l / 100
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  let r, g, b
  if (sNorm === 0) { r = g = b = lNorm }
  else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
    const p = 2 * lNorm - q
    r = hue2rgb(p, q, hNorm + 1/3)
    g = hue2rgb(p, q, hNorm)
    b = hue2rgb(p, q, hNorm - 1/3)
  }
  return '#' + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function computeCssVars(accent: string, base: 'dark' | 'light'): Record<string, string> {
  const [h, s] = hexToHsl(accent)

  if (base === 'dark') {
    return {
      '--bg':          hslToHex(h, Math.max(s - 40, 5), 5),
      '--surface':     hslToHex(h, Math.max(s - 35, 6), 8),
      '--surface2':    hslToHex(h, Math.max(s - 30, 8), 12),
      '--border':      hslToHex(h, Math.max(s - 20, 10), 15),
      '--border2':     hslToHex(h, Math.max(s - 15, 12), 20),
      '--accent':      accent,
      '--accent-dim':  accent + '22',
      '--text':        hslToHex(h, 10, 92),
      '--text2':       hslToHex(h, 8, 78),
      '--muted':       hslToHex(h, 10, 40),
      '--muted2':      hslToHex(h, 8, 55),
      '--success':     '#43e8b0',
      '--warning':     '#f9c74f',
      '--danger':      '#f87171',
      '--font-display': "'Syne', sans-serif",
      '--font-body':    "'Syne', sans-serif",
      '--font-mono':    "'DM Mono', monospace",
    }
  } else {
    return {
      '--bg':          hslToHex(h, Math.max(s - 50, 8), 95),
      '--surface':     '#ffffff',
      '--surface2':    hslToHex(h, Math.max(s - 50, 5), 97),
      '--border':      hslToHex(h, Math.max(s - 40, 8), 86),
      '--border2':     hslToHex(h, Math.max(s - 35, 10), 80),
      '--accent':      accent,
      '--accent-dim':  accent + '18',
      '--text':        hslToHex(h, 15, 10),
      '--text2':       hslToHex(h, 10, 25),
      '--muted':       hslToHex(h, 8, 52),
      '--muted2':      hslToHex(h, 5, 68),
      '--success':     '#3a7d5c',
      '--warning':     '#c9a84c',
      '--danger':      '#c9623f',
      '--font-display': "'Playfair Display', serif",
      '--font-body':    "'DM Sans', sans-serif",
      '--font-mono':    "'DM Mono', monospace",
    }
  }
}