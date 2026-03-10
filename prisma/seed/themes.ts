import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed des thèmes système.
 * `light` est le seul thème système (fallback universel), isDefault = true.
 * Les thèmes custom sont créés par les utilisateurs via l'UI.
 */
async function main(): Promise<void> {
  console.log('🚀 Seeding system theme...')

  // ── Thème Light — fallback système ───────────────────────────────────────────
  const lightVars: Record<string, string> = {
    '--bg':           '#f5f3ef',
    '--surface':      '#ffffff',
    '--surface2':     '#faf8f5',
    '--border':       '#e4dfd6',
    '--border2':      '#d4cec4',
    '--accent':       '#2d4a3e',
    '--accent-dim':   '#2d4a3e18',
    '--text':         '#1a1a18',
    '--text2':        '#3d3d38',
    '--muted':        '#8c8880',
    '--muted2':       '#b0aba3',
    '--success':      '#3a7d5c',
    '--warning':      '#c9a84c',
    '--danger':       '#c9623f',
    '--font-display': "'Playfair Display', serif",
    '--font-body':    "'DM Sans', sans-serif",
    '--font-mono':    "'DM Mono', monospace",
  }

  await prisma.theme.upsert({
    where: { name: 'light' },
    update: {
      label: 'Clair',
      isDefault: true,
      cssVars: JSON.stringify(lightVars),
      createdBy: null, // thème système
    },
    create: {
      name: 'light',
      label: 'Clair',
      isDefault: true,
      cssVars: JSON.stringify(lightVars),
      createdBy: null,
    },
  })

  console.log('✅ Thème système "light" seeded avec succès')
  console.log('ℹ️  Le thème "dark" n\'est plus un thème système — les users peuvent créer leurs thèmes sombres custom.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })